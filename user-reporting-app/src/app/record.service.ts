import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { StrTxn } from "./table/table.component";
import { Observable } from "rxjs/internal/Observable";
import { shareReplay } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class RecordService {
  private strTxns$!: Observable<StrTxn[]>;
  constructor(private httpClient: HttpClient) {}
  getStrTxns() {
    if (!this.strTxns$) {
      this.strTxns$ = this.httpClient
        .get<StrTxn[]>("/api/strTxns")
        .pipe(shareReplay(1));
    }
    return this.strTxns$;
  }
}
