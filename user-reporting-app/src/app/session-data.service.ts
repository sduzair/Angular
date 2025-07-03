import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, catchError, map, Observable, Subject } from "rxjs";
import { ChangeLog } from "./change-log.service";
import { CrossTabEditService, EditSession } from "./cross-tab-edit.service";
import { switchMap, tap, withLatestFrom } from "rxjs/operators";
import { AuthService } from "./fingerprinting.service";

@Injectable({
  providedIn: "root",
})
export class SessionDataService {
  private sessionState = new BehaviorSubject<SessionState>(null!);
  sessionState$ = this.sessionState.asObservable();
  latestSessionVersion$ = this.sessionState$.pipe(
    map((sessionState) => sessionState?.version),
  );

  constructor(
    private http: HttpClient,
    private crossTabEditService: CrossTabEditService,
    private authService: AuthService,
  ) {
    this.crossTabEditService.editResponse$
      .pipe(
        withLatestFrom(this.sessionState$),
        switchMap(([recentEdit, sessionStateCurrent]) => {
          return this.update(
            sessionStateCurrent.sessionId,
            sessionStateCurrent,
            recentEdit!,
          );
        }),
      )
      .subscribe();
  }

  fetchSession(sessionId: string) {
    return this.http.get<GetSessionResponse>(`/api/sessions/${sessionId}`).pipe(
      map((res) => {
        const remoteSess = {
          sessionId,
          version: res.version,
          data: res.data,
          recentEditFromEditForm: null,
        };
        this.sessionState.next(remoteSess);
        return remoteSess;
      }),
    );
  }

  initialize(fingerprint: string): Observable<SessionState> {
    const newSession: SessionState = {
      sessionId: null!,
      version: 0,
      data: { editedStrTxns: [] },
      recentEditFromEditForm: null,
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

  private update(
    sessionId: string,
    sessionStateCurrent: SessionState,
    recentEdit: Extract<EditSession, { type: "EDIT_RESULT" }>,
  ): Observable<SessionState> {
    const newSessionData = structuredClone(sessionStateCurrent.data);
    const txn = newSessionData.editedStrTxns?.find(
      (user) => user.strTxnId === recentEdit?.payload.strTxnId,
    );

    const changeLogsVersioned = recentEdit!.payload.changeLogs.map(
      (changeLog) => ({
        ...changeLog,
        version: sessionStateCurrent.version + 1,
      }),
    );

    if (!txn) {
      if (!newSessionData.editedStrTxns) newSessionData.editedStrTxns = [];
      newSessionData.editedStrTxns.push({
        strTxnId: recentEdit!.payload.strTxnId,
        changeLogs: changeLogsVersioned,
      });
    } else {
      txn.changeLogs.push(...changeLogsVersioned);
    }

    const payload: UpdateSessionRequest = {
      currentVersion: sessionStateCurrent.version,
      data: newSessionData,
    };
    return this.http
      .put<UpdateSessionResponse>(`/api/sessions/${sessionId}`, payload)
      .pipe(
        map((res) => {
          console.assert(res.newVersion === payload.currentVersion + 1);
          const newSessionState: SessionState = {
            sessionId,
            version: res.newVersion,
            data: newSessionData,
            recentEditFromEditForm: {
              strTxnId: recentEdit!.payload.strTxnId,
              changeLogs: changeLogsVersioned,
            },
          };
          this.sessionState.next(newSessionState);
          return newSessionState;
        }),
      );
  }
}

export interface SessionState {
  sessionId: string;
  version: number;
  data: SessionData;
  recentEditFromEditForm: StrTxnChangeLog | null;
}

export interface SessionData {
  editedStrTxns?: StrTxnChangeLog[];
}

export interface StrTxnChangeLog {
  strTxnId: string;
  changeLogs: ChangeLog[];
}

interface GetSessionResponse {
  version: number;
  createdAt: unknown;
  updatedAt: unknown;
  userId: string;
  data: SessionData;
}

interface CreateSessionRequest {
  userId: string;
  data: SessionData;
}

interface CreateSessionResponse {
  sessionId: string;
  userId: string;
  version: number;
  createdAt: string;
}

interface UpdateSessionRequest {
  currentVersion: number;
  data: SessionData;
}

interface UpdateSessionResponse {
  sessionId: string;
  newVersion: number;
  updatedAt: string;
}
