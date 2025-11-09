import { Injectable } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BehaviorSubject, Subject, interval, of } from "rxjs";
import { map, takeWhile } from "rxjs/operators";
import { EditFormEditType } from "./reporting-ui/edit-form/edit-form.component";

@Injectable({
  providedIn: "root",
})
export class CrossTabEditService {
  private editResponseSubject = new Subject<EditFormEditType | null>();
  editResponse$ = this.editResponseSubject.asObservable();

  private initStorageListenerForEditResponse() {
    throw new Error("not impolemented");
    // fromEvent<StorageEvent>(window, "storage")
    //   .pipe(
    //     filter(
    //       (ev) =>
    //         !!ev.key && ev.key.startsWith("edit-session") && !!ev.newValue,
    //     ),
    //     map((ev) => {
    //       const editSession = JSON.parse(ev.newValue!) as EditFormEditType;
    //       return { editSession, key: ev.key! };
    //     }),
    //     filter(
    //       ({ editSession }) =>
    //         !!editSession &&
    //         (editSession.type === "EDIT_RESULT" ||
    //           editSession.type === "BULK_EDIT_RESULT"),
    //     ),
    //   )
    //   .subscribe(({ editSession, key }) => {
    //     this.editResponseSubject.next(editSession);
    //     localStorage.removeItem(key);
    //   });
  }

  getEditRequestById(requestId: string) {
    // note domcontentloaded has already been fired in lazily loaded view
    // return fromEvent(window, "DOMContentLoaded").pipe(
    return of(null).pipe(
      map(() => {
        const payload = JSON.parse(
          localStorage.getItem(requestId)!,
        ) as EditFormEditType;
        return { requestId: requestId, ...payload };
      }),
    );
  }

  isSingleOrBulkEditTabOpen$ = new BehaviorSubject(false);
  private monitorEditTabOpenStatus({ tabWindow }: { tabWindow: WindowProxy }) {
    this.isSingleOrBulkEditTabOpen$.next(true);
    interval(500)
      .pipe(
        takeWhile(() => !!tabWindow && !tabWindow.closed),
        takeUntilDestroyed(),
      )
      .subscribe({
        complete: () => {
          this.isSingleOrBulkEditTabOpen$.next(false);
        },
      });
  }

  private editFormTab: WindowProxy | null = null;
  // openEditFormTab(
  //   req:
  //     | { strTxn: StrTxnEdited; editType: "EDIT_REQUEST" }
  //     | {
  //         strTxns: StrTxnEdited[];
  //         editType: "BULK_EDIT_REQUEST";
  //       }
  //     | {
  //         strTxn: StrTxnEdited;
  //         editType: "AUDIT_REQUEST";
  //       },
  // ) {
  //   const requestId = `edit-request-${Date.now()}`;

  //   let payload: EditFormEditType | null = null;
  //   if (req.editType === "EDIT_REQUEST") {
  //     payload = {
  //       type: req.editType,
  //       payload: req.strTxn,
  //     };
  //   }
  //   if (req.editType === "BULK_EDIT_REQUEST") {
  //     payload = { type: req.editType, payload: req.strTxns };
  //   }
  //   if (req.editType === "AUDIT_REQUEST") {
  //     payload = {
  //       type: req.editType,
  //       payload: req.strTxn,
  //     };
  //   }

  //   console.assert(payload != null);

  //   localStorage.setItem(requestId, JSON.stringify(payload!));
  //   this.editFormTab = window.open(`edit-form/${requestId}`, "editTab");
  //   this.monitorEditTabOpenStatus({ tabWindow: this.editFormTab! });
  // }

  saveEditResponseToLocalStorage(sessionId: string, payload: EditFormEditType) {
    localStorage.setItem(sessionId, JSON.stringify(payload));
    // window.close();
  }
}
