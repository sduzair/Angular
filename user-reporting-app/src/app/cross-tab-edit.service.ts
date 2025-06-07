import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { ChangeLog, UserWithVersion } from "./change-log.service";

@Injectable({
  providedIn: "root",
})
export class CrossTabEditService {
  private readonly EDIT_SESSION_KEY = "user-edit-session";
  private editSessionSubject = new BehaviorSubject<EditSession | null>(
    this.getEditSession(),
  );
  editSession$ = this.editSessionSubject.asObservable();

  constructor() {
    this.initStorageListener();
  }

  private initStorageListener() {
    window.addEventListener("storage", (ev) => {
      if (ev.key !== this.EDIT_SESSION_KEY || !ev.newValue) return;
      const editSession = JSON.parse(ev.newValue) as EditSession;
      if (!editSession) return;
      this.editSessionSubject.next(editSession);
    });
  }

  initializeEditSession(userWithVersion: UserWithVersion) {
    const newEditSession: EditSession = {
      userBefore: structuredClone(userWithVersion),
    };

    localStorage.setItem(this.EDIT_SESSION_KEY, JSON.stringify(newEditSession));
  }

  private getEditSession() {
    const session: EditSession | null = JSON.parse(
      localStorage.getItem(this.EDIT_SESSION_KEY) as string,
    );
    return session;
  }

  // saveChangesToEditSession(changes: ChangeLog[]) {
  //   const currentEditSession = this.editSessionSubject.value;
  //   if (!currentEditSession) throw new Error("No active session");

  //   const updatedSession: EditSession = {
  //     ...currentEditSession,
  //     changeLogs: changes,
  //   };

  //   localStorage.setItem(this.EDIT_SESSION_KEY, JSON.stringify(updatedSession));
  //   this.editSessionSubject.next(updatedSession);
  // }
}

export interface EditSession {
  userBefore: UserWithVersion;
}
