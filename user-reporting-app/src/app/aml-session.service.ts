import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, timer } from "rxjs";
import { GetSessionResponse } from "./aml/session-state.service";

@Injectable({ providedIn: "root" })
export class AmlSessionService {
  constructor(private http: HttpClient) {}
  testResponse: GetSessionResponse = {
    amlId: "99999",
    version: 0,
    createdAt: new Date().toUTCString(),
    updatedAt: new Date().toUTCString(),
    userId: "asdfasfd",
    data: {
      transactionSearchParams: {
        partyKeysSelection: ["3415674561", "1846597320"],
        accountNumbersSelection: [
          "84255 / 5582195",
          "31980 / 8692413",
          "87594 / 5647218",
        ],
        sourceSystemsSelection: ["ABM", "OLB"],
        productTypesSelection: [
          "Asset-Based Loan",
          "Book-Only Net Yield Instrument",
        ],
        reviewPeriodSelection: [
          {
            start: "2025/09/01",
            end: "2025/09/01",
          },
        ],
      },
      strTransactions: [],
    },
  };
  getSession(amlId: string) {
    return timer(1000).pipe(map(() => this.testResponse));
    // return this.http.get<GetSessionResponse>(
    //   `/api/sessions/${encodeURIComponent(amlId)}`,
    // );
  }
  // Accept partial updates to data payload; server should bump version/updatedAt.
  updateSession(
    amlId: string,
    data: Partial<GetSessionResponse["data"]["transactionSearchParams"]>,
  ) {
    console.log("🚀 ~ AmlSessionService ~ updateSession ~ data:", data);
    return timer(1000).pipe(map(() => this.testResponse));
    //   return this.http.patch<GetSessionResponse>(
    //     `/api/sessions/${encodeURIComponent(amlId)}`,
    //     { data },
    //   );
  }
}
