import { Component, Input, type OnInit } from "@angular/core";
import { TaxReturnService as TaxReturnVersionControlService } from "./TaxReturn.service";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";

@Component({
  selector: "app-tax-return",
  imports: [ReactiveFormsModule],
  template: `<h3>Tax return: {{ taxReturn.serialNo }}</h3>
    <form [formGroup]="taxReturnForm" (ngSubmit)="onSave()">
      <label>
        Serial Number
        <input type="text" formControlName="serialNo" />
      </label>
      <label>
        Amount
        <input type="number" formControlName="amount" />
      </label>
      <button type="submit">Save</button>
      <button type="button" (click)="onRevert()">Revert</button>
    </form>`,
  styleUrl: "./TaxReturn.component.css",
  providers: [TaxReturnVersionControlService],
})
export class TaxReturnComponent implements OnInit {
  @Input({ required: true })
  taxReturn!: FormGroupRawValue<typeof this.taxReturnForm>;
  taxReturnForm = new FormGroup({
    serialNo: new FormControl(
      { value: "", disabled: true },
      { nonNullable: true }
    ),
    amount: new FormControl(0, { nonNullable: true }),
  });

  constructor(
    private taxReturnVersionControlService: TaxReturnVersionControlService
  ) {}

  ngOnInit(): void {
    this.taxReturnVersionControlService.taxReturn = this.taxReturn;
    this.taxReturnForm.setValue(this.taxReturn);
  }

  onSave(): void {
    this.taxReturnVersionControlService.taxReturn =
      this.taxReturnForm.getRawValue();
  }

  onRevert(): void {
    this.taxReturnVersionControlService.restore();
    this.taxReturnForm.setValue(this.taxReturnVersionControlService.taxReturn);
  }
}

type FormGroupRawValue<T extends FormGroup> = ReturnType<T["getRawValue"]>;
export type TaxReturn = TaxReturnComponent["taxReturn"];
