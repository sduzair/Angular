import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, catchError, map, tap } from "rxjs";
import { ChangeLog } from "./change-log.service";

@Injectable({
  providedIn: "root",
})
export class SessionDataService {
  private sessionData = new BehaviorSubject<SessionData>(null!);
  sessionData$ = this.sessionData.asObservable();
  constructor(private http: HttpClient) {}

  intialize(fingerprint: string) {
    return this.http
      .get<SessionDataResponse>(`/api/sessions/${fingerprint}`)
      .pipe(
        catchError(() => this.createNew(fingerprint)),
        tap((sessionDataResOrNewSessionData) => {
          const sessionData =
            "data" in sessionDataResOrNewSessionData
              ? sessionDataResOrNewSessionData.data
              : sessionDataResOrNewSessionData;
          return this.sessionData.next(sessionData);
        }),
      );
  }

  private createNew(fingerprint: string) {
    const newSession: SessionData = { editedUsers: [] };
    return this.http
      .post("/api/sessions", {
        userId: fingerprint,
        data: newSession,
      })
      .pipe(map(() => newSession));
  }
}

interface SessionDataResponse {
  version: number;
  createdAt: unknown;
  updatedAt: unknown;
  userId: string;
  data: SessionData;
}

export interface SessionData {
  editedUsers: {
    userId: string;
    changeLogs: ChangeLog[];
  }[];
}
