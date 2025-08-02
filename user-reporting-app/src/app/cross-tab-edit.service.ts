import { Injectable } from "@angular/core";
import { ChangeLog, WithVersion } from "./change-log.service";
import { filter, map } from "rxjs/operators";
import { fromEvent, Subject } from "rxjs";
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

  getEditRequestBySessionId(sessionId: string) {
    return fromEvent(window, "DOMContentLoaded").pipe(
      map(() => {
        const payload = JSON.parse(
          localStorage.getItem(sessionId)!,
        ) as EditTabReqResType;
        return { sessionId, ...payload };
      }),
    );
  }

  openEditFormTab(
    req:
      | { strTxn: WithVersion<StrTxn>; editType: "EDIT_REQUEST" }
      | { strTxns: WithVersion<StrTxn>[]; editType: "BULK_EDIT_REQUEST" }
      | {
          auditTxnv0WithVersion: WithVersion<StrTxn>;
          auditTxnChangeLogs: ChangeLog[];
          editType: "AUDIT_REQUEST";
        },
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
    if (req.editType === "AUDIT_REQUEST") {
      payload = {
        type: req.editType,
        payload: {
          auditTxnv0WithVersion: req.auditTxnv0WithVersion,
          auditTxnChangeLogs: req.auditTxnChangeLogs,
        },
      };
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
    }
  | {
      type: "AUDIT_REQUEST";
      payload: AuditRequestPayload;
    };

export type EditTabReqResTypeLiterals = EditTabReqResType extends {
  type: infer U;
}
  ? U
  : never;

export type AuditRequestPayload = {
  auditTxnv0WithVersion: WithVersion<StrTxn>;
  auditTxnChangeLogs: ChangeLog[];
};
