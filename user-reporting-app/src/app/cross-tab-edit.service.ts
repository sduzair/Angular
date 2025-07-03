import { Injectable } from "@angular/core";
import { ChangeLogWithoutVersion, WithVersion } from "./change-log.service";
import { filter, map } from "rxjs/operators";
import { fromEvent, Observable, Subject } from "rxjs";
import { StrTxnChangeLog } from "./session-data.service";
import { StrTxn } from "./table/table.component";

@Injectable({
  providedIn: "root",
})
export class CrossTabEditService {
  private editResponseSubject = new Subject<Extract<
    EditSession,
    { type: "EDIT_RESULT" }
  > | null>();
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
  ): Observable<
    Extract<EditSession, { type: "EDIT_REQUEST" | "BULK_EDIT_REQUEST" }>
  > {
    return fromEvent(window, "DOMContentLoaded").pipe(
      map(() => {
        const payload = JSON.parse(
          localStorage.getItem(sessionId)!,
        ) as EditSession;
        return payload;
      }),
    ) as any;
  }

  openEditFormTab(
    req:
      | { strTxn: WithVersion<StrTxn>; editType: "EDIT_REQUEST" }
      | { strTxns: WithVersion<StrTxn>[]; editType: "BULK_EDIT_REQUEST" },
  ) {
    const sessionId = `edit-session-${Date.now()}`;

    let payload: EditSession | null = null;
    if (req.editType === "EDIT_REQUEST") {
      payload = {
        type: req.editType,
        payload: req.strTxn,
      };
    }
    if (req.editType === "BULK_EDIT_REQUEST") {
      payload = { type: req.editType, payload: req.strTxns };
    }

    console.assert(payload != null);

    localStorage.setItem(sessionId, JSON.stringify(payload!));
    return window.open(`edit-form/${sessionId}`, "editTab");
  }

  saveEditResponseToLocalStorage(
    sessionId: string,
    strTxnId: string,
    changeLogs: ChangeLogWithoutVersion[],
  ) {
    const payload: EditSession = {
      type: "EDIT_RESULT",
      payload: { strTxnId, changeLogs },
    };
    localStorage.setItem(sessionId, JSON.stringify(payload));
    // window.close();
  }
}

export type EditSession =
  | {
      type: "EDIT_REQUEST";
      payload: WithVersion<StrTxn>;
    }
  | {
      type: "EDIT_RESULT";
      payload: Omit<StrTxnChangeLog, "changeLogs"> & {
        changeLogs: ChangeLogWithoutVersion[];
      };
    }
  | {
      type: "BULK_EDIT_REQUEST";
      payload: WithVersion<StrTxn>[];
    };
