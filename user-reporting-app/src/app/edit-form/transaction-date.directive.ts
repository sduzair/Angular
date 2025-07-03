import { Directive, ElementRef, HostListener } from "@angular/core";
import { ControlValueAccessor, NgControl } from "@angular/forms";
import { MatDatepickerInput } from "@angular/material/datepicker";
import { parse, format, isValid } from "date-fns/fp";

@Directive({
  selector: "[appTransactionDate]",
})
export class TransactionDateDirective implements ControlValueAccessor {
  private _onChange = (_: any) => {};

  constructor(
    public ngControl: NgControl,
    private datepickerInput: MatDatepickerInput<Date>,
  ) {
    this.ngControl.valueAccessor = this;
  }

  // Write value from model to view
  writeValue(value: string | null | unknown): void {
    if (!value) {
      this.datepickerInput.value = value;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("Expected string type");
    }

    const parsedDate = TransactionDateDirective.parse(value);
    if (!isValid(parsedDate)) {
      throw new Error("Parsing error");
    }

    this.datepickerInput.value = parsedDate;
  }

  registerOnChange(fn: (_: any) => void): void {
    this._onChange = (date: Date | null) => {
      const formatted = date
        ? TransactionDateDirective.formatSession(date)
        : null;
      fn(formatted);
    };
    this.datepickerInput.registerOnChange(this._onChange);
  }
  registerOnTouched(fn: any): void {
    this.datepickerInput.registerOnTouched(fn);
  }

  static parse = parse(new Date(), "yyyy/MM/dd");
  static formatSession = format("yyyy/MM/dd");
}
