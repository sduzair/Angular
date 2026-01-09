import { Directive, ErrorHandler, inject } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatDatepickerInput } from '@angular/material/datepicker';
import { format, isValid, parse } from 'date-fns';

const TRANSACTION_DATE_INPUT_FORMATS = ['yyyy/MM/dd', 'MM/dd/yyyy'] as const;
const TRANSACTION_DATE_OUTPUT_FORMAT = 'yyyy/MM/dd';

@Directive({
  selector: '[appTransactionDate]',
})
export class TransactionDateDirective implements ControlValueAccessor {
  private errorHandler = inject(ErrorHandler);
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

    let parsedDate: Date | undefined;
    try {
      parsedDate = TransactionDateDirective.parse(value);
    } catch (error) {
      console.error(
        '🚀 ~ TransactionDateDirective ~ writeValue ~ error:',
        error,
      );
      this.errorHandler.handleError(error);
    }

    this.datepickerInput.value = parsedDate ?? null;
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

  static parse(dateStr: string) {
    for (const format of TRANSACTION_DATE_INPUT_FORMATS) {
      const parsedDate = parse(dateStr, format, new Date());
      if (!isValid(parsedDate)) continue;
      return parsedDate;
    }
    throw new ParsingError(`Transaction date ${dateStr}`, dateStr);
  }
  static format(date: Date) {
    return format(date, TRANSACTION_DATE_OUTPUT_FORMAT);
  }
}

export class ParsingError extends Error {
  constructor(message: string, val: string, name = 'Parsing Error') {
    super(`[${name}]: ${message}`);
    this.name = name;
    Object.setPrototypeOf(this, ParsingError.prototype);
  }
}
