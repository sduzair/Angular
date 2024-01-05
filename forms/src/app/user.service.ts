import { Injectable } from "@angular/core";
import { Observable, delay, of } from "rxjs";
import { Roles } from "./change-detection-reactive";

@Injectable({
  providedIn: 'root',
})
export class UserService {
  isUserNameTaken(name: string): Observable<boolean> {
    // 'bob' is a taken
    return of(name === 'John').pipe(delay(2000));
  }

  getRoles(): Observable<Roles> {
    return of({
      admin: false,
      editor: false,
      subscriber: false
    }).pipe(delay(2000));
  }
}