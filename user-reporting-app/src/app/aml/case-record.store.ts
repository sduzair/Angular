import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ErrorHandler,
  Injectable,
  InjectionToken,
  OnDestroy,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { uniqBy } from 'lodash-es';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  forkJoin,
  map,
  merge,
  of,
  throwError,
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  defaultIfEmpty,
  filter,
  finalize,
  pairwise,
  scan,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { AuthService } from '../auth.service';
import * as ChangeLog from '../change-logging/change-log';
import {
  hasInvalidFiu,
  hasMissingAccountInfo,
  hasMissingCheque,
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
  AccountNumberSelection,
  TransactionSearchResponse,
} from '../transaction-search/transaction-search.service';
import {
  PendingChange,
  RemoveSelectionsRequest,
  ResetSelectionsRequest,
  SaveChangesRequest,
  SelectionsService,
  WithCaseRecordId,
} from '../transaction-view/selections.service';
import {
  PartyGenService,
  PartyGenType,
} from '../transaction-view/transform-to-str-transaction/party-gen.service';
import { CaseRecordService } from './case-record.service';

export const DEFAULT_CASE_RECORD_STATE: CaseRecordState = {
  searchResponse: [],
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
  eTag: NaN,
  selections: [],
  parties: [],
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
  private selectionsService = inject(SelectionsService);
  private caseRecordService = inject(CaseRecordService);
  private errorHandler = inject(ErrorHandler);
  private readonly initialState = inject(CASE_RECORD_INITIAL_STATE);
  private auth = inject(AuthService);

  // --- STATE STREAMS ---
  private _state$ = new BehaviorSubject<CaseRecordState>(this.initialState);

  public state$ = this._state$.asObservable();

  private conflict$ = new Subject<void>();
  readonly latestCaseRecordVersion$ = this._state$.pipe(
    map((sessionState) => sessionState?.eTag),
  );

  readonly lastUpdated$ = this._state$.pipe(
    map((caseRecordState) => caseRecordState.lastUpdated!),
    startWith(new Date(0).toISOString().split('T')[0]),
  );

  // --- SAVING STATUS ---
  private _qActiveSaveIds$ = new BehaviorSubject<string[]>([]);
  public qActiveSaveIds$ = this._qActiveSaveIds$.asObservable();
  qIsSaving$ = this.qActiveSaveIds$.pipe(map((txns) => txns.length > 0));

  private processedSaveIds$ = this.qActiveSaveIds$.pipe(
    pairwise(),
    map(([prev, curr]) => {
      // IDs that were being saved but are now processed
      return prev.filter((id) => !curr.includes(id));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  whenProcessed(saveIds: string[]): Observable<string[]> {
    return this.processedSaveIds$.pipe(
      filter(
        (processed) =>
          processed.length > 0 && saveIds.every((id) => processed.includes(id)),
      ),
    );
  }

  private markSavesAsProcessed(incomingSaves: string[]) {
    const remaining = [...this._qActiveSaveIds$.value];
    incomingSaves.forEach((id) => {
      const index = remaining.indexOf(id);
      if (index > -1) {
        remaining.splice(index, 1);
      }
    });
    this._qActiveSaveIds$.next(remaining);
  }

  constructor() {
    // Subscribe immediately to ensure str transaction data accumulates from first emission
    this.selectionsComputed$.pipe(takeUntilDestroyed()).subscribe({
      error: () => {
        console.assert(
          false,
          'Assert errors are handled gracefully in pipeline',
        );
      },
    });

    // Activate the highlight saves pipeline
    this.highlightEditsSave$.pipe(takeUntilDestroyed()).subscribe();

    // Start accepting pending changes for saving
    this.updateQueue$.pipe(takeUntilDestroyed()).subscribe({
      error: () => {
        console.assert(
          false,
          'Assert errors are handled gracefully in pipeline',
        );
      },
    });

    this.conflict$
      .pipe(
        switchMap(() => {
          return forkJoin([
            this.fetchCaseRecordByAmlId(this._state$.value.amlId),
            this.fetchSelectionsAndParties(),
          ]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    console.info('Service destroyed - cleaning up streams');

    // Complete all Subjects
    this._state$.complete();
    this.conflict$.complete();
    this._qActiveSaveIds$.complete();
    this._updateQueue$.complete();
    this.highlightEdits$.complete();
    this.resetHiglightsAccumulator$.complete();
  }

  // --- VIEW MODEL FOR REPORTING UI DATA ---
  readonly selectionsComputed$ = this._state$.pipe(
    map(
      ({
        selections: currentSelections,
        selectionsWithPendingChanges: selectionsToChange = [],
        selectionsToAdd = [],
        selectionsToRemove = [],
        parties: currentParties,
      }) => {
        if (selectionsToChange.length > 0) {
          const _cloneSelections = structuredClone(selectionsToChange);
          // eslint-disable-next-line no-param-reassign
          selectionsToChange.length = 0;
          return computePartialChangesHandler({
            selections: currentSelections,
            selectionsToRecompute: _cloneSelections,
            parties: currentParties,
          });
        }

        if (selectionsToAdd.length > 0) {
          const _cloneSelections = structuredClone(selectionsToAdd);
          // eslint-disable-next-line no-param-reassign
          selectionsToAdd.length = 0;
          return computeAddedSelectionsHandler({
            selections: currentSelections,
            addedSelections: _cloneSelections,
            parties: currentParties,
          });
        }

        if (selectionsToRemove.length > 0) {
          const _cloneSelections = structuredClone(selectionsToRemove);
          // eslint-disable-next-line no-param-reassign
          selectionsToRemove.length = 0;
          return (acc: StrTransactionWithChangeLogs[]) => {
            return acc.filter(
              (txn) =>
                !_cloneSelections.includes(txn.flowOfFundsAmlTransactionId),
            );
          };
        }

        if (currentSelections.length == 0) return () => [];

        return computeFullChangesHandler({
          selections: currentSelections,
          parties: currentParties,
        });
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
    takeUntilDestroyed(),
    shareReplay({ bufferSize: 1, refCount: false }), // stream never dies in aml component scope
  );

  // --- EDIT QUEUE ---
  private _updateQueue$ = new Subject<
    | {
        editType: 'SINGLE_SAVE';
        flowOfFundsAmlTransactionId: string;
        selectionAfter: EditFormValueType;
      }
    | {
        editType: 'BULK_SAVE';
        selectionAfter: EditFormValueType;
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
    | { editType: 'HIGHLIGHT'; highlightsMap: Map<string, string> }
    | {
        editType: 'ADD_SELECTIONS_MANUAL';
        manualSelectionsAndParties: {
          manualSelection: StrTransactionWithChangeLogs;
          manualParties: PartyGenType[];
        }[];
      }
    | {
        editType: 'ADD_PARTIES';
        parties: PartyGenType[];
      }
    | {
        editType: 'RESET_SELECTIONS';
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
    | {
        editType: 'REMOVE_SELECTIONS';
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
  >();

  private updateQueue$ = this._updateQueue$.asObservable().pipe(
    map((edit) => {
      const existingSaveIds = this._qActiveSaveIds$.value;
      let incomingSaves: string[] = [];

      if (edit.editType === 'SINGLE_SAVE') {
        incomingSaves = [edit.flowOfFundsAmlTransactionId];
      }
      if (edit.editType === 'BULK_SAVE') {
        incomingSaves = edit.selectionIds;
      }
      if (edit.editType === 'HIGHLIGHT') {
        incomingSaves = Array.from(edit.highlightsMap.keys());
      }
      if (edit.editType === 'ADD_SELECTIONS_MANUAL') {
        incomingSaves = edit.manualSelectionsAndParties.map(
          ({ manualSelection }) => manualSelection.flowOfFundsAmlTransactionId,
        );
      }
      if (edit.editType === 'ADD_PARTIES') {
        /* empty */
      }
      if (edit.editType === 'RESET_SELECTIONS') {
        incomingSaves = edit.selectionIds;
      }

      this._qActiveSaveIds$.next([...existingSaveIds, ...incomingSaves]);
      return { edit, incomingSaves };
    }),
    concatMap(({ edit, incomingSaves }) => {
      return of(edit).pipe(
        withLatestFrom(
          this.selectionsComputed$,
          this._state$.pipe(map(({ selections }) => selections)),
        ),
        map(([edit, selectionsComputed, selectionsCurrent]) => {
          const { editType } = edit;
          const pendingChanges: SaveChangesRequest['pendingChanges'] = [];
          const selectionsAndPartiesToAdd: {
            selection?: StrTransactionWithChangeLogs;
            parties: PartyGenType[];
          }[] = [];
          const selectionsToReset: ResetSelectionsRequest['pendingResets'] = [];
          const selectionsToRemove: RemoveSelectionsRequest['selectionIds'] =
            [];

          if (editType === 'SINGLE_SAVE') {
            const {
              selectionAfter: transactionAfter,
              flowOfFundsAmlTransactionId,
            } = edit;
            const changeLogs = ChangeLog.generateChangeLogs(
              selectionsComputed.find(
                (txn) =>
                  txn.flowOfFundsAmlTransactionId ===
                  flowOfFundsAmlTransactionId,
              )!,
              transactionAfter as StrTransactionWithChangeLogs,
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

          if (editType === 'BULK_SAVE') {
            const {
              selectionIds: selections,
              selectionAfter: transactionAfter,
            } = edit;
            selections.forEach((selection) => {
              const transactionBefore = selectionsComputed.find(
                (txn) => txn.flowOfFundsAmlTransactionId === selection,
              )!;

              const changeLogs = ChangeLog.generateChangeLogs(
                transactionBefore,
                transactionAfter as StrTransactionWithChangeLogs,
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
              const transactionRaw = selectionsCurrent.find(
                (txn) => txn.flowOfFundsAmlTransactionId === txnId,
              );

              if (!transactionRaw) continue;

              const transactionBefore = ChangeLog.applyChangeLogs(
                transactionRaw,
                transactionRaw?.changeLogs,
              );

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

          if (editType === 'ADD_SELECTIONS_MANUAL') {
            const { manualSelectionsAndParties } = edit;

            selectionsAndPartiesToAdd.push(
              ...manualSelectionsAndParties.map((item) => ({
                selection: item.manualSelection,
                parties: item.manualParties,
              })),
            );
          }

          if (edit.editType === 'ADD_PARTIES') {
            const { parties } = edit;
            selectionsAndPartiesToAdd.push({ parties });
          }

          if (editType === 'RESET_SELECTIONS') {
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
              .map(({ flowOfFundsAmlTransactionId, changeLogs }) => ({
                flowOfFundsAmlTransactionId,
                eTag: changeLogs.at(-1)?.eTag ?? 0,
              }));

            selectionsToReset.push(...selectionsWithChanges);
          }

          if (editType === 'REMOVE_SELECTIONS') {
            const { selectionIds: tableSelections } = edit;
            selectionsToRemove.push(...tableSelections);
          }

          return {
            editType,
            pendingChanges,
            selectionsAndPartiesToAdd,
            selectionsToReset,
            selectionsToRemove,
          };
        }),
        filter(
          ({
            pendingChanges,
            selectionsAndPartiesToAdd,
            selectionsToReset,
            selectionsToRemove,
          }) => {
            const hasChanges =
              pendingChanges.length > 0 ||
              selectionsAndPartiesToAdd.length > 0 ||
              selectionsToReset.length > 0 ||
              selectionsToRemove.length > 0;

            if (!hasChanges) {
              this.markSavesAsProcessed(incomingSaves);
            }
            return hasChanges;
          },
        ),
        switchMap(
          ({
            pendingChanges,
            selectionsAndPartiesToAdd,
            selectionsToReset,
            selectionsToRemove,
          }) => {
            if (selectionsAndPartiesToAdd.length > 0) {
              return this.addSelectionsAndParties(selectionsAndPartiesToAdd);
            }

            if (pendingChanges.length > 0) {
              return this.saveChanges({
                pendingChanges,
              });
            }

            if (selectionsToReset.length > 0) {
              return this._resetSelections(selectionsToReset);
            }

            if (selectionsToRemove.length > 0) {
              return this.removeSelections(selectionsToRemove);
            }

            throw new Error('Unknown edit type');
          },
        ),
        finalize(() => this.markSavesAsProcessed(incomingSaves)),
        // Outer catchError as safety net for possible change log generation errors
        catchError((error) => {
          this.errorHandler.handleError(error);
          return of();
        }),
      );
    }),
    takeUntilDestroyed(),
    share(),
  );

  // --- HIGHLIGHTS BATCHING ---
  private highlightEdits$ = new Subject<
    { txnId: string; newColor: string }[]
  >();
  private resetHiglightsAccumulator$ = new Subject<void>();

  private highlightEditsSave$ = merge(
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
    takeUntilDestroyed(),
  );

  // --- PUBLIC ACTIONS ---
  setSearchResult(searchResult: TransactionSearchResponse) {
    this._state$.next({
      ...this._state$.value,
      searchResponse: searchResult,
    });
  }

  setSearchParams(searchParam: RouteExtrasFromSearch['searchParams']) {
    const searchParamsClone = structuredClone(searchParam);
    this._state$.next({
      ...this._state$.value,
      searchParams: searchParamsClone,
    });
  }

  setCaseRecordId(caseRecordId: string) {
    this._state$.next({
      ...this._state$.value,
      caseRecordId,
    });
  }

  private partyGenService = inject(PartyGenService);

  qSaveEditForm(
    edit: ExtractSubjectType<typeof CaseRecordStore.prototype._updateQueue$>,
  ) {
    if (edit.editType !== 'SINGLE_SAVE' && edit.editType !== 'BULK_SAVE')
      throw new Error();

    const { selectionAfter: editFormValue } = edit;

    const partiesToGenerate = extractAllPartyRefs(editFormValue).filter(
      (ref) => !ref.linkToSub,
    );

    forkJoin(
      partiesToGenerate.map((ref) => {
        const {
          _hiddenPartyKey: partyKey,
          _hiddenGivenName: givenName,
          _hiddenSurname: surname,
          _hiddenOtherOrInitial: otherOrInitial,
          _hiddenNameOfEntity: nameOfEntity,
        } = ref;
        return this.partyGenService
          .generateParty({
            identifiers: { partyKey },
            partyName: { givenName, otherOrInitial, surname, nameOfEntity },
          })
          .pipe(
            tap((generatedParty) => {
              const { partyIdentifier } = generatedParty!;
              // eslint-disable-next-line no-param-reassign
              ref.linkToSub = partyIdentifier;
            }),
          );
      }),
    )
      .pipe(defaultIfEmpty([] as (PartyGenType | null)[]), take(1))
      // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil
      .subscribe((parties) => {
        console.assert(parties.every((p) => !!p));

        if (parties.length > 0) {
          this._updateQueue$.next({
            editType: 'ADD_PARTIES',
            parties: parties as PartyGenType[],
          });
        }

        this._updateQueue$.next(edit);
      });
  }

  qSaveHighlightEdits(
    highlights: ExtractSubjectType<
      typeof CaseRecordStore.prototype.highlightEdits$
    >,
  ) {
    this.highlightEdits$.next(highlights);
  }

  qAddManualSelectionsAndParties(
    manualSelectionsAndParties: {
      manualSelection: StrTransactionWithChangeLogs;
      manualParties: PartyGenType[];
    }[],
  ) {
    this._updateQueue$.next({
      editType: 'ADD_SELECTIONS_MANUAL',
      manualSelectionsAndParties,
    });
  }

  qResetSelections(selectionIds: string[]) {
    this._updateQueue$.next({
      editType: 'RESET_SELECTIONS',
      selectionIds,
    });
  }

  qRemoveSelections(selectionIds: string[]) {
    this._updateQueue$.next({
      editType: 'REMOVE_SELECTIONS',
      selectionIds,
    });
  }

  // --- API PROXIES ---
  fetchCaseRecordByAmlId(amlId: string) {
    return this.caseRecordService.fetchCaseRecordByAmlId(amlId).pipe(
      tap(
        ({
          caseRecordId,
          amlId,
          searchParams,
          createdAt,
          createdBy,
          status,
          eTag,
          lastUpdated,
        }) => {
          const {
            reviewPeriodSelection,
            partyKeysSelection,
            accountNumbersSelection,
            sourceSystemsSelection,
            productTypesSelection,
          } = searchParams ?? {};
          this._state$.next({
            ...this._state$.value,
            caseRecordId,
            amlId,
            searchParams: {
              accountNumbersSelection: accountNumbersSelection ?? [],
              partyKeysSelection: partyKeysSelection ?? [],
              productTypesSelection: productTypesSelection ?? [],
              reviewPeriodSelection: reviewPeriodSelection ?? [],
              sourceSystemsSelection: sourceSystemsSelection ?? [],
            },
            createdAt,
            createdBy,
            status,
            eTag,
            lastUpdated,
          });
        },
      ),
      // access case record state from state
      map(() => true),
    );
  }

  public fetchSelectionsAndParties() {
    return this.selectionsService
      .fetchSelections(this._state$.value.caseRecordId)
      .pipe(
        tap(({ selections, parties }) => {
          this._state$.next({
            ...this._state$.value,
            selections,
            parties,
          });
        }),
      );
  }

  public addSelectionsAndParties(
    selectionsAndParties: {
      selection?: StrTransactionWithChangeLogs;
      parties: PartyGenType[];
    }[],
  ) {
    if (selectionsAndParties.length === 0) return of({ count: 0 });

    return this._state$.pipe(
      take(1),
      switchMap(({ caseRecordId, eTag: caseETag, parties: partiesCurrent }) => {
        const selections = selectionsAndParties.flatMap(({ selection }) =>
          selection ? [selection] : [],
        );
        const isNotExistingParty = (item: PartyGenType): boolean =>
          partiesCurrent.findIndex(
            (curr) => curr.partyIdentifier === item.partyIdentifier,
          ) === -1;

        const parties = uniqBy(
          selectionsAndParties.flatMap(({ parties }) => parties),
          (party) => party.partyIdentifier,
        ).filter(isNotExistingParty);

        return this.selectionsService
          .addSelectionsAndParties(caseRecordId, {
            caseETag,
            selections,
            parties,
          })
          .pipe(
            tap(({ caseETag: newCaseETag, lastUpdated }) => {
              this._state$.next({
                ...this._state$.value,
                selections: [
                  ...this._state$.value.selections,
                  ...selections.map(
                    (sel) =>
                      ({
                        ...sel,
                        caseRecordId,
                        changeLogs: [],
                        eTag: 0,
                      }) satisfies StrTransactionWithChangeLogs,
                  ),
                ],
                selectionsWithPendingChanges: selections.map(
                  (sel) => sel.flowOfFundsAmlTransactionId,
                ),
                parties: [
                  ...partiesCurrent,
                  ...parties.map((party) => ({ ...party, caseRecordId })),
                ],
                eTag: newCaseETag,
                lastUpdated,
              });
            }),
            catchError((error: HttpErrorResponse) => {
              // Conflict triggers refresh of local state
              if (error.status === HttpStatusCode.Conflict) {
                this.conflict$.next();
              }

              return throwError(() => error);
            }),
            // access selections directly from state
            map(({ count }) => ({ count })),
          );
      }),
    );
  }

  public removeSelections(
    selectionIds: RemoveSelectionsRequest['selectionIds'],
  ) {
    if (selectionIds.length === 0) return of({ count: 0 });

    const { caseRecordId, eTag: caseETag } = this._state$.value;

    return this.selectionsService
      .removeSelections(caseRecordId, { caseETag, selectionIds: selectionIds })
      .pipe(
        tap(({ caseETag: newCaseETag, lastUpdated }) => {
          this._state$.next({
            ...this._state$.value,
            selections: [
              ...this._state$.value.selections.filter(
                (sel) =>
                  !selectionIds.includes(sel.flowOfFundsAmlTransactionId),
              ),
            ],
            selectionsToRemove: selectionIds,
            eTag: newCaseETag,
            lastUpdated,
          });
        }),
        catchError((error: HttpErrorResponse) => {
          // Conflict triggers refresh of local state
          if (error.status === HttpStatusCode.Conflict) {
            this.conflict$.next();
          }

          return throwError(() => error);
        }),
        map(({ count }) => ({ count })),
      );
  }

  private saveChanges(payload: SaveChangesRequest) {
    const { caseRecordId } = this._state$.value;

    const payloadClone = structuredClone(payload);
    return this.selectionsService.saveChanges(caseRecordId, payloadClone).pipe(
      tap(({ updatedAt, updatedBy }) => {
        const { pendingChanges } = payloadClone;

        pendingChanges
          .filter((change) => change.changeLogs.length > 0)
          .forEach(
            ({
              flowOfFundsAmlTransactionId,
              eTag,
              changeLogs: pendingChangeLogs,
            }) => {
              const txn = this._state$.value.selections.find(
                (strTxn) =>
                  strTxn.flowOfFundsAmlTransactionId ===
                  flowOfFundsAmlTransactionId,
              )!;

              txn.eTag = eTag + 1;
              txn.changeLogs.push(
                ...pendingChangeLogs.map((changeLog) => ({
                  ...changeLog,
                  eTag: eTag + 1,
                  updatedBy,
                  updatedAt,
                })),
              );
            },
          );

        this._state$.next({
          ...this._state$.value,
          amlId: this._state$.value.amlId,
          selections: this._state$.value.selections,
          selectionsWithPendingChanges: pendingChanges.map(
            ({ flowOfFundsAmlTransactionId }) => flowOfFundsAmlTransactionId,
          ),
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // Conflict triggers refresh of local state
        if (error.status === HttpStatusCode.Conflict) {
          this.conflict$.next();
          return EMPTY;
        }

        // rollback highlights applied optimistically
        const { pendingChanges } = payloadClone;
        this._state$.next({
          ...this._state$.value,
          selectionsWithPendingChanges: pendingChanges.map(
            ({ flowOfFundsAmlTransactionId }) => flowOfFundsAmlTransactionId,
          ),
        });

        return throwError(() => error);
      }),
    );
  }

  private _resetSelections(
    pendingResets: ResetSelectionsRequest['pendingResets'],
  ) {
    const { caseRecordId } = this._state$.value;

    return this.selectionsService
      .resetSelections(caseRecordId, { pendingResets })
      .pipe(
        tap(() => {
          const selectionIdsSet = new Set(
            pendingResets.map((item) => item.flowOfFundsAmlTransactionId),
          );

          for (const selection of this._state$.value.selections) {
            if (!selectionIdsSet.has(selection.flowOfFundsAmlTransactionId))
              continue;

            selection.eTag = 0;
            selection.changeLogs = [];
          }

          this._state$.next({
            ...this._state$.value,
            amlId: this._state$.value.amlId,
            selections: this._state$.value.selections,
            selectionsWithPendingChanges: [...selectionIdsSet.values()],
          });
        }),
        catchError((error: HttpErrorResponse) => {
          // Handle errors gracefylly
          this.errorHandler.handleError(error);

          // Conflict triggers refresh of local state
          if (error.status === HttpStatusCode.Conflict) {
            this.conflict$.next();
          }

          return throwError(() => error);
        }),
      );
  }
}

export interface CaseRecordState {
  caseRecordId: string;
  amlId: string;
  searchParams: {
    partyKeysSelection: string[];
    accountNumbersSelection: AccountNumberSelection[];
    sourceSystemsSelection: string[];
    productTypesSelection: string[];
    reviewPeriodSelection: ReviewPeriod[];
  };
  createdAt: string;
  createdBy: string;
  lastUpdatedBy?: string;
  status: string;
  eTag: number;
  lastUpdated?: string;

  selections: StrTransactionWithChangeLogs[];
  parties: WithCaseRecordId<PartyGenType>[];

  // table partial update use
  selectionsWithPendingChanges?: PendingChange['flowOfFundsAmlTransactionId'][];
  selectionsToAdd?: StrTransactionWithChangeLogs['flowOfFundsAmlTransactionId'][];
  selectionsToRemove?: StrTransactionWithChangeLogs['flowOfFundsAmlTransactionId'][];
  searchResponse: TransactionSearchResponse;
}

// Hidden props prefixed with '_hidden' are ignored by the change logging service.
export type StrTransactionWithChangeLogs = StrTransaction & {
  eTag: number;
  caseRecordId: string;
  changeLogs: ChangeLogAudit[];
  _hiddenValidation?: _hiddenValidationType[];
  // [key: string]: unknown;
};

export type ChangeLogAudit = WithETag<ChangeLog.ChangeLogType> & {
  updatedAt: string;
  updatedBy: string;
  eTag: number;
};

export interface StrTransactionChangeLogs {
  txnId: string;
  changeLogs: ChangeLog.ChangeLogType[];
}

export interface ReviewPeriod {
  start: string;
  end: string;
}

const computeFullChangesHandler = ({
  selections,
  parties,
}: {
  selections: StrTransactionWithChangeLogs[];
  parties: WithCaseRecordId<PartyGenType>[];
}) => {
  return (_acc: StrTransactionWithChangeLogs[]) => {
    const enrichParties = createTransactionPartyEnricher(parties);

    return selections
      .map((strTransaction) => {
        return ChangeLog.applyChangeLogs(
          strTransaction,
          strTransaction.changeLogs,
        );
      })
      .map(setRowValidationInfo)
      .map(enrichParties);
  };
};

const computePartialChangesHandler = ({
  selections,
  selectionsToRecompute,
  parties,
}: {
  selections: StrTransactionWithChangeLogs[];
  selectionsToRecompute: NonNullable<
    CaseRecordState['selectionsWithPendingChanges']
  >;
  parties: WithCaseRecordId<PartyGenType>[];
}) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const enrichParties = createTransactionPartyEnricher(parties);

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
      .map(setRowValidationInfo)
      .map(enrichParties);

    // todo: preserve index

    return acc.map((sel) => {
      const { flowOfFundsAmlTransactionId } = sel;
      return selectionsToRecompute.includes(flowOfFundsAmlTransactionId)
        ? recomputedSelections.find(
            (sel) =>
              sel.flowOfFundsAmlTransactionId === flowOfFundsAmlTransactionId,
          )!
        : sel;
    });
  };
};

const computeAddedSelectionsHandler = ({
  selections,
  addedSelections,
  parties,
}: {
  selections: StrTransactionWithChangeLogs[];
  addedSelections: NonNullable<CaseRecordState['selectionsToAdd']>;
  parties: WithCaseRecordId<PartyGenType>[];
}) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const enrichParties = createTransactionPartyEnricher(parties);

    const newTransactions = selections
      .filter(({ flowOfFundsAmlTransactionId }) =>
        addedSelections.includes(flowOfFundsAmlTransactionId),
      )
      .map(setRowValidationInfo)
      .map(enrichParties);

    return [...selections, ...newTransactions];
  };
};

export function setRowValidationInfo(selection: StrTransactionWithChangeLogs) {
  const errors: _hiddenValidationType[] = selection._hiddenValidation ?? [];
  if (
    selection.changeLogs.length > 0 &&
    !selection.changeLogs.every((log) => log.path === '/highlightColor')
  )
    errors.push('edited');

  if (selection.startingActions.some((sa) => hasMissingConductorInfo(sa)))
    errors.push('conductorMissing');

  if (
    selection.startingActions.some(hasMissingAccountInfo) ||
    selection.completingActions.some(hasMissingAccountInfo)
  )
    errors.push('bankInfoMissing');

  if (
    selection.startingActions.some(hasInvalidFiu) ||
    selection.completingActions.some(hasInvalidFiu)
  )
    errors.push('invalidFiu');

  if (selection.startingActions.some(hasMissingCheque))
    errors.push('missingCheque');

  return { ...selection, _hiddenValidation: errors };
}

const createPartyDenormalizer =
  (parties: WithCaseRecordId<PartyGenType>[]) =>
  <T extends PartyDenormalized>(ref: T): T => {
    console.assert(!!ref.linkToSub, 'Assert link to sub ref exists');

    const party = parties.find((party) => party.partyIdentifier);
    const partyName = party?.partyName;
    if (!partyName) return ref;

    const { surname, givenName, otherOrInitial, nameOfEntity } = partyName;

    return {
      ...ref,
      _hiddenSurname: surname,
      _hiddenGivenName: givenName,
      _hiddenOtherOrInitial: otherOrInitial,
      _hiddenNameOfEntity: nameOfEntity,
    };
  };

const createTransactionPartyEnricher =
  (parties: WithCaseRecordId<PartyGenType>[]) =>
  (txn: StrTransactionWithChangeLogs): StrTransactionWithChangeLogs => {
    const enrichRef = createPartyDenormalizer(parties);

    const startingActions =
      txn.startingActions?.map((sa) => ({
        ...sa,
        accountHolders: sa.accountHolders?.map(enrichRef),
        conductors: sa.conductors?.map((c) => ({
          ...enrichRef(c),
          onBehalfOf: c.onBehalfOf?.map(enrichRef),
        })),
        sourceOfFunds: sa.sourceOfFunds?.map(enrichRef),
      })) ?? txn.startingActions;

    const completingActions =
      txn.completingActions?.map((ca) => ({
        ...ca,
        accountHolders: ca.accountHolders?.map(enrichRef),
        involvedIn: ca.involvedIn?.map(enrichRef),
        beneficiaries: ca.beneficiaries?.map(enrichRef),
      })) ?? txn.completingActions;

    return {
      ...txn,
      startingActions,
      completingActions,
    };
  };

function extractAllPartyRefs(
  editFormValue: EditFormValueType,
): PartyDenormalized[] {
  const partyRefs: PartyDenormalized[] = [];

  // Extract from starting actions
  editFormValue.startingActions?.forEach((sa) => {
    partyRefs.push(...(sa.accountHolders || []));
    partyRefs.push(...(sa.sourceOfFunds || []));

    sa.conductors?.forEach((conductor) => {
      partyRefs.push(conductor);
      partyRefs.push(...(conductor.onBehalfOf || []));
    });
  });

  // Extract from completing actions
  editFormValue.completingActions?.forEach((ca) => {
    partyRefs.push(...(ca.accountHolders || []));
    partyRefs.push(...(ca.involvedIn || []));
    partyRefs.push(...(ca.beneficiaries || []));
  });

  return partyRefs;
}

interface PartyDenormalized {
  linkToSub?: string | null;
  _hiddenPartyKey?: string | null;
  _hiddenSurname?: string | null;
  _hiddenGivenName?: string | null;
  _hiddenOtherOrInitial?: string | null;
  _hiddenNameOfEntity?: string | null;
}

type ExtractSubjectType<T> = T extends Subject<infer U> ? U : never;
