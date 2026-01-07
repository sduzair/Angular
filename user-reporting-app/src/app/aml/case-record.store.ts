import { HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  ErrorHandler,
  Injectable,
  InjectionToken,
  OnDestroy,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  map,
  merge,
  of,
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  filter,
  finalize,
  pairwise,
  scan,
  share,
  shareReplay,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { AuthService } from '../auth.service';
import * as ChangeLog from '../change-logging/change-log';
import {
  hasMissingAccountInfo,
  hasMissingConductorInfo,
} from '../reporting-ui/edit-form/common-validation';
import { EditFormValueType } from '../reporting-ui/edit-form/edit-form.component';
import {
  StrTransaction,
  WithETag,
  _hiddenValidationType,
} from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { DeepPartial } from '../test-helpers';
import { type RouteExtrasFromSearch } from '../transaction-search/transaction-search.component';
import {
  AccountNumber,
  TransactionSearchResponse,
} from '../transaction-search/transaction-search.service';
import {
  AddSelectionsReq,
  CaseRecordService,
  ResetSelectionsRequest,
  SaveChangesReq,
} from './case-record.service';

export const DEFAULT_CASE_RECORD_STATE: CaseRecordState = {
  searchResult: [],
  caseRecordId: '',
  amlId: '',
  searchParams: {
    accountNumbersSelection: [],
    partyKeysSelection: [],
    productTypesSelection: [],
    reviewPeriodSelection: [],
    sourceSystemsSelection: [],
  },
  createdAt: '',
  createdBy: '',
  status: '',
  etag: NaN,
  selections: [],
  lastUpdated: '',
};

export const CASE_RECORD_INITIAL_STATE = new InjectionToken<CaseRecordState>(
  'CASE_RECORD_INITIAL_STATE',
  {
    factory: () => DEFAULT_CASE_RECORD_STATE,
  },
);

@Injectable()
export class CaseRecordStore implements OnDestroy {
  private api = inject(CaseRecordService);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ErrorHandler);
  private readonly initialState = inject(CASE_RECORD_INITIAL_STATE);
  private auth = inject(AuthService);

  // --- STATE STREAMS ---
  private _state$ = new BehaviorSubject<CaseRecordState>(this.initialState);

  public state$ = this._state$.asObservable();

  private conflict$ = new Subject<void>();
  readonly latestCaseRecordVersion$ = this._state$.pipe(
    map((sessionState) => sessionState?.etag),
  );

  readonly lastUpdated$ = this._state$.pipe(
    map((caseRecordState) => caseRecordState.lastUpdated!),
    startWith(new Date(0).toISOString().split('T')[0]),
  );

  // --- SAVING STATUS ---
  private _activeSaveIds$ = new BehaviorSubject<string[]>([]);
  activeSaveIds$ = this._activeSaveIds$.asObservable();
  isSaving$ = this.activeSaveIds$.pipe(map((txns) => txns.length > 0));

  private completedSaveIds$ = this.activeSaveIds$.pipe(
    pairwise(),
    map(([prev, curr]) => {
      // IDs that were being saved but are now complete
      return prev.filter((id) => !curr.includes(id));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  whenCompleted(saveIds: string[]): Observable<string[]> {
    return this.completedSaveIds$.pipe(
      filter(
        (completed) =>
          completed.length > 0 && saveIds.every((id) => completed.includes(id)),
      ),
    );
  }

  private markSavesAsComplete(incomingSaves: string[]) {
    const remaining = [...this._activeSaveIds$.value];
    incomingSaves.forEach((id) => {
      const index = remaining.indexOf(id);
      if (index > -1) {
        remaining.splice(index, 1);
      }
    });
    this._activeSaveIds$.next(remaining);
  }

  constructor() {
    // Subscribe immediately to ensure str transaction data accumulates from first emission
    this.selectionsComputed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          console.assert(
            false,
            'Assert errors are handled gracefully in pipeline',
          );
        },
      });

    // Activate the highlight saves pipeline
    this.highlightEditsSave$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    // Start accepting pending changes for saving
    this.updateQueue$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        console.assert(
          false,
          'Assert errors are handled gracefully in pipeline',
        );
      },
    });
  }

  ngOnDestroy(): void {
    console.info('Service destroyed - cleaning up streams');

    // Complete all Subjects
    this._state$.complete();
    this.conflict$.complete();
    this._activeSaveIds$.complete();
    this._updateQueue$.complete();
    this.highlightEdits$.complete();
    this.resetHiglightsAccumulator$.complete();
  }

  // --- VIEW MODEL FOR REPORTING UI DATA ---
  readonly selectionsComputed$ = this._state$.pipe(
    map(
      ({
        selections: currentSelections,
        selectionsToChange = [],
        selectionsToAdd = [],
      }) => {
        if (selectionsToChange.length > 0)
          return computePartialChangesHandler(
            currentSelections,
            selectionsToChange,
          );

        if (selectionsToAdd.length > 0)
          return addSelectionsHandler(currentSelections, selectionsToAdd);

        return computeFullChangesHandler(currentSelections);
      },
    ),
    scan((acc, handler) => {
      try {
        return handler(acc);
      } catch (error) {
        this.errorHandler.handleError(error);
        return acc;
      }
    }, [] as StrTransactionWithChangeLogs[]),
    takeUntilDestroyed(this.destroyRef),
    shareReplay({ bufferSize: 1, refCount: false }), // stream never dies in aml component scope
  );

  // --- EDIT QUEUE ---
  private _updateQueue$ = new Subject<
    | {
        editType: 'SINGLE_EDIT';
        flowOfFundsAmlTransactionId: string;
        editFormValue: EditFormValueType;
      }
    | {
        editType: 'BULK_EDIT';
        editFormValue: EditFormValueType;
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
    | { editType: 'HIGHLIGHT'; highlightsMap: Map<string, string> }
    | {
        editType: 'MANUAL_UPLOAD';
        manualTransactions: StrTransactionWithChangeLogs[];
      }
    | {
        editType: 'RESET_TXNS';
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
  >();

  private updateQueue$ = this._updateQueue$.asObservable().pipe(
    map((edit) => {
      const existingSaveIds = this._activeSaveIds$.value;
      let incomingSaves: string[] = [];

      if (edit.editType === 'SINGLE_EDIT') {
        incomingSaves = [edit.flowOfFundsAmlTransactionId];
      }
      if (edit.editType === 'BULK_EDIT') {
        incomingSaves = edit.selectionIds;
      }
      if (edit.editType === 'HIGHLIGHT') {
        incomingSaves = Array.from(edit.highlightsMap.keys());
      }
      if (edit.editType === 'MANUAL_UPLOAD') {
        incomingSaves = edit.manualTransactions.map(
          (txn) => txn.flowOfFundsAmlTransactionId,
        );
      }
      if (edit.editType === 'RESET_TXNS') {
        incomingSaves = edit.selectionIds;
      }

      this._activeSaveIds$.next([...existingSaveIds, ...incomingSaves]);
      return { edit, incomingSaves };
    }),
    concatMap(({ edit, incomingSaves }) => {
      return of(edit).pipe(
        withLatestFrom(this.selectionsComputed$),
        map(([edit, selectionsComputed]) => {
          const { editType } = edit;
          const pendingChanges: SaveChangesReq['pendingChanges'] = [];
          const newTransactions: StrTransactionWithChangeLogs[] = [];
          const resetSelections: ResetSelectionsRequest['pendingResets'] = [];

          if (editType === 'SINGLE_EDIT') {
            const { editFormValue, flowOfFundsAmlTransactionId } = edit;
            const changeLogs = ChangeLog.generateChangeLogs(
              selectionsComputed.find(
                (txn) =>
                  txn.flowOfFundsAmlTransactionId ===
                  flowOfFundsAmlTransactionId,
              )!,
              editFormValue as StrTransactionWithChangeLogs,
            );
            pendingChanges.push({
              flowOfFundsAmlTransactionId,
              changeLogs: changeLogs,
              eTag:
                selectionsComputed
                  .find(
                    (txn) =>
                      txn.flowOfFundsAmlTransactionId ===
                      flowOfFundsAmlTransactionId,
                  )!
                  .changeLogs.at(-1)?.eTag ?? 0,
            });
          }

          if (editType === 'BULK_EDIT') {
            const { selectionIds: selections, editFormValue } = edit;
            selections.forEach((selection) => {
              const transactionBefore = selectionsComputed.find(
                (txn) => txn.flowOfFundsAmlTransactionId === selection,
              )!;

              const changeLogs = ChangeLog.generateChangeLogs(
                transactionBefore,
                editFormValue as StrTransactionWithChangeLogs,
                { isBulkEdit: true },
              );

              pendingChanges.push({
                flowOfFundsAmlTransactionId:
                  transactionBefore.flowOfFundsAmlTransactionId,
                changeLogs: changeLogs,
                eTag: transactionBefore.changeLogs.at(-1)?.eTag ?? 0,
              });
            });
          }

          if (editType === 'HIGHLIGHT') {
            const { highlightsMap } = edit;

            for (const [txnId, newColor] of highlightsMap.entries()) {
              const transactionBefore = selectionsComputed.find(
                (txn) => txn.flowOfFundsAmlTransactionId === txnId,
              );

              if (!transactionBefore) continue;

              const pendingChangeLogs = ChangeLog.generateChangeLogs(
                {
                  highlightColor: transactionBefore.highlightColor,
                } satisfies DeepPartial<StrTransactionWithChangeLogs>,
                {
                  highlightColor: newColor,
                } satisfies DeepPartial<StrTransactionWithChangeLogs>,
              );

              if (pendingChangeLogs.length === 0) {
                const isSameHighlightColor =
                  transactionBefore.highlightColor === newColor;
                console.assert(isSameHighlightColor);
                continue;
              }

              console.assert(pendingChangeLogs.length === 1);

              pendingChanges.push({
                flowOfFundsAmlTransactionId: txnId,
                changeLogs: pendingChangeLogs,
                eTag: transactionBefore.changeLogs.at(-1)?.eTag ?? 0,
              });
            }
          }

          if (editType === 'MANUAL_UPLOAD') {
            const { manualTransactions } = edit;
            newTransactions.push(...manualTransactions);
          }

          if (editType === 'RESET_TXNS') {
            const { selectionIds: tableSelections } = edit;
            const tableSelectionsSet = new Set(tableSelections);

            const selectionsWithChanges = selectionsComputed
              .filter((selection) => {
                return (
                  tableSelectionsSet.has(
                    selection.flowOfFundsAmlTransactionId,
                  ) && selection.changeLogs.length > 0
                );
              })
              .map(({ flowOfFundsAmlTransactionId, etag }) => ({
                flowOfFundsAmlTransactionId,
                etag,
              }));

            resetSelections.push(...selectionsWithChanges);
          }

          return {
            editType,
            pendingChanges,
            newTransactions,
            resetSelections,
          };
        }),
        filter(({ pendingChanges, newTransactions, resetSelections }) => {
          const hasChanges =
            pendingChanges.length > 0 ||
            newTransactions.length > 0 ||
            resetSelections.length > 0;
          if (!hasChanges) {
            this.markSavesAsComplete(incomingSaves);
          }
          return hasChanges;
        }),
        switchMap(({ pendingChanges, newTransactions, resetSelections }) => {
          let payload: AddSelectionsReq | SaveChangesReq;

          if (newTransactions.length > 0) {
            const { etag } = this._state$.value;
            payload = {
              selections: newTransactions,
              caseETag: etag,
            };
            return this.addSelections(payload);
          }

          if (pendingChanges.length > 0) {
            payload = {
              pendingChanges,
            };
            return this.editSelections(payload);
          }

          if (resetSelections.length > 0) {
            return this._resetSelections(resetSelections);
          }

          throw new Error('Unknown edit type');
        }),
        finalize(() => this.markSavesAsComplete(incomingSaves)),
        // Outer catchError as safety net for possible change log generation errors
        catchError((error) => {
          this.errorHandler.handleError(error);

          this.markSavesAsComplete(incomingSaves);

          return EMPTY;
        }),
      );
    }),
    takeUntilDestroyed(this.destroyRef),
    share(),
  );

  // --- HIGHLIGHTS BATCHING ---
  private highlightEdits$ = new Subject<
    { txnId: string; newColor: string }[]
  >();
  private resetHiglightsAccumulator$ = new Subject<void>();

  highlightEditsSave$ = merge(
    this.highlightEdits$.pipe(
      map((highlightEdits) => {
        return {
          type: 'update' as const,
          data: highlightEdits,
        };
      }),
    ),

    this.resetHiglightsAccumulator$.pipe(
      map(() => ({ type: 'reset' as const })),
    ),
  ).pipe(
    scan((accumulator, action) => {
      if (action.type === 'reset') {
        return new Map<string, string>();
      }
      const newAccumulator = new Map(accumulator);
      const highlightEdits = action.data;

      for (const { txnId, newColor } of highlightEdits) {
        newAccumulator.set(txnId, newColor);
      }

      return newAccumulator;
    }, new Map<string, string>()),
    debounceTime(1000),
    filter((accumulator) => accumulator.size > 0),
    tap(() => this.resetHiglightsAccumulator$.next()),
    tap((highlightsMap) =>
      this._updateQueue$.next({ editType: 'HIGHLIGHT', highlightsMap }),
    ),
    takeUntilDestroyed(this.destroyRef),
  );

  // --- PUBLIC ACTIONS ---
  saveEditForm(
    edit: ExtractSubjectType<typeof CaseRecordStore.prototype._updateQueue$>,
  ) {
    this._updateQueue$.next(edit);
  }

  saveHighlightEdits(
    highlights: ExtractSubjectType<
      typeof CaseRecordStore.prototype.highlightEdits$
    >,
  ) {
    this.highlightEdits$.next(highlights);
  }

  saveManualTransactions(manualTransactions: StrTransactionWithChangeLogs[]) {
    const manualTransactionsClone = structuredClone(manualTransactions);
    this._updateQueue$.next({
      editType: 'MANUAL_UPLOAD',
      manualTransactions: manualTransactionsClone,
    });
  }

  setSearchParams(searchParam: RouteExtrasFromSearch['searchParams']) {
    const searchParamsClone = structuredClone(searchParam);
    const {
      accountNumbers = [],
      partyKeys = [],
      productTypes = [],
      reviewPeriods = [],
      sourceSystems = [],
    } = searchParamsClone;
    this._state$.next({
      ...this._state$.value,
      searchParams: {
        accountNumbersSelection: accountNumbers ?? [],
        partyKeysSelection: partyKeys?.map(({ value }) => value) ?? [],
        productTypesSelection: productTypes?.map(({ value }) => value) ?? [],
        reviewPeriodSelection: reviewPeriods,
        sourceSystemsSelection: sourceSystems?.map(({ value }) => value) ?? [],
      },
    });
  }

  resetSelections(selectionIds: string[]) {
    this._updateQueue$.next({
      editType: 'RESET_TXNS',
      selectionIds,
    });
  }

  // --- API PROXIES ---
  fetchCaseRecordByAmlId(amlId: string) {
    return this.api.fetchCaseRecord(amlId).pipe(
      tap(
        ({
          caseRecordId,
          amlId,
          searchParams,
          createdAt,
          createdBy,
          status,
          etag,
          lastUpdated,
        }) => {
          this._state$.next({
            ...this._state$.value,
            caseRecordId,
            amlId,
            searchParams: {
              accountNumbersSelection:
                searchParams.accountNumbersSelection ?? [],
              partyKeysSelection: searchParams.partyKeysSelection ?? [],
              productTypesSelection: searchParams.productTypesSelection ?? [],
              reviewPeriodSelection: searchParams.reviewPeriodSelection ?? [],
              sourceSystemsSelection: searchParams.sourceSystemsSelection ?? [],
            },
            createdAt,
            createdBy,
            status,
            etag,
            lastUpdated,
          });
        },
      ),
      // access case record state directly
      map(() => undefined),
    );
  }

  // private createCaseRecord(amlId: string, payload: CreateCaseRecordReq) {
  //   const payloadClone = structuredClone(payload);
  //   return this.api.createCaseRecord(amlId, payloadClone).pipe(
  //     tap(({ caseRecordId, etag }) => {
  //       this._state$.next({
  //         ...this._state$.value,
  //         searchParams: { ...payloadClone },
  //         caseRecordId,
  //         etag: etag,
  //       });
  //     }),
  //     catchError((error) => {
  //       this.errorHandler.handleError(error);

  //       return EMPTY;
  //     }),
  //     shareReplay(1),
  //   );
  // }

  public fetchSelections() {
    return this.api.fetchSelections(this._state$.value.caseRecordId).pipe(
      tap(({ selections }) => {
        this._state$.next({
          ...this._state$.value,
          selections: selections,
        });
      }),
    );
  }

  private addSelections(payload: AddSelectionsReq) {
    const { caseRecordId } = this._state$.value;
    const payloadClone = structuredClone(payload);
    return this.api.addSelections(caseRecordId, payloadClone).pipe(
      tap(() => {
        const { selections } = payloadClone;
        this._state$.next({
          ...this._state$.value,
          selections: [...this._state$.value.selections, ...selections],
          lastUpdated: new Date().toISOString().split('T')[0],
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // Handle errors gracefully
        this.errorHandler.handleError(error);

        if (error.status === 409) {
          // note: no recovery from this state
          this.conflict$.next();
        }

        return EMPTY;
      }),
    );
  }

  private editSelections(payload: SaveChangesReq) {
    const { caseRecordId } = this._state$.value;

    const payloadClone = structuredClone(payload);
    return this.api.saveChanges(caseRecordId, payloadClone).pipe(
      tap(() => {
        const { pendingChanges } = payloadClone;

        pendingChanges
          .filter((change) => change.changeLogs.length > 0)
          .forEach(
            ({
              flowOfFundsAmlTransactionId,
              changeLogs: pendingChangeLogs,
            }) => {
              const txn = this._state$.value.selections.find(
                (strTxn) =>
                  strTxn.flowOfFundsAmlTransactionId ===
                  flowOfFundsAmlTransactionId,
              )!;

              txn.changeLogs.push(
                ...pendingChangeLogs.map((changeLog) => ({
                  ...changeLog,
                  etag: (txn.changeLogs.at(-1)?.eTag ?? 0) + 1,
                  updatedBy: this.auth.currentUser()?.username!,
                  updatedAt: new Date().toISOString(),
                })),
              );
            },
          );

        this._state$.next({
          ...this._state$.value,
          amlId: this._state$.value.amlId,
          selections: this._state$.value.selections,
          selectionsToChange: pendingChanges.map(
            ({ flowOfFundsAmlTransactionId }) => flowOfFundsAmlTransactionId,
          ),
          lastUpdated: new Date().toISOString().split('T')[0],
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // Handle errors gracefylly
        this.errorHandler.handleError(error);

        // Conflict triggers refresh of selections
        if (error.status === 409) {
          this.conflict$.next();
          return this.fetchSelections().pipe(switchMap(() => EMPTY));
        }

        return EMPTY;
      }),
    );
  }

  private _resetSelections(
    pendingResets: ResetSelectionsRequest['pendingResets'],
  ): Observable<void> {
    const { caseRecordId } = this._state$.value;

    return this.api.resetSelections(caseRecordId, pendingResets).pipe(
      tap(() => {
        const selectionIdsSet = new Set(
          pendingResets.map((item) => item.flowOfFundsAmlTransactionId),
        );

        for (const selection of this._state$.value.selections) {
          if (!selectionIdsSet.has(selection.flowOfFundsAmlTransactionId))
            continue;

          selection.etag = 0;
          selection.changeLogs = [];
        }

        this._state$.next({
          ...this._state$.value,
          amlId: this._state$.value.amlId,
          selections: this._state$.value.selections,
          selectionsToChange: [...selectionIdsSet.values()],
          lastUpdated: new Date().toISOString().split('T')[0],
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // Handle errors gracefylly
        this.errorHandler.handleError(error);

        // Conflict triggers refresh of selections
        if (error.status === 409) {
          this.conflict$.next();
          return this.fetchSelections().pipe(switchMap(() => EMPTY));
        }

        return EMPTY;
      }),
    );
  }

  setSearchResult(searchResult: TransactionSearchResponse) {
    this._state$.next({
      ...this._state$.value,
      searchResult,
    });
  }
}

export interface PendingChange {
  flowOfFundsAmlTransactionId: string;
  changeLogs: ChangeLog.ChangeLogType[];
}

export interface CaseRecordState {
  caseRecordId: string;
  amlId: string;
  searchParams: {
    partyKeysSelection: string[];
    accountNumbersSelection: AccountNumber[];
    sourceSystemsSelection: string[];
    productTypesSelection: string[];
    reviewPeriodSelection: ReviewPeriod[];
  };
  createdAt: string;
  createdBy: string;
  status: string;
  etag: number;
  lastUpdated?: string;

  selections: StrTransactionWithChangeLogs[];
  // table partial update use
  selectionsToChange?: PendingChange['flowOfFundsAmlTransactionId'][];
  selectionsToAdd?: StrTransactionWithChangeLogs['flowOfFundsAmlTransactionId'][];

  searchResult: TransactionSearchResponse;
}

// Hidden props prefixed with '_hidden' are ignored by the change logging service.
export type StrTransactionWithChangeLogs = StrTransaction & {
  etag: number;
  caseRecordId: string;
  changeLogs: ChangeLogAudit[];
  _hiddenValidation?: _hiddenValidationType[];
  [key: string]: unknown;
};

type ChangeLogAudit = WithETag<ChangeLog.ChangeLogType> & {
  updatedAt: string;
  updatedBy: string;
};

export interface StrTransactionChangeLogs {
  txnId: string;
  changeLogs: ChangeLog.ChangeLogType[];
}

export interface ReviewPeriod {
  start?: string | null;
  end?: string | null;
}

const computeFullChangesHandler = (
  selections: StrTransactionWithChangeLogs[],
) => {
  return (_acc: StrTransactionWithChangeLogs[]) => {
    return selections
      .map((strTransaction) => {
        return ChangeLog.applyChangeLogs(
          strTransaction,
          strTransaction.changeLogs,
        );
      })
      .map(setRowValidationInfo);
  };
};

const computePartialChangesHandler = (
  selections: StrTransactionWithChangeLogs[],
  selectionsToRecompute: NonNullable<CaseRecordState['selectionsToChange']>,
) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const recomputedSelections = selections
      .filter(({ flowOfFundsAmlTransactionId }) =>
        selectionsToRecompute.includes(flowOfFundsAmlTransactionId),
      )
      .map((strTransaction) => {
        return ChangeLog.applyChangeLogs(
          strTransaction,
          strTransaction.changeLogs,
        );
      })
      .map(setRowValidationInfo);

    return [
      ...recomputedSelections,
      ...acc.filter(
        ({ flowOfFundsAmlTransactionId }) =>
          !selectionsToRecompute.includes(flowOfFundsAmlTransactionId),
      ),
    ];
  };
};

const addSelectionsHandler = (
  strTransactions: StrTransactionWithChangeLogs[],
  addedSelections: NonNullable<CaseRecordState['selectionsToAdd']>,
) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const newTransactions = strTransactions
      .filter(({ flowOfFundsAmlTransactionId }) =>
        addedSelections.includes(flowOfFundsAmlTransactionId),
      )
      .map(setRowValidationInfo);

    return [...strTransactions, ...newTransactions];
  };
};

export function setRowValidationInfo(
  transaction: StrTransactionWithChangeLogs,
) {
  const errors: _hiddenValidationType[] = [];
  if (
    transaction.changeLogs.length > 0 &&
    !transaction.changeLogs.every((log) => log.path === '/highlightColor')
  )
    errors.push('edited');

  if (transaction.startingActions.some((sa) => hasMissingConductorInfo(sa)))
    errors.push('conductorMissing');

  if (
    transaction.startingActions.some(hasMissingAccountInfo) ||
    transaction.completingActions.some(hasMissingAccountInfo)
  )
    errors.push('bankInfoMissing');

  return { ...transaction, _hiddenValidation: errors };
}

type ExtractSubjectType<T> = T extends Subject<infer U> ? U : never;
