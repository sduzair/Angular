import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { format, isValid, parse } from 'date-fns';

@Directive({
  selector: '[appTransactionTime]',
})
export class TransactionTimeDirective implements ControlValueAccessor {
  ngControl = inject(NgControl);
  private el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onChange = (_: any) => {
    /* empty */
  };
  private onTouched = () => {
    /* empty */
  };

  constructor() {
    this.ngControl.valueAccessor = this;
  }

  writeValue(value: string | null): void {
    if (!value) {
      this.el.nativeElement.value = '';
      return;
    }

    this.el.nativeElement.value =
      TransactionTimeDirective.parseAndFormatTime(value)!;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.onChange(TransactionTimeDirective.parseAndFormatTime(value)!);
  }

  @HostListener('blur')
  onBlur() {
    this.onTouched();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  static parseAndFormatTime(value: string | unknown) {
    const parsed = TransactionTimeDirective.parse(value);
    if (!isValid(parsed)) return;
    const formatted = format(parsed, 'HH:mm:ss');
    return formatted;
  }

  static parse(value: string | unknown) {
    // Try parsing 'H:mm', 'HH:mm', or 'HH:mm:ss' formats
    const formats = ['HH:mm:ss', 'HH:mm'];
    for (const fmt of formats) {
      const parsed = parse(String(value ?? ''), fmt, new Date());
      if (!isValid(parsed)) continue;
      return parsed;
    }
    // return invalid date
    return new Date('');
  }
}
