import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, inject, Injectable } from "@angular/core";
import { BehaviorSubject, Subject, map, of, throwError } from "rxjs";
import {
  catchError,
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
import { StrTransactionData } from "../reporting-ui/reporting-ui-table/reporting-ui-table.component";
import { editedTransactionsDevOnly } from "../transaction-view/transactionSearchResDevOnly";

@Injectable()
export class SessionDataService {
  private sessionState = new BehaviorSubject<SessionStateLocal>({
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
  });

  // todo try removing this as allows stale session info to exist
  getSessionStateValue() {
    return this.sessionState.value;
  }

  private readonly sessionState$ = this.sessionState.asObservable();

  public conflict$ = new Subject<void>();
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

  private savingSubject = new BehaviorSubject<boolean>(false);
  savingStatus$ = this.savingSubject.asObservable();

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
            (original: StrTransactionData, changes: ChangeLog[]) =>
              this.changeLogService.applyChanges(original, changes),
            editedStrTransactions,
          );

        return computeFullTransactionDataHandler(
          strTransactions,
          (original: StrTransactionData, changes: ChangeLog[]) =>
            this.changeLogService.applyChanges(original, changes),
        );
      },
    ),
    scan((acc, handler) => {
      return handler(acc);
    }, [] as StrTransactionData[]),
    shareReplay({ bufferSize: 1, refCount: false }), // Stream never dies
  );

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandler,
  ) {
    // Subscribe immediately to ensure scan accumulates from first emission
    this.strTransactionData$.subscribe();

    this.sessionState.next(sessionStateDevOrTestOnly);

    // this.sessionState.next(sessionStateDevOrTestOnly);
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

  public updateStrTransactions(pendingChanges: EditFormChange[]) {
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
    this.savingSubject.next(true);

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
      tap(({ newVersion, updatedAt }) => {
        console.assert(newVersion === payload.currentVersion + 1);
        this.sessionState.next({
          amlId: this.getSessionStateValue()!.amlId,
          version: newVersion,
          transactionSearchParams,
          strTransactions,
          lastEditedStrTransactions: pendingChanges.map(
            (change) => change.flowOfFundsAmlTransactionId,
          ),
          lastUpdated: updatedAt,
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // on conflict
        if (error.status === 409) {
          this.conflict$.next();
          return this.fetchSessionByAmlId(
            this.getSessionStateValue()!.amlId,
          ).pipe(switchMap(() => throwError(() => error)));
        }

        return throwError(() => error);
      }),
      finalize(() => this.savingSubject.next(false)),
    );
  }
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

export const sessionStateDevOrTestOnly: SessionStateLocal = {
  amlId: "999999",
  version: 0,
  transactionSearchParams: {
    accountNumbersSelection: [],
    partyKeysSelection: [],
    productTypesSelection: [],
    reviewPeriodSelection: [],
    sourceSystemsSelection: [],
  },
  strTransactions: editedTransactionsDevOnly.map((txn) => ({
    ...txn,
    _hiddenTxnType: txn.flowOfFundsSource,
    _hiddenAmlId: "999999",
    _hiddenStrTxnId: txn.flowOfFundsAmlTransactionId,
    _version: 0,
    changeLogs: [],
  })),
  lastUpdated: "1996-06-13",
};

const computeFullTransactionDataHandler = (
  strTransactions: StrTransactionWithChangeLogs[],
  applyChanges: typeof ChangeLogService.prototype.applyChanges<StrTransactionData>,
) => {
  return (acc: StrTransactionData[]) => {
    return strTransactions.map((strTransaction) => {
      return applyChanges(strTransaction, strTransaction.changeLogs);
    });
  };
};

const computePartialTransactionDataHandler = (
  strTransactions: StrTransactionWithChangeLogs[],
  applyChanges: typeof ChangeLogService.prototype.applyChanges<StrTransactionData>,
  editedStrTransactions: NonNullable<
    SessionStateLocal["lastEditedStrTransactions"]
  >,
) => {
  return (acc: StrTransactionData[]) => {
    const partialTransactionData = strTransactions
      .filter(({ flowOfFundsAmlTransactionId }) =>
        editedStrTransactions.includes(flowOfFundsAmlTransactionId),
      )
      .map((strTransaction) => {
        return applyChanges(strTransaction, strTransaction.changeLogs);
      });

    return [
      ...partialTransactionData,
      ...acc.filter(
        ({ flowOfFundsAmlTransactionId }) =>
          !editedStrTransactions.includes(flowOfFundsAmlTransactionId),
      ),
    ];
  };
};
