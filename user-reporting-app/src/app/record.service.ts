import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from "./table/table.component";

@Injectable({
  providedIn: "root",
})
export class RecordService {
  constructor(private httpClient: HttpClient) {}
  getUsers() {
    return this.httpClient.get<User[]>("/api/users");
  }
}
