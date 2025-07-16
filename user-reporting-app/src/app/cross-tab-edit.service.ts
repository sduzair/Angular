import { Injectable } from "@angular/core";
import { WithVersion } from "./change-log.service";
import { filter, map } from "rxjs/operators";
import { fromEvent, Observable, Subject } from "rxjs";
import { EditTabChangeLogsRes } from "./session-data.service";
import { StrTxn } from "./table/table.component";

@Injectable({
  providedIn: "root",
})
export class CrossTabEditService {
  private editResponseSubject = new Subject<EditTabReqResType | null>();
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
          const editSession = JSON.parse(ev.newValue!) as EditTabReqResType;
          return { editSession, key: ev.key! };
        }),
        filter(
          ({ editSession }) =>
            !!editSession &&
            (editSession.type === "EDIT_RESULT" ||
              editSession.type === "BULK_EDIT_RESULT"),
        ),
      )
      .subscribe(({ editSession, key }) => {
        this.editResponseSubject.next(editSession);
        localStorage.removeItem(key);
      });
  }

  getEditRequestBySessionId(
    sessionId: string,
  ): Observable<
    Extract<EditTabReqResType, { type: "EDIT_REQUEST" | "BULK_EDIT_REQUEST" }>
  > {
    return fromEvent(window, "DOMContentLoaded").pipe(
      map(() => {
        const payload = JSON.parse(
          localStorage.getItem(sessionId)!,
        ) as EditTabReqResType;
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

    let payload: EditTabReqResType | null = null;
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
    payload: EditTabReqResType,
  ) {
    localStorage.setItem(sessionId, JSON.stringify(payload));
    // window.close();
  }
}

export type EditTabReqResType =
  | {
      type: "EDIT_REQUEST";
      payload: WithVersion<StrTxn>;
    }
  | {
      type: "EDIT_RESULT";
      payload: EditTabChangeLogsRes;
    }
  | {
      type: "BULK_EDIT_REQUEST";
      payload: WithVersion<StrTxn>[];
    }
  | {
      type: "BULK_EDIT_RESULT";
      payload: EditTabChangeLogsRes[];
    };
