import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable } from "@angular/core";
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  map,
  throwError,
} from "rxjs";
import { catchError, finalize, startWith, switchMap } from "rxjs/operators";
import {
  ChangeLog,
  ChangeLogWithoutVersion,
  WithVersion,
} from "./change-log.service";
import { EditFormEditType } from "./reporting-ui/edit-form/edit-form.component";
import { StrTxnWithHiddenProps } from "./reporting-ui/reporting-ui-table/reporting-ui-table.component";
import { editedTransactionsDevOnly } from "./transaction-view/transactionSearchResDevOnly";

@Injectable()
export class SessionDataService {
  private sessionState = new BehaviorSubject<SessionStateLocal | null>(null);
  getSessionStateValue() {
    return this.sessionState.value;
  }
  readonly sessionState$ = this.sessionState.asObservable();
  public conflict$ = new Subject<void>();
  readonly latestSessionVersion$ = this.sessionState$.pipe(
    map((sessionState) => sessionState?.version),
  );

  readonly lastUpdated$ = this.sessionState$.pipe(
    map((sessionState) => sessionState?.lastUpdated!),
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

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandler,
  ) {
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

  fetchSessionByAmlId(amlId: string): Observable<SessionStateLocal> {
    return this.http.get<GetSessionResponse>(`/api/sessions/${amlId}`).pipe(
      map(
        ({
          amlId,
          version,
          data: { transactionSearchParams, strTransactionsEdited = [] },
          updatedAt,
        }) => {
          // todo use error handling to display version conflict message
          this.sessionState.next({
            amlId: amlId,
            version,
            transactionSearchParams,
            strTransactionsEdited,
            lastUpdated: updatedAt,
          });
          return {
            amlId: amlId,
            version,
            transactionSearchParams,
            strTransactionsEdited,
            lastUpdated: updatedAt,
          };
        },
      ),
    );
  }

  createSession(amlId: string): Observable<SessionStateLocal> {
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
        map((res) => {
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
            strTransactionsEdited: [],
          });
          return {
            version: 0,
            amlId,
            transactionSearchParams: {
              accountNumbersSelection: [],
              partyKeysSelection: [],
              productTypesSelection: [],
              reviewPeriodSelection: [],
              sourceSystemsSelection: [],
            },
            strTransactionsEdited: [],
          };
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

  private update(
    amlId: string,
    sessionStateCurrent: SessionStateLocal,
    changeLogs: EditTabChangeLogsRes[],
  ) {
    const {
      strTransactionsEdited = [],
      transactionSearchParams,
      version: currentVersion,
    } = structuredClone(sessionStateCurrent);

    const editTabPartialChangeLogsResponse: StrTxnChangeLogs[] = changeLogs
      .filter((txnChangeLog) => txnChangeLog.changeLogs.length > 0)
      .map(({ strTxnId, changeLogs }) => {
        const changeLogsVersioned = changeLogs.map((changeLog) => ({
          ...changeLog,
          version: currentVersion + 1,
        }));

        const txn = strTransactionsEdited?.find(
          (strTxn) => strTxn._hiddenStrTxnId === strTxnId,
        )!;

        console.assert(!!txn, "Assert transaction selected");

        txn.changeLogs.push(...changeLogsVersioned);

        return { strTxnId, changeLogs: changeLogsVersioned };
      });

    if (editTabPartialChangeLogsResponse.length === 0) {
      console.debug("Skipping update: no versioned edits present.");
      return EMPTY;
    }

    const payload: UpdateSessionRequest = {
      currentVersion,
      data: { transactionSearchParams, strTransactionsEdited },
    };
    this.savingSubject.next(true);
    return this.http
      .put<UpdateSessionResponse>(`/api/sessions/${amlId}`, payload)
      .pipe(
        map(({ newVersion, updatedAt }) => {
          console.assert(newVersion === payload.currentVersion + 1);
          this.sessionState.next({
            amlId,
            version: newVersion,
            transactionSearchParams,
            strTransactionsEdited,
            editTabPartialChangeLogsResponse,
            lastUpdated: updatedAt,
          });
          return {
            amlId,
            version: newVersion,
            strTransactionsEdited,
            editTabPartialChangeLogsResponse,
            lastUpdated: updatedAt,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          // rollback local session state on error
          this.sessionState.next(sessionStateCurrent);

          // on conflict
          if (error.status === 409) {
            this.conflict$.next();
            return this.fetchSessionByAmlId(amlId).pipe(
              switchMap(() => throwError(() => error)),
            );
          }

          return throwError(() => error);
        }),
        finalize(() => this.savingSubject.next(false)),
      );
  }
}

type RecentEditType = Extract<
  EditFormEditType,
  {
    type: "EDIT_RESULT" | "BULK_EDIT_RESULT";
  }
>;

export interface EditTabChangeLogsRes {
  strTxnId: string;
  changeLogs: ChangeLogWithoutVersion[];
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
  strTransactionsEdited: StrTxnEdited[];
  editTabPartialChangeLogsResponse?: StrTxnChangeLogs[] | null;
  lastUpdated?: string;
}

export type StrTxnEdited = WithVersion<StrTxnWithHiddenProps> & {
  changeLogs: ChangeLog[];
};

export interface StrTxnChangeLogs {
  strTxnId: string;
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
    strTransactionsEdited?: StrTxnEdited[];
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
    strTransactionsEdited?: StrTxnEdited[];
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
    strTransactionsEdited?: StrTxnEdited[];
  };
}

interface UpdateSessionResponse {
  sessionId: string;
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
  strTransactionsEdited: editedTransactionsDevOnly.map((txn) => ({
    ...txn,
    _hiddenTxnType: txn.flowOfFundsSource,
    _hiddenAmlId: "999999",
    _hiddenStrTxnId: txn.flowOfFundsAmlTransactionId,
    _version: 0,
    changeLogs: [],
  })),
  lastUpdated: "1996-06-13",
};
