import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable } from "@angular/core";
import {
  BehaviorSubject,
  EMPTY,
  map,
  Observable,
  Subject,
  throwError,
} from "rxjs";
import { ChangeLog, ChangeLogWithoutVersion } from "./change-log.service";
import {
  CrossTabEditService,
  EditTabReqResType,
} from "./cross-tab-edit.service";
import {
  catchError,
  concatMap,
  debounceTime,
  filter,
  finalize,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class SessionDataService {
  private sessionState = new BehaviorSubject<SessionStateLocal>(null!);
  sessionState$ = this.sessionState.asObservable();
  public conflict$ = new Subject<void>();
  latestSessionVersion$ = this.sessionState$.pipe(
    map((sessionState) => sessionState?.version),
  );

  // highligts
  private highlightEdits$ = new Subject<EditTabChangeLogsRes[]>();
  private highlightAccumulatorMap = new Map<
    string,
    ChangeLogWithoutVersion[]
  >();

  public savingSubject = new BehaviorSubject<boolean>(false);
  saving$ = this.savingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private crossTabEditService: CrossTabEditService,
    private errorHandler: ErrorHandler,
  ) {
    this.crossTabEditService.editResponse$
      .pipe(
        withLatestFrom(this.sessionState$),
        switchMap(([recentEdit, sessionStateCurrent]) => {
          if (
            recentEdit?.type !== "EDIT_RESULT" &&
            recentEdit?.type !== "BULK_EDIT_RESULT"
          )
            throw new Error("Expected edit result");

          return this.update(
            sessionStateCurrent.sessionId,
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
      .subscribe();

    // Handle highlight updates: debounce + flush + reset
    this.highlightEdits$
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
              this.update(sessionState.sessionId, sessionState, {
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
      .subscribe();
  }

  fetchSession(sessionId: string) {
    return this.http.get<GetSessionResponse>(`/api/sessions/${sessionId}`).pipe(
      map(({ version, data, updatedAt }) => {
        // todo use error handling to display version conflict message
        this.sessionState.next({
          sessionId,
          version,
          data,
          lastUpdated: updatedAt,
        });
        return {
          sessionId,
          version: version,
          data: data,
        };
      }),
    );
  }

  initialize(fingerprint: string): Observable<SessionStateLocal> {
    const newSession: SessionStateLocal = {
      sessionId: null!,
      version: 0,
      data: { strTxnChangeLogs: [] },
    };
    const payload: CreateSessionRequest = {
      userId: fingerprint,
      data: newSession.data,
    };
    return this.http.post<CreateSessionResponse>("/api/sessions", payload).pipe(
      map((res) => {
        console.assert(res.version === newSession.version);
        newSession.sessionId = res.sessionId;
        this.sessionState.next(newSession);
        return newSession;
      }),
    );
  }

  public updateHighlights(
    highlightEdit: Extract<
      EditTabReqResType,
      {
        type: "BULK_EDIT_RESULT";
      }
    >,
  ) {
    this.highlightEdits$.next(highlightEdit.payload);
  }

  private update(
    sessionId: string,
    sessionStateCurrent: SessionStateLocal,
    recentEdit: RecentEditType,
  ) {
    const {
      data: { strTxnChangeLogs = [] },
      version: currentVersion,
    } = structuredClone(sessionStateCurrent);

    let editTabRes: EditTabChangeLogsRes[] = null!;
    if (recentEdit.type === "EDIT_RESULT") editTabRes = [recentEdit.payload];
    if (recentEdit.type === "BULK_EDIT_RESULT") editTabRes = recentEdit.payload;

    const editTabPartialChangeLogsResponse: StrTxnChangeLog[] = editTabRes
      .filter((txnChangeLog) => txnChangeLog.changeLogs.length > 0)
      .map(({ strTxnId, changeLogs }) => {
        const changeLogsVersioned = changeLogs.map((changeLog) => ({
          ...changeLog,
          version: currentVersion + 1,
        }));

        const txn = strTxnChangeLogs?.find(
          (strTxn) => strTxn.strTxnId === strTxnId,
        );

        if (!txn) {
          strTxnChangeLogs.push({
            strTxnId: strTxnId,
            changeLogs: changeLogsVersioned,
          });
        } else {
          txn.changeLogs.push(...changeLogsVersioned);
        }

        return { strTxnId, changeLogs: changeLogsVersioned };
      });

    if (editTabPartialChangeLogsResponse.length === 0) {
      console.debug("Skipping update: no versioned edits present.");
      return EMPTY;
    }

    const payload: UpdateSessionRequest = {
      currentVersion,
      data: { strTxnChangeLogs },
    };
    this.savingSubject.next(true);
    return this.http
      .put<UpdateSessionResponse>(`/api/sessions/${sessionId}`, payload)
      .pipe(
        map(({ newVersion, updatedAt }) => {
          console.assert(newVersion === payload.currentVersion + 1);
          const newSessionState: SessionStateLocal = {
            sessionId,
            version: newVersion,
            data: { strTxnChangeLogs },
            editTabPartialChangeLogsResponse,
            lastUpdated: updatedAt,
          };
          this.sessionState.next(newSessionState);
          return newSessionState;
        }),
        catchError((error: HttpErrorResponse) => {
          // rollback local session state on error
          this.sessionState.next(sessionStateCurrent);

          // on conflict
          if (error.status === 409) {
            this.conflict$.next();
            return this.fetchSession(sessionId).pipe(
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
  EditTabReqResType,
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
  sessionId: string;
  version: number;
  data: {
    strTxnChangeLogs?: StrTxnChangeLog[];
  };
  editTabPartialChangeLogsResponse?: StrTxnChangeLog[] | null;
  lastUpdated?: string;
}

export interface StrTxnChangeLog {
  strTxnId: string;
  changeLogs: ChangeLog[];
}

interface GetSessionResponse {
  version: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  data: {
    strTxnChangeLogs?: StrTxnChangeLog[];
  };
}

interface CreateSessionRequest {
  userId: string;
  data: {
    strTxnChangeLogs?: StrTxnChangeLog[];
  };
}

interface CreateSessionResponse {
  sessionId: string;
  userId: string;
  version: number;
  createdAt: string;
}

interface UpdateSessionRequest {
  currentVersion: number;
  data: {
    strTxnChangeLogs?: StrTxnChangeLog[];
  };
}

interface UpdateSessionResponse {
  sessionId: string;
  newVersion: number;
  updatedAt: string;
}
