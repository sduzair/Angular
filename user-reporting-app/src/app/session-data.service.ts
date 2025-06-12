import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, catchError, map, Observable, Subject } from "rxjs";
import { ChangeLog } from "./change-log.service";
import { CrossTabEditService, EditSession } from "./cross-tab-edit.service";
import { switchMap, tap, withLatestFrom } from "rxjs/operators";
import { FingerprintingService } from "./fingerprinting.service";

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
    private fingerprintingService: FingerprintingService,
  ) {
    this.crossTabEditService.editResponse$
      .pipe(
        withLatestFrom(
          this.sessionState$,
          this.fingerprintingService.browserFingerPrint$,
        ),
        switchMap(([recentEdit, sessionStateCurrent, fingerprintId]) => {
          return this.update(fingerprintId, sessionStateCurrent, recentEdit!);
        }),
      )
      .subscribe();
  }

  intialize(fingerprint: string) {
    return this.http
      .get<GetSessionResponse>(`/api/sessions/${fingerprint}`)
      .pipe(
        tap((res) => {
          this.sessionState.next({
            version: res.version,
            data: res.data,
            recentEdit: null,
          });
        }),
        catchError(() => this.createNew(fingerprint)),
      );
  }

  private createNew(fingerprint: string): Observable<SessionState> {
    const newSession: SessionState = {
      version: 0,
      data: { editedUsers: [] },
      recentEdit: null,
    };
    const payload: CreateSessionRequest = {
      userId: fingerprint,
      data: newSession.data,
    };
    return this.http.post<CreateSessionResponse>("/api/sessions", payload).pipe(
      map((res) => {
        console.assert(res.version === newSession.version);
        this.sessionState.next(newSession);
        return newSession;
      }),
    );
  }

  private update(
    userId: string,
    sessionStateCurrent: SessionState,
    recentEdit: Extract<EditSession, { type: "EDIT_RESULT" }>,
  ): Observable<SessionState> {
    const newSessionData = structuredClone(sessionStateCurrent.data);
    const user = newSessionData.editedUsers.find(
      (user) => user.userId === recentEdit?.payload.userId,
    );

    const changeLogsVersioned = recentEdit!.payload.changeLogs.map(
      (changeLog) => ({
        ...changeLog,
        version: sessionStateCurrent.version + 1,
      }),
    );

    if (!user) {
      newSessionData.editedUsers.push({
        userId: recentEdit!.payload.userId,
        changeLogs: changeLogsVersioned,
      });
    } else {
      user.changeLogs.push(...changeLogsVersioned);
    }

    const payload: UpdateSessionRequest = {
      currentVersion: sessionStateCurrent.version,
      data: newSessionData,
    };
    return this.http
      .put<UpdateSessionResponse>(`/api/sessions/${userId}`, payload)
      .pipe(
        map((res) => {
          console.assert(res.newVersion === payload.currentVersion + 1);
          const newSessionState = {
            version: res.newVersion,
            data: newSessionData,
            recentEdit: {
              userId: recentEdit!.payload.userId,
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
  version: number;
  data: SessionData;
  recentEdit: UserChangeLog | null;
}

export interface SessionData {
  editedUsers: UserChangeLog[];
}

export interface UserChangeLog {
  userId: string;
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
  userId: string;
  version: number;
  createdAt: string;
}

interface UpdateSessionRequest {
  currentVersion: number;
  data: SessionData;
}

interface UpdateSessionResponse {
  userId: string;
  newVersion: number;
  updatedAt: string;
}
