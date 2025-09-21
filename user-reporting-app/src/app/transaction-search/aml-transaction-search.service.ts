import { Injectable } from "@angular/core";
import { Observable, timer, map } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AmlTransactionSearchService {
  getSourceRefreshTime(): Observable<SourceSysRefreshTime[]> {
    return timer(1000).pipe(
      map(() =>
        AmlTransactionSearchService.getSourceSystemInfo().map((src) => ({
          value: src,
          refresh: new Date(),
          isDisabled: false,
        })),
      ),
    );
  }
  static getSourceSystemInfo() {
    return [
      "Party KYC",
      "Flow of Funds",
      "Conductor KYC",
      "Product Inventory",
      "Cheque",
      "ABM",
      "OLB",
      "EMT",
      "BPSA",
      "CI",
      "FX",
      "TSYS",
      "EFT",
      "EMTs",
      "FXCASHPM",
      "FXMP",
      "GMT",
      "OTC",
      "POS",
      "Wires",
    ];
  }
}

export type SourceSys = {
  value: string;
};

export type SourceSysRefreshTime = {
  value: string;
  refresh?: string | Date;
  isDisabled: boolean;
};

export type AccountNumber = {
  value: string;
};

export type PartyKey = {
  value: string;
};
