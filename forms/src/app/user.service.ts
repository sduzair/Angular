import { Injectable } from "@angular/core";
import { Observable, delay, of } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class UserService {
  isUserNameTaken(name: string): Observable<boolean> {
    // 'bob' is a taken
    return of(name === 'John').pipe(delay(2000));
  }
}