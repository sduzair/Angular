import { Component } from "@angular/core";
import {
  type TaxReturn,
  TaxReturnComponent,
} from "./TaxReturn/TaxReturn.component";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-root",
  imports: [TaxReturnComponent, CommonModule],
  template: `
    <h1>Welcome to {{ title }}!</h1>

    <app-tax-return
      *ngFor="let taxReturn of taxReturns"
      [taxReturn]="taxReturn"
    />
  `,
  styles: [],
})
export class AppComponent {
  title = "local-service-basic";
  taxReturns: TaxReturn[] = [
    {
      serialNo: "ASDFKJ234",
      amount: 100,
    },
    {
      serialNo: "BHUBKJ293",
      amount: 200,
    },
  ];
}
