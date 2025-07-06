import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, map, Observable } from "rxjs";
import { ChangeLog, ChangeLogWithoutVersion } from "./change-log.service";
import {
  CrossTabEditService,
  EditTabReqResType,
} from "./cross-tab-edit.service";
import { switchMap, withLatestFrom } from "rxjs/operators";
import { AuthService } from "./fingerprinting.service";

@Injectable({
  providedIn: "root",
})
export class SessionDataService {
  private sessionState = new BehaviorSubject<SessionStateLocal>(null!);
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
          if (
            recentEdit?.type !== "EDIT_RESULT" &&
            recentEdit?.type !== "BULK_EDIT_RESULT"
          )
            throw new Error("Expected edit result");

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
        this.sessionState.next({
          sessionId,
          version: res.version,
          data: res.data,
          editTabResVersioned: null,
        });
        return {
          sessionId,
          version: res.version,
          data: res.data,
          recentEditFromEditForm: null,
        };
      }),
    );
  }

  initialize(fingerprint: string): Observable<SessionStateLocal> {
    const newSession: SessionStateLocal = {
      sessionId: null!,
      version: 0,
      data: { strTxnChangeLogs: [] },
      editTabResVersioned: null,
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
    sessionStateCurrent: SessionStateLocal,
    recentEdit: Extract<
      EditTabReqResType,
      { type: "EDIT_RESULT" | "BULK_EDIT_RESULT" }
    >,
  ): Observable<SessionStateLocal> {
    const { strTxnChangeLogs = [] } = structuredClone(sessionStateCurrent.data);

    let editTabRes: EditTabChangeLogsRes[] = null!;
    if (recentEdit.type === "EDIT_RESULT") editTabRes = [recentEdit.payload];
    if (recentEdit.type === "BULK_EDIT_RESULT") editTabRes = recentEdit.payload;

    const editTabResVersioned: StrTxnChangeLog[] = editTabRes.map(
      ({ strTxnId, changeLogs }) => {
        const changeLogsVersioned = changeLogs.map((changeLog) => ({
          ...changeLog,
          version: sessionStateCurrent.version + 1,
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
      },
    );

    const payload: UpdateSessionRequest = {
      currentVersion: sessionStateCurrent.version,
      data: { strTxnChangeLogs },
    };
    return this.http
      .put<UpdateSessionResponse>(`/api/sessions/${sessionId}`, payload)
      .pipe(
        map((res) => {
          console.assert(res.newVersion === payload.currentVersion + 1);
          const newSessionState: SessionStateLocal = {
            sessionId,
            version: res.newVersion,
            data: { strTxnChangeLogs },
            editTabResVersioned: editTabResVersioned,
          };
          this.sessionState.next(newSessionState);
          return newSessionState;
        }),
      );
  }
}

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
  editTabResVersioned: StrTxnChangeLog[] | null;
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
