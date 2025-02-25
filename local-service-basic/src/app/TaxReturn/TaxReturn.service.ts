import { Injectable } from "@angular/core";
import type { TaxReturn } from "./TaxReturn.component";

@Injectable({
  providedIn: "root",
})
export class TaxReturnService {
  private currentTaxReturn!: TaxReturn;
  private originalTaxReturn!: TaxReturn;

  set taxReturn(value: TaxReturn) {
    this.currentTaxReturn = value;
    // clone value
    this.originalTaxReturn = { ...value };
  }
  get taxReturn(): TaxReturn {
    return this.currentTaxReturn;
  }
  restore() {
    this.taxReturn = this.originalTaxReturn;
  }
}
