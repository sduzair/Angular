import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  DestroyRef,
  ErrorHandler,
  Injectable,
  InjectionToken,
  OnDestroy,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  delay,
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
import {
  ChangeLog,
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from '../change-log.service';
import {
  hasMissingCibcInfo,
  hasMissingConductorInfo,
} from '../reporting-ui/edit-form/common-validation';
import { EditFormValueType } from '../reporting-ui/edit-form/edit-form.component';
import {
  StrTransactionData,
  _hiddenValidationType,
} from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { DeepPartial } from '../test-helpers';

export const DEFAULT_SESSION_STATE: SessionStateLocal = {
  version: 0,
  amlId: '',
  transactionSearchParams: {
    accountNumbersSelection: [],
    partyKeysSelection: [],
    productTypesSelection: [],
    reviewPeriodSelection: [],
    sourceSystemsSelection: [],
  },
  strTransactions: [],
};

export const SESSION_INITIAL_STATE = new InjectionToken<SessionStateLocal>(
  'SESSION_INITIAL_STATE',
  {
    factory: () => DEFAULT_SESSION_STATE,
  },
);

@Injectable()
export class SessionStateService implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  http = inject(HttpClient);
  errorHandler = inject(ErrorHandler);
  private changeLogService = inject(ChangeLogService);
  private readonly initialState = inject(SESSION_INITIAL_STATE);
  private snackBar = inject(MatSnackBar);

  private _sessionState$ = new BehaviorSubject<SessionStateLocal>(
    this.initialState,
  );

  // todo: remove usage - pending tests
  getSessionStateValue() {
    return this._sessionState$.value;
  }

  public sessionState$ = this._sessionState$.asObservable();

  private conflict$ = new Subject<void>();
  readonly latestSessionVersion$ = this._sessionState$.pipe(
    map((sessionState) => sessionState?.version),
  );

  readonly lastUpdated$ = this._sessionState$.pipe(
    map((sessionState) => sessionState.lastUpdated!),
    startWith(new Date(0).toISOString().split('T')[0]),
  );

  private _savingEdits$ = new BehaviorSubject<string[]>([]);
  savingEdits$ = this._savingEdits$.asObservable();
  savingStatus$ = this.savingEdits$.pipe(map((txns) => txns.length > 0));

  // Derived observable for completed saves
  private completedEdits$ = this.savingEdits$.pipe(
    pairwise(),
    map(([prev, curr]) => {
      // IDs that were being saved but are now complete
      return prev.filter((id) => !curr.includes(id));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  whenCompleted(ids: string[]): Observable<string[]> {
    return this.completedEdits$.pipe(
      filter(
        (completed) =>
          completed.length > 0 && ids.every((id) => completed.includes(id)),
      ),
    );
  }

  /**
   * Used to populate reporting ui table
   */
  readonly strTransactionData$ = this._sessionState$.pipe(
    map(
      ({
        strTransactions,
        lastEditedStrTransactions,
        newManualTransactions = [],
      }) => {
        if (lastEditedStrTransactions)
          return computePartialTransactionDataHandler(
            strTransactions,
            (original: StrTransactionWithChangeLogs, changes: ChangeLog[]) =>
              this.changeLogService.applyChanges(original, changes),
            lastEditedStrTransactions,
            newManualTransactions,
          );

        return computeFullTransactionDataHandler(
          strTransactions,
          (original: StrTransactionWithChangeLogs, changes: ChangeLog[]) =>
            this.changeLogService.applyChanges(original, changes),
        );
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

  constructor() {
    // Subscribe immediately to ensure str transaction data accumulates from first emission
    this.strTransactionData$
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
    console.log('Service destroyed - cleaning up streams');

    // Complete all Subjects
    this._sessionState$.complete();
    this.conflict$.complete();
    this._savingEdits$.complete();
    this._updateQueue$.complete();
    this.highlightEdits$.complete();
    this.resetHiglightsAccumulator$.complete();
  }

  fetchSessionByAmlId(amlId: string) {
    return this.http.get<GetSessionResponse>(`/api/sessions/${amlId}`).pipe(
      tap(
        ({
          amlId,
          version,
          data: { transactionSearchParams, strTransactions = [] },
          updatedAt,
        }) => {
          // todo: use error handling to display version conflict message
          this._sessionState$.next({
            amlId: amlId,
            version,
            transactionSearchParams,
            strTransactions,
            lastUpdated: updatedAt,
          });
        },
      ),
    );
  }

  createSession(amlId: string) {
    return this.http
      .post<CreateSessionResponse>('/api/sessions', {
        amlId: amlId,
        data: {
          transactionSearchParams: {
            accountNumbersSelection: [],
            partyKeysSelection: [],
            productTypesSelection: [],
            reviewPeriodSelection: [],
            sourceSystemsSelection: [],
          },
          strTransactionsEdited: [],
        },
      })
      .pipe(
        tap((res) => {
          console.assert(res.version === 0);

          this._sessionState$.next({
            version: 0,
            amlId,
            transactionSearchParams: {
              accountNumbersSelection: [],
              partyKeysSelection: [],
              productTypesSelection: [],
              reviewPeriodSelection: [],
              sourceSystemsSelection: [],
            },
            strTransactions: [],
          });
        }),
      );
  }

  private _updateQueue$ = new Subject<
    | {
        editType: 'SINGLE_EDIT';
        flowOfFundsAmlTransactionId: string;
        editFormValue: EditFormValueType;
        editFormValueBefore: EditFormValueType;
      }
    | {
        editType: 'BULK_EDIT';
        editFormValue: EditFormValueType;
        transactionsBefore: StrTransactionWithChangeLogs[];
      }
    | { editType: 'HIGHLIGHT'; highlightsMap: Map<string, string> }
    | {
        editType: 'MANUAL_UPLOAD';
        manualTransactions: StrTransactionWithChangeLogs[];
      }
  >();

  updateQueue$ = this._updateQueue$.asObservable().pipe(
    // Track transactions being saved
    map((edit) => {
      const existingSaveIds = this._savingEdits$.value;
      let incomingSaves: string[] = [];

      if (edit.editType === 'SINGLE_EDIT') {
        incomingSaves = [edit.flowOfFundsAmlTransactionId];
      }
      if (edit.editType === 'BULK_EDIT') {
        incomingSaves = edit.transactionsBefore.map(
          (txn) => txn.flowOfFundsAmlTransactionId,
        );
      }
      if (edit.editType === 'HIGHLIGHT') {
        incomingSaves = Array.from(edit.highlightsMap.keys());
      }
      if (edit.editType === 'MANUAL_UPLOAD') {
        incomingSaves = edit.manualTransactions.map(
          (txn) => txn.flowOfFundsAmlTransactionId,
        );
      }

      this._savingEdits$.next([...existingSaveIds, ...incomingSaves]);
      return { edit, incomingSaves };
    }),
    concatMap(({ edit, incomingSaves }) => {
      return of(edit).pipe(
        withLatestFrom(this.strTransactionData$),
        map(([edit, strTransactionsData]) => {
          const { editType } = edit;
          const pendingChanges: PendingChange[] = [];
          let newTransactions: StrTransactionWithChangeLogs[] = [];

          if (editType === 'SINGLE_EDIT') {
            const {
              editFormValueBefore,
              editFormValue,
              flowOfFundsAmlTransactionId,
            } = edit;
            const changeLogs: ChangeLogWithoutVersion[] = [];
            this.changeLogService.compareProperties(
              editFormValueBefore,
              editFormValue,
              changeLogs,
            );
            pendingChanges.push({
              flowOfFundsAmlTransactionId,
              pendingChangeLogs: changeLogs,
            });
          }

          if (editType === 'BULK_EDIT') {
            const { transactionsBefore, editFormValue } = edit;
            transactionsBefore.forEach((transactionBefore) => {
              const changeLogs: ChangeLogWithoutVersion[] = [];
              this.changeLogService.compareProperties(
                transactionBefore,
                editFormValue,
                changeLogs,
                { discriminator: 'index' },
              );
              pendingChanges.push({
                flowOfFundsAmlTransactionId:
                  transactionBefore.flowOfFundsAmlTransactionId,
                pendingChangeLogs: changeLogs,
              });
            });
          }

          if (editType === 'HIGHLIGHT') {
            const { highlightsMap } = edit;

            for (const [txnId, newColor] of highlightsMap.entries()) {
              const transaction = strTransactionsData.find(
                (txn) => txn.flowOfFundsAmlTransactionId === txnId,
              );

              if (!transaction) continue;

              const pendingChangeLogs: ChangeLogWithoutVersion[] = [];

              this.changeLogService.compareProperties(
                {
                  highlightColor: transaction.highlightColor,
                } satisfies DeepPartial<StrTransactionWithChangeLogs>,
                {
                  highlightColor: newColor,
                } satisfies DeepPartial<StrTransactionWithChangeLogs>,
                pendingChangeLogs,
              );

              if (pendingChangeLogs.length === 0) {
                const isSameHighlightColor =
                  transaction.highlightColor === newColor;
                console.assert(isSameHighlightColor);
                continue;
              }

              console.assert(pendingChangeLogs.length === 1);

              pendingChanges.push({
                flowOfFundsAmlTransactionId: txnId,
                pendingChangeLogs: [pendingChangeLogs[0]],
              });
            }
          }

          if (editType === 'MANUAL_UPLOAD') {
            const { manualTransactions } = edit;
            newTransactions = manualTransactions;
          }

          return { editType, pendingChanges, newTransactions, incomingSaves };
        }),
        filter(({ pendingChanges, newTransactions, incomingSaves }) => {
          const hasChanges =
            pendingChanges.length > 0 || newTransactions.length > 0;
          if (!hasChanges) {
            this.removeIncomingSaves(incomingSaves);
          }
          return hasChanges;
        }),
        switchMap(
          ({ editType, pendingChanges, newTransactions, incomingSaves }) => {
            const {
              strTransactions = [],
              transactionSearchParams,
              version: currentVersion,
            } = structuredClone(this._sessionState$.value);

            // Apply pending changes to existing transactions
            pendingChanges
              .filter((change) => change.pendingChangeLogs.length > 0)
              .forEach(({ flowOfFundsAmlTransactionId, pendingChangeLogs }) => {
                const txn = strTransactions.find(
                  (strTxn) =>
                    strTxn.flowOfFundsAmlTransactionId ===
                    flowOfFundsAmlTransactionId,
                )!;

                txn.changeLogs.push(
                  ...pendingChangeLogs.map((changeLog) => ({
                    ...changeLog,
                    version: currentVersion + 1,
                  })),
                );
              });

            // Add new transactions for MANUAL_UPLOAD
            if (newTransactions.length > 0) {
              strTransactions.push(...newTransactions);
            }

            const payload: UpdateSessionRequest = {
              currentVersion,
              data: { transactionSearchParams, strTransactions },
            };

            // return this.http
            //   .put<UpdateSessionResponse>(
            //     `/api/sessions/${this._sessionState$.value.amlId}`,
            //     payload,
            //   )
            //   .pipe(
            return of({
              amlId: '9999',
              newVersion: currentVersion + 1,
              updatedAt: new Date(0).toISOString().split('T')[0],
            }).pipe(
              map((response) => ({ editType, response })),
              // return throwError(() => new HttpErrorResponse({ status: 500 })).pipe(
              delay(200),
              tap(({ response: { newVersion, updatedAt } }) => {
                console.assert(newVersion === payload.currentVersion + 1);
                this._sessionState$.next({
                  amlId: this._sessionState$.value.amlId,
                  version: newVersion,
                  transactionSearchParams,
                  strTransactions,
                  lastEditedStrTransactions: pendingChanges.map(
                    ({ flowOfFundsAmlTransactionId }) =>
                      flowOfFundsAmlTransactionId,
                  ),
                  newManualTransactions: newTransactions.map(
                    ({ flowOfFundsAmlTransactionId }) =>
                      flowOfFundsAmlTransactionId,
                  ),
                  lastUpdated: updatedAt,
                });
              }),
              catchError((error: HttpErrorResponse) => {
                // Handle errors gracefylly
                this.errorHandler.handleError(error);

                // Conflict triggers refresh of local state
                if (error.status === 409) {
                  this.conflict$.next();
                  return this.fetchSessionByAmlId(
                    this._sessionState$.value.amlId,
                  ).pipe(switchMap(() => EMPTY));
                }

                return EMPTY;
              }),
              finalize(() => {
                this.removeIncomingSaves(incomingSaves);
              }),
              shareReplay({ bufferSize: 1, refCount: false }),
            );
          },
        ),
        // Outer catchError as safety net
        catchError((error) => {
          this.errorHandler.handleError(error);

          this.removeIncomingSaves(incomingSaves);

          return EMPTY;
        }),
      );
    }),
    tap(({ editType }) => {
      const messages = {
        SINGLE_EDIT: 'Edit saved!',
        BULK_EDIT: 'Edits saved!',
        HIGHLIGHT: '',
        MANUAL_UPLOAD: '',
      } satisfies Record<typeof editType, string>;

      if (!messages[editType]) return;
      this.snackBar.open(messages[editType], 'Dismiss', {
        duration: 5000,
      });
    }),
    takeUntilDestroyed(this.destroyRef),
    share(),
  );

  /**
   * Remove only the incoming save ids specific to edit emission
   */
  private removeIncomingSaves(incomingSaves: string[]) {
    const remaining = [...this._savingEdits$.value];
    incomingSaves.forEach((id) => {
      const index = remaining.indexOf(id);
      if (index > -1) {
        remaining.splice(index, 1);
      }
    });
    this._savingEdits$.next(remaining);
  }

  saveEditForm(
    edit: ExtractSubjectType<
      typeof SessionStateService.prototype._updateQueue$
    >,
  ) {
    this._updateQueue$.next(edit);
  }

  // highlights
  private highlightEdits$ = new Subject<
    { txnId: string; newColor: string }[]
  >();
  private resetHiglightsAccumulator$ = new Subject<void>();

  saveHighlightEdits(
    highlights: ExtractSubjectType<
      typeof SessionStateService.prototype.highlightEdits$
    >,
  ) {
    this.highlightEdits$.next(highlights);
  }

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
    // accumulate highlights that occur within debounce time
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

  saveManualTransactions(manualTransactions: StrTransactionWithChangeLogs[]) {
    this._updateQueue$.next({ editType: 'MANUAL_UPLOAD', manualTransactions });
  }
}

export interface PendingChange {
  flowOfFundsAmlTransactionId: string;
  pendingChangeLogs: ChangeLogWithoutVersion[];
}

export interface SessionStateLocal {
  amlId: string;
  version: number;
  transactionSearchParams: {
    partyKeysSelection?: string[] | null;
    accountNumbersSelection?: string[] | null;
    sourceSystemsSelection?: string[] | null;
    productTypesSelection?: string[] | null;
    reviewPeriodSelection?: ReviewPeriod[] | null;
  };
  strTransactions: StrTransactionWithChangeLogs[];
  lastEditedStrTransactions?: PendingChange['flowOfFundsAmlTransactionId'][];
  newManualTransactions?: StrTransactionWithChangeLogs['flowOfFundsAmlTransactionId'][];
  lastUpdated?: string;
}

export type StrTransactionWithChangeLogs = WithVersion<StrTransactionData> & {
  changeLogs: ChangeLog[];
};

export interface StrTransactionChangeLogs {
  txnId: string;
  changeLogs: ChangeLog[];
}

export interface GetSessionResponse {
  amlId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  data: {
    transactionSearchParams: {
      partyKeysSelection?: string[] | null;
      accountNumbersSelection?: string[] | null;
      sourceSystemsSelection?: string[] | null;
      productTypesSelection?: string[] | null;
      reviewPeriodSelection?: ReviewPeriod[] | null;
    };
    strTransactions?: StrTransactionWithChangeLogs[];
  };
}

interface CreateSessionRequest {
  amlId: string;
  data: {
    transactionSearchParams: {
      partyKeysSelection?: string[] | null;
      accountNumbersSelection?: string[] | null;
      sourceSystemsSelection?: string[] | null;
      productTypesSelection?: string[] | null;
      reviewPeriodSelection?: ReviewPeriod[] | null;
    };
    strTransactions?: StrTransactionWithChangeLogs[];
  };
}

export interface CreateSessionResponse {
  amlId: string;
  userId: string;
  version: number;
  createdAt: string;
}

interface UpdateSessionRequest {
  currentVersion: number;
  data: {
    transactionSearchParams: {
      partyKeysSelection?: string[] | null;
      accountNumbersSelection?: string[] | null;
      sourceSystemsSelection?: string[] | null;
      productTypesSelection?: string[] | null;
      reviewPeriodSelection?: ReviewPeriod[] | null;
    };
    strTransactions?: StrTransactionWithChangeLogs[];
  };
}

interface UpdateSessionResponse {
  amlId: string;
  newVersion: number;
  updatedAt: string;
}

export interface ReviewPeriod {
  start?: string | null;
  end?: string | null;
}

const computeFullTransactionDataHandler = (
  strTransactions: StrTransactionWithChangeLogs[],
  applyChanges: typeof ChangeLogService.prototype.applyChanges<StrTransactionWithChangeLogs>,
) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    return strTransactions
      .map((strTransaction) => {
        return applyChanges(strTransaction, strTransaction.changeLogs);
      })
      .map(setRowValidationInfo);
  };
};

const computePartialTransactionDataHandler = (
  strTransactions: StrTransactionWithChangeLogs[],
  applyChanges: typeof ChangeLogService.prototype.applyChanges<StrTransactionWithChangeLogs>,
  lastEditedStrTransactions: NonNullable<
    SessionStateLocal['lastEditedStrTransactions']
  >,
  newManualTransactions: NonNullable<
    SessionStateLocal['newManualTransactions']
  >,
) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const partialTransactionData = strTransactions
      .filter(({ flowOfFundsAmlTransactionId }) =>
        lastEditedStrTransactions.includes(flowOfFundsAmlTransactionId),
      )
      .map((strTransaction) => {
        return applyChanges(strTransaction, strTransaction.changeLogs);
      })
      .map(setRowValidationInfo);

    const newTransactions = strTransactions
      .filter(({ flowOfFundsAmlTransactionId }) =>
        newManualTransactions.includes(flowOfFundsAmlTransactionId),
      )
      .map(setRowValidationInfo);

    return [
      ...partialTransactionData,
      ...newTransactions,
      ...acc.filter(
        ({ flowOfFundsAmlTransactionId }) =>
          !lastEditedStrTransactions.includes(flowOfFundsAmlTransactionId),
      ),
    ];
  };
};

export function setRowValidationInfo(
  transaction: StrTransactionWithChangeLogs,
) {
  const errors: _hiddenValidationType[] = [];
  if (
    transaction._version &&
    transaction._version > 0 &&
    !transaction.changeLogs.every((log) => log.path === 'highlightColor')
  )
    errors.push('editedTxn');

  if (transaction.startingActions.some((sa) => hasMissingConductorInfo(sa)))
    errors.push('conductorMissing');

  if (
    transaction.startingActions.some(hasMissingCibcInfo) ||
    transaction.completingActions.some(hasMissingCibcInfo)
  )
    errors.push('bankInfoMissing');

  return { ...transaction, _hiddenValidation: errors };
}

type ExtractSubjectType<T> = T extends Subject<infer U> ? U : never;
