import { Directive, ErrorHandler, inject } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatDatepickerInput } from '@angular/material/datepicker';
import { format, isValid, parse } from 'date-fns';
import { ParsingError } from '../reporting-ui/edit-form/transaction-date.directive';

const REVIEW_DATE_INPUT_FORMATS = ['yyyy/MM/dd', 'MM/dd/yyyy'] as const;
const REVIEW_DATE_OUTPUT_FORMAT = 'yyyy/MM/dd';

@Directive({
  selector: '[appReviewPeriodDate]',
})
export class ReviewPeriodDateDirective implements ControlValueAccessor {
  private errorHandler = inject(ErrorHandler);
  ngControl = inject(NgControl);
  private datepickerInput = inject<MatDatepickerInput<Date>>(
    MatDatepickerInput,
    { optional: true, self: true },
  )!;

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
      parsedDate = ReviewPeriodDateDirective.parse(value);
    } catch (error) {
      console.error(
        '🚀 ~ ReviewPeriodDateDirective ~ writeValue ~ error:',
        error,
      );
      this.errorHandler.handleError(error);
    }

    this.datepickerInput.value = parsedDate;
  }

  registerOnChange(fn: (_: unknown) => void): void {
    this._onChange = (date: Date | null) => {
      const formatted = date ? ReviewPeriodDateDirective.format(date) : null;
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
    for (const format of REVIEW_DATE_INPUT_FORMATS) {
      const parsedDate = parse(dateStr, format, new Date());
      if (!isValid(parsedDate)) continue;
      return parsedDate;
    }
    throw new ParsingError(`Review date ${dateStr}`, dateStr);
  }
  static format(date: Date) {
    return format(date, REVIEW_DATE_OUTPUT_FORMAT);
  }
}
