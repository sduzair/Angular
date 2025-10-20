import {
  Directive,
  ElementRef,
  HostListener,
} from "@angular/core";
import { ControlValueAccessor, NgControl } from "@angular/forms";
import { format, isValid, parse } from "date-fns";

@Directive({
  selector: "[appTransactionTime]",
})
export class TransactionTimeDirective implements ControlValueAccessor {
  private onChange = (_: any) => {};
  private onTouched = () => {};

  constructor(
    public ngControl: NgControl,
    private el: ElementRef<HTMLInputElement>,
  ) {
    this.ngControl.valueAccessor = this;
  }

  writeValue(value: string | null): void {
    if (!value) {
      this.el.nativeElement.value = "";
      return;
    }

    this.el.nativeElement.value =
      TransactionTimeDirective.parseAndFormattedTime(value)!;
  }

  @HostListener("input", ["$event.target.value"])
  onInput(value: string) {
    this.onChange(TransactionTimeDirective.parseAndFormattedTime(value)!);
  }

  @HostListener("blur")
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

  static parseAndFormattedTime(value: string) {
    // Try parsing 'H:mm', 'HH:mm', or 'HH:mm:ss' formats
    const formats = ["HH:mm:ss", "HH:mm"];
    for (const fmt of formats) {
      const parsed = parse(value, fmt, new Date());
      if (!isValid(parsed)) continue;
      const formatted = format(parsed, "HH:mm:ss");
      return formatted;
    }
    return;
  }
}
