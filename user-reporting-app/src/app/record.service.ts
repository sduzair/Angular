import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { StrTxn } from "./table/table.component";
import { Observable, shareReplay } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class RecordService {
  private strTxns$!: Observable<StrTxn[]>;
  constructor(private httpClient: HttpClient) {}
  getStrTxns() {
    if (!this.strTxns$) {
      this.strTxns$ = this.httpClient
        .get<StrTxn[]>("/api/strTxns?limit=200")
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.strTxns$;
  }
}
