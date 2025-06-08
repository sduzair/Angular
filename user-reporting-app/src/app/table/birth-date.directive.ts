import { Directive, Optional, Self } from "@angular/core";
import { ControlValueAccessor, NgControl } from "@angular/forms";
import { MatDatepickerInput } from "@angular/material/datepicker";
import { format } from "date-fns/fp/format";
import { parse } from "date-fns/fp/parse";

@Directive({
  selector: "[appBirthDate]",
})
export class BirthDateDirective implements ControlValueAccessor {
  private _onChange = (value: Date | null) => {};

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private datepickerInput: MatDatepickerInput<Date>,
  ) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  writeValue(value: string | Date | null): void {
    let parsedDate: Date | null = null;

    if (typeof value === "string") {
      parsedDate = BirthDateDirective.parseBirthDate(value);
    }

    console.assert(!!parsedDate, "Assert parsed date is not null");

    this.datepickerInput.value = parsedDate;
  }

  registerOnChange(fn: (_: any) => void): void {
    this._onChange = (date: Date | null) => {
      const formattedDate = date
        ? BirthDateDirective.formatBirthDate(date!)
        : null;
      fn(formattedDate);
    };
    this.datepickerInput.registerOnChange(this._onChange);
  }

  registerOnTouched(fn: any): void {
    this.datepickerInput.registerOnTouched(fn);
  }

  static readonly parseBirthDate = parse(new Date(), "yyyy-M-d");
  static readonly formatBirthDate = format("yyyy-M-d");
}
