import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import {
  ErrorHandler,
  Injectable,
  InjectionToken,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatSnackBar } from "@angular/material/snack-bar";
import { BehaviorSubject, EMPTY, Subject, map, of, throwError } from "rxjs";
import {
  catchError,
  delay,
  exhaustMap,
  finalize,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from "rxjs/operators";
import {
  ChangeLog,
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "../change-log.service";
import { EditFormValueType } from "../reporting-ui/edit-form/edit-form.component";
import {
  CompletingAction,
  StartingAction,
  StrTransactionData,
  _hiddenValidationType,
} from "../reporting-ui/reporting-ui-table/reporting-ui-table.component";

export const DEFAULT_SESSION_STATE: SessionStateLocal = {
  version: 0,
  amlId: "",
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
  "SESSION_INITIAL_STATE",
  {
    factory: () => DEFAULT_SESSION_STATE,
  },
);

@Injectable()
export class SessionDataService {
  private readonly initialState = inject(SESSION_INITIAL_STATE);
  http = inject(HttpClient);
  errorHandler = inject(ErrorHandler);

  private sessionState = new BehaviorSubject<SessionStateLocal>(
    this.initialState,
  );

  // todo try removing this as allows stale session info to exist
  getSessionStateValue() {
    return this.sessionState.value;
  }

  private readonly sessionState$ = this.sessionState
    .asObservable()
    .pipe(takeUntilDestroyed());

  public conflictSubject = new Subject<void>();
  readonly latestSessionVersion$ = this.sessionState$.pipe(
    map((sessionState) => sessionState?.version),
  );

  readonly lastUpdated$ = this.sessionState$.pipe(
    map((sessionState) => sessionState.lastUpdated!),
    startWith(new Date(0).toISOString().split("T")[0]),
  );

  // highlights
  // private highlightEdits$ = new Subject<EditTabChangeLogsRes[]>();
  // private highlightAccumulatorMap = new Map<
  //   string,
  //   ChangeLogWithoutVersion[]
  // >();

  private savingEditsSubject = new BehaviorSubject<string[]>([]);
  savingEdits$ = this.savingEditsSubject
    .asObservable()
    .pipe(takeUntilDestroyed());
  savingStatus$ = this.savingEdits$.pipe(map((txns) => txns.length > 0));

  private changeLogService = inject(ChangeLogService);

  /**
   * Used to populate reporting ui table
   */
  readonly strTransactionData$ = this.sessionState$.pipe(
    map(
      ({
        strTransactions,
        lastEditedStrTransactions: editedStrTransactions,
      }) => {
        if (editedStrTransactions)
          return computePartialTransactionDataHandler(
            strTransactions,
            (original: StrTransactionWithChangeLogs, changes: ChangeLog[]) =>
              this.changeLogService.applyChanges(original, changes),
            editedStrTransactions,
          );

        return computeFullTransactionDataHandler(
          strTransactions,
          (original: StrTransactionWithChangeLogs, changes: ChangeLog[]) =>
            this.changeLogService.applyChanges(original, changes),
        );
      },
    ),
    scan((acc, handler) => {
      return handler(acc);
    }, [] as StrTransactionWithChangeLogs[]),
    shareReplay({ bufferSize: 1, refCount: false }), // stream never dies in aml component scope
  );

  constructor() {
    // Subscribe immediately to ensure scan accumulates from first emission
    this.strTransactionData$.subscribe();

    /*     this.crossTabEditService.editResponse$
      .pipe(
        withLatestFrom(this.sessionState$),
        switchMap(([recentEdit, sessionStateCurrent]) => {
          if (
            recentEdit?.type !== "EDIT_RESULT" &&
            recentEdit?.type !== "BULK_EDIT_RESULT"
          )
            throw new Error("Expected edit result");

          return this.update(
            sessionStateCurrent.amlId,
            sessionStateCurrent,
            recentEdit!,
          ).pipe(
            catchError((error) => {
              this.errorHandler.handleError(error);

              // Keep stream alive
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe(); */
    // Handle highlight updates: debounce + flush + reset
    /*     this.highlightEdits$
      .pipe(
        tap((nextBatch) => {
          // Manually accumulate into the external Map
          for (const { strTxnId, changeLogs } of nextBatch) {
            const existing = this.highlightAccumulatorMap.get(strTxnId) || [];
            this.highlightAccumulatorMap.set(strTxnId, [
              ...existing,
              ...changeLogs,
            ]);
          }
        }),
        debounceTime(1000),

        filter(() => this.highlightAccumulatorMap.size > 0),

        map(() => {
          const flushedChanges: EditTabChangeLogsRes[] = Array.from(
            this.highlightAccumulatorMap.entries(),
          ).map(([strTxnId, changeLogs]) => ({
            strTxnId,
            changeLogs,
          }));

          this.highlightAccumulatorMap.clear();

          return flushedChanges;
        }),

        concatMap((batchedEdits) =>
          this.sessionState$.pipe(
            take(1),
            switchMap((sessionState) =>
              this.update(sessionState.amlId, sessionState, {
                type: "BULK_EDIT_RESULT",
                payload: batchedEdits,
              }).pipe(
                catchError((error) => {
                  this.errorHandler.handleError(error);

                  // Keep stream alive
                  return EMPTY;
                }),
              ),
            ),
          ),
        ),
      )
      .subscribe(); */
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
          // todo use error handling to display version conflict message
          this.sessionState.next({
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
      .post<CreateSessionResponse>("/api/sessions", {
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

          this.sessionState.next({
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

  // public updateHighlights(
  //   highlightEdit: Extract<
  //     EditFormEditType,
  //     {
  //       type: "BULK_EDIT_RESULT";
  //     }
  //   >,
  // ) {
  //   // this.highlightEdits$.next(highlightEdit.payload);
  // }

  private updateStrTransactions(pendingChanges: EditFormChange[]) {
    const {
      strTransactions = [],
      transactionSearchParams,
      version: currentVersion,
    } = structuredClone(this.getSessionStateValue()!);

    // todo to avoid scenarios where transaction for pending changes does not exist subscribe to the local session state in edit form
    pendingChanges
      .filter((change) => change.pendingChangeLogs.length > 0)
      .forEach(({ flowOfFundsAmlTransactionId, pendingChangeLogs }) => {
        strTransactions
          .find(
            (strTxn) => strTxn._hiddenStrTxnId === flowOfFundsAmlTransactionId,
          )!
          .changeLogs.push(
            ...pendingChangeLogs.map((changeLog) => ({
              ...changeLog,
              version: currentVersion + 1,
            })),
          );
      });

    const payload: UpdateSessionRequest = {
      currentVersion,
      data: { transactionSearchParams, strTransactions },
    };
    this.savingEditsSubject.next(
      pendingChanges.map((change) => change.flowOfFundsAmlTransactionId),
    );

    // return this.http
    //   .put<UpdateSessionResponse>(
    //     `/api/sessions/${this.getSessionStateValue()!.amlId}`,
    //     payload,
    //   )
    return of({
      amlId: "9999",
      newVersion: currentVersion + 1,
      updatedAt: new Date(0).toISOString().split("T")[0],
    }).pipe(
      delay(5000),
      tap(({ newVersion, updatedAt }) => {
        console.assert(newVersion === payload.currentVersion + 1);
        this.sessionState.next({
          amlId: this.getSessionStateValue()!.amlId,
          version: newVersion,
          transactionSearchParams,
          strTransactions,
          lastEditedStrTransactions: pendingChanges.map(
            ({ flowOfFundsAmlTransactionId }) => flowOfFundsAmlTransactionId,
          ),
          lastUpdated: updatedAt,
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // on conflict
        if (error.status === 409) {
          this.conflictSubject.next();
          return this.fetchSessionByAmlId(
            this.getSessionStateValue()!.amlId,
          ).pipe(switchMap(() => throwError(() => error)));
        }

        return throwError(() => error);
      }),
      finalize(() => this.savingEditsSubject.next([])),
      shareReplay({ bufferSize: 0, refCount: false }),
    );
  }

  private snackBar = inject(MatSnackBar);
  editFormSaveSubject = new Subject<
    | {
        editType: "SINGLE_EDIT";
        flowOfFundsAmlTransactionId: string;
        editFormValue: EditFormValueType;
        editFormValueBefore: EditFormValueType;
      }
    | {
        editType: "BULK_EDIT";
        editFormValue: EditFormValueType;
        transactionsBefore: StrTransactionWithChangeLogs[];
      }
  >();

  editFormSave$ = this.editFormSaveSubject.asObservable().pipe(
    takeUntilDestroyed(),
    exhaustMap((saveData) => {
      const { editType, editFormValue } = saveData;
      const pendingChanges: EditFormChange[] = [];
      if (editType === "SINGLE_EDIT") {
        const { editFormValueBefore, flowOfFundsAmlTransactionId } = saveData;
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
      if (editType === "BULK_EDIT") {
        const { transactionsBefore } = saveData;
        transactionsBefore.forEach((transactionBefore) => {
          const changeLogs: ChangeLogWithoutVersion[] = [];
          this.changeLogService.compareProperties(
            transactionBefore,
            editFormValue,
            changeLogs,
            { discriminator: "index" },
          );
          pendingChanges.push({
            flowOfFundsAmlTransactionId:
              transactionBefore.flowOfFundsAmlTransactionId,
            pendingChangeLogs: changeLogs,
          });
        });
      }
      if (
        pendingChanges.every((change) => change.pendingChangeLogs.length === 0)
      ) {
        this.snackBar.open("No changes to save", "Dismiss", {
          duration: 3000,
        });
        return EMPTY;
      }

      return this.updateStrTransactions(pendingChanges).pipe(
        map((response) => ({
          response,
          editType,
        })),
      );
    }),
    tap(() => {
      this.snackBar.open("Edits saved!", "Dismiss", {
        duration: 5000,
      });
    }),
  );
}

export interface EditFormChange {
  flowOfFundsAmlTransactionId: string;
  pendingChangeLogs: ChangeLogWithoutVersion[];
}

export interface EditTabChangeLogsResVersioned {
  strTxnId: string;
  changeLogs: ChangeLog[];
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
  lastEditedStrTransactions?: EditFormChange["flowOfFundsAmlTransactionId"][];
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
      .map(addValidationInfo);
  };
};

const computePartialTransactionDataHandler = (
  strTransactions: StrTransactionWithChangeLogs[],
  applyChanges: typeof ChangeLogService.prototype.applyChanges<StrTransactionWithChangeLogs>,
  editedStrTransactions: NonNullable<
    SessionStateLocal["lastEditedStrTransactions"]
  >,
) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const partialTransactionData = strTransactions
      .filter(({ flowOfFundsAmlTransactionId }) =>
        editedStrTransactions.includes(flowOfFundsAmlTransactionId),
      )
      .map((strTransaction) => {
        return applyChanges(strTransaction, strTransaction.changeLogs);
      });

    return [
      ...partialTransactionData.map(addValidationInfo),
      ...acc.filter(
        ({ flowOfFundsAmlTransactionId }) =>
          !editedStrTransactions.includes(flowOfFundsAmlTransactionId),
      ),
    ];
  };
};

function addValidationInfo(transaction: StrTransactionWithChangeLogs) {
  const errors: _hiddenValidationType[] = [];
  if (
    transaction._version &&
    transaction._version > 0 &&
    !transaction.changeLogs.every((log) => log.path === "highlightColor")
  )
    errors.push("Edited Txn");

  if (transaction.startingActions.some(hasMissingConductors))
    errors.push("Conductor Missing");

  if (
    transaction.startingActions.some(hasMissingCibcInfo) ||
    transaction.completingActions.some(hasMissingCibcInfo)
  )
    errors.push("Bank Info Missing");

  transaction._hiddenValidation = errors;
  return transaction;
}

function hasMissingConductors(sa: StartingAction) {
  if (!sa.wasCondInfoObtained) return false;

  if (sa.conductors!.length === 0) return true;
  if (
    sa.conductors!.some(
      ({ givenName, surname, otherOrInitial, nameOfEntity }) =>
        !givenName && !surname && !otherOrInitial && !nameOfEntity,
    )
  )
    return true;

  return false;
}

function hasMissingCibcInfo(action: StartingAction | CompletingAction) {
  if (action.fiuNo !== "010") return false;

  if (
    !action.branch ||
    !action.account ||
    !action.accountType ||
    (action.accountType === "Other" && !action.accountTypeOther) ||
    !action.accountCurrency ||
    !action.accountStatus ||
    !action.accountOpen ||
    (action.accountStatus === "Closed" && !action.accountClose)
  )
    return true;

  return false;
}
