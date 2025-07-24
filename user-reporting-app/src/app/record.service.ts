import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { StrTxn } from "./table/table.component";

@Injectable({
  providedIn: "root",
})
export class RecordService {
  constructor(private httpClient: HttpClient) {}
  getStrTxns() {
    return this.httpClient.get<StrTxn[]>("/api/strTxns?limit=20");
  }
}
