import { Directive, HostListener, Optional } from "@angular/core";
import { NgControl, ValidatorFn } from "@angular/forms";
import { MatFormField } from "@angular/material/form-field";

export const SPECIAL_EMPTY_VALUE = "<<marked as empty>>";

@Directive({
  selector: "[appClearField]",
})
export class ClearFieldDirective {
  constructor(@Optional() private formField: MatFormField) {}
  origWriteValue: ((obj: any) => void) | undefined;
  originalValidators: [ValidatorFn] | null = null;

  get valueAccessor() {
    return (this.formField._control.ngControl as NgControl).valueAccessor!;
  }

  get control() {
    return this.formField._control.ngControl?.control!;
  }

  @HostListener("click", ["$event"])
  onClick($event: Event): void {
    $event.stopPropagation();

    this.control.enable();
    this.control.setValue(null);

    // Temporarily pause model to view updates
    this.origWriteValue = this.valueAccessor?.writeValue.bind(
      this.valueAccessor,
    );
    this.valueAccessor!.writeValue = () => {};
    // Temporarily pause validation
    this.originalValidators = this.control.validator
      ? [this.control.validator]
      : null;
    this.control.clearValidators();

    this.control.markAsTouched();
    this.control.setValue(SPECIAL_EMPTY_VALUE, { emitEvent: false });
    this.control.markAsDirty();
    this.control.updateValueAndValidity();

    // Restore view updates and validation
    setTimeout(() => {
      this.valueAccessor!.writeValue = this.origWriteValue!;
      this.control.setValidators(this.originalValidators!);
      // control.updateValueAndValidity();
    });
  }
}
