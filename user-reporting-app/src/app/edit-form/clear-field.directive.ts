import {
  AfterViewInit,
  Directive,
  HostListener,
  Optional,
} from "@angular/core";
import {
  AbstractControl,
  NgControl,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { MatFormField } from "@angular/material/form-field";

export const SPECIAL_EMPTY_VALUE = "<<marked as empty>>";

@Directive({
  selector: "[appClearField]",
})
export class ClearFieldDirective implements AfterViewInit {
  // private formField = inject(MatFormField);
  constructor(@Optional() private formField: MatFormField) {}
  origWriteValue: ((obj: any) => void) | undefined;
  originalValidators: [ValidatorFn] | null = null;

  get valueAccessor() {
    return (this.formField._control.ngControl as NgControl).valueAccessor;
  }

  get control() {
    return this.formField._control?.ngControl?.control!;
  }

  ngAfterViewInit(): void {
    this.removeRequiredValidator(this.control);

    this.origWriteValue = this.valueAccessor?.writeValue.bind(
      this.valueAccessor,
    );
  }

  @HostListener("click", ["$event"])
  onClick($event: Event): void {
    $event.stopPropagation();

    this.control.setValue(null);

    // Temporarily override to prevent view updates
    this.valueAccessor!.writeValue = () => {};
    // Temporarily pause validation
    this.backupValidators(this.control);
    this.control.clearValidators();

    this.control.markAsTouched();
    this.control.setValue(SPECIAL_EMPTY_VALUE, { emitEvent: false });
    this.control.markAsDirty();
    this.control.updateValueAndValidity();

    // Restore view updates and validation
    setTimeout(() => {
      this.valueAccessor!.writeValue = this.origWriteValue!;
      this.restoreValidators(this.control);
    });
  }

  private removeRequiredValidator(control: AbstractControl): void {
    if (typeof control.hasValidator !== "function") return;
    if (!control.hasValidator(Validators.required)) return;

    control.removeValidators(Validators.required);
    control.updateValueAndValidity();
  }

  private backupValidators(control: AbstractControl): void {
    this.originalValidators = control.validator ? [control.validator] : null;
  }

  private restoreValidators(control: AbstractControl): void {
    control.setValidators(this.originalValidators!);
    // control.updateValueAndValidity();
  }
}
