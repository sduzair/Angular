import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import {
  ChangeLogWithoutVersion,
  UserWithVersion,
} from "./change-log.service";
import { filter, map } from "rxjs/operators";
import { fromEvent, Observable } from "rxjs";
import { UserChangeLog } from "./session-data.service";

@Injectable({
  providedIn: "root",
})
export class CrossTabEditService {
  private editResponseSubject = new BehaviorSubject<Extract<
    EditSession,
    { type: "EDIT_RESULT" }
  > | null>(null);
  editResponse$ = this.editResponseSubject.asObservable();

  constructor() {
    this.initStorageListenerForEditResponse();
  }

  private initStorageListenerForEditResponse() {
    fromEvent<StorageEvent>(window, "storage")
      .pipe(
        filter(
          (ev) =>
            !!ev.key && ev.key.startsWith("edit-session") && !!ev.newValue,
        ),
        map((ev) => {
          const editSession = JSON.parse(ev.newValue!) as EditSession;
          return { editSession, key: ev.key! };
        }),
        filter(
          ({ editSession }) =>
            !!editSession && editSession.type === "EDIT_RESULT",
        ),
      )
      .subscribe(({ editSession, key }) => {
        this.editResponseSubject.next(editSession as any);
        localStorage.removeItem(key);
      });
  }

  getEditRequestBySessionId(
    sessionId: string,
  ): Observable<Extract<EditSession, { type: "EDIT_REQUEST" }>> {
    return fromEvent(window, "DOMContentLoaded").pipe(
      map(() => {
        const payload = JSON.parse(
          localStorage.getItem(sessionId)!,
        ) as EditSession;
        return payload;
      }),
    ) as any;
  }

  openEditFormTab(userWithVersion: UserWithVersion) {
    const sessionId = `edit-session-${Date.now()}`;

    const payload: EditSession = {
      type: "EDIT_REQUEST",
      payload: structuredClone(userWithVersion),
    };

    localStorage.setItem(sessionId, JSON.stringify(payload));

    return window.open(`edit-form/${sessionId}`, "editTab");
  }

  saveEditResponseToLocalStorage(
    sessionId: string,
    userId: string,
    changeLogs: ChangeLogWithoutVersion[],
  ) {
    const payload: EditSession = {
      type: "EDIT_RESULT",
      payload: { userId, changeLogs },
    };
    localStorage.setItem(sessionId, JSON.stringify(payload));
    // window.close();
  }
}

export type EditSession =
  | {
      type: "EDIT_REQUEST";
      payload: UserWithVersion;
    }
  | {
      type: "EDIT_RESULT";
      payload: Omit<UserChangeLog, "changeLogs"> & {
        changeLogs: ChangeLogWithoutVersion[];
      };
    };
