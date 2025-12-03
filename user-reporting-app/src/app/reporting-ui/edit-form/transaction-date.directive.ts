import { Directive, inject } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatDatepickerInput } from '@angular/material/datepicker';
import { format, isValid, parse } from 'date-fns/fp';

export const TRANSACTION_DATE_FORMAT = 'yyyy/MM/dd';

@Directive({
  selector: '[appTransactionDate]',
})
export class TransactionDateDirective implements ControlValueAccessor {
  ngControl = inject(NgControl);
  private datepickerInput =
    inject<MatDatepickerInput<Date>>(MatDatepickerInput);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _onChange = (_: any) => {
    /* empty */
  };

  constructor() {
    this.ngControl.valueAccessor = this;
  }

  // Write value from model to view
  writeValue(value: string | null | unknown): void {
    if (!value) {
      this.datepickerInput.value = value;
      return;
    }

    if (typeof value !== 'string') {
      throw new Error('Expected string type');
    }

    const parsedDate = TransactionDateDirective.parse(value);
    if (!isValid(parsedDate)) {
      throw new Error('Parsing error');
    }

    this.datepickerInput.value = parsedDate;
  }

  registerOnChange(fn: (_: unknown) => void): void {
    this._onChange = (date: Date | null) => {
      const formatted = date ? TransactionDateDirective.format(date) : null;
      fn(formatted);
    };
    this.datepickerInput.registerOnChange(this._onChange);
  }
  registerOnTouched(fn: () => void): void {
    this.datepickerInput.registerOnTouched(fn);
  }

  setDisabledState(isDisabled: boolean): void {
    this.datepickerInput.disabled = isDisabled;
  }

  static parse = parse(new Date(), TRANSACTION_DATE_FORMAT);
  static format = format(TRANSACTION_DATE_FORMAT);
}
