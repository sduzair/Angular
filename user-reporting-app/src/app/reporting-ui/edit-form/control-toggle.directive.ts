import {
  DestroyRef,
  Directive,
  EventEmitter,
  Input,
  OnInit,
  Optional,
  Output,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ControlContainer,
  FormArray,
  FormGroupDirective,
  NgControl,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { startWith } from "rxjs";
import { SPECIAL_EMPTY_VALUE } from "./mark-as-empty.directive";

@Directive({
  selector: "[appControlToggle]",
})
export class ControlToggleDirective implements OnInit {
  @Input({ required: true }) appControlToggle!: string;
  @Input() isBulkEdit = false;
  @Input({ required: false }) appControlToggleValue?: any;
  @Input() appControlRequired = false;
  @Output() addControlGroup = new EventEmitter();

  // @HostBinding("readOnly") get isReadonly(): boolean {
  //   return this.controlToToggle.value === SPECIAL_EMPTY_VALUE;
  // }

  get controlToWatch() {
    return this.formGroupDirective.form.get(this.appControlToggle);
  }

  get controlToToggle() {
    let controlToToggle = this.ngControl?.control;
    if (!controlToToggle) {
      controlToToggle = this.controlContainer.control;
    }
    return controlToToggle!;
  }

  get controlToToggleValueAccessor() {
    return this.ngControl!.valueAccessor!;
  }

  controlToToggleOrigWriteValue: ((obj: any) => void) | undefined;

  controlToToggleOriginalValidators: [ValidatorFn] | null = null;

  constructor(
    private formGroupDirective: FormGroupDirective,
    private controlContainer: ControlContainer,
    @Optional() private ngControl?: NgControl,
  ) {}

  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    if (!this.controlToWatch || !this.controlToToggle) {
      throw new Error(
        "ControlToggleDirective: controls not found in the form group",
      );
    }

    // Subscribe to value changes of the control to watch
    this.controlToWatch.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        startWith(this.controlToWatch.value),
      )
      .subscribe((value) => {
        // console.log("🚀 ~ ControlToggleDirective ~ .subscribe ~ value:", value);
        if (value === SPECIAL_EMPTY_VALUE) {
          this.controlToToggle.reset();
          this.controlToToggle.enable({ emitEvent: false });

          // Temporarily pause model to view updates
          this.controlToToggleOrigWriteValue =
            this.controlToToggleValueAccessor.writeValue.bind(
              this.controlToToggleValueAccessor,
            );
          this.controlToToggleValueAccessor.writeValue = () => {};
          // Temporarily pause validation
          this.controlToToggleOriginalValidators = this.controlToToggle
            .validator
            ? [this.controlToToggle.validator]
            : null;
          this.controlToToggle.clearValidators();

          this.controlToToggle.markAsTouched();
          this.controlToToggle.setValue(SPECIAL_EMPTY_VALUE, {
            emitEvent: false,
          });
          this.controlToToggle.markAsDirty();
          this.controlToToggle.updateValueAndValidity();

          // Restore model to view updates and validation
          setTimeout(() => {
            this.controlToToggleValueAccessor.writeValue =
              this.controlToToggleOrigWriteValue!;
            this.controlToToggle.setValidators(
              this.controlToToggleOriginalValidators!,
            );
            this.controlToToggle.updateValueAndValidity();
          });
          return;
        }
        const isControlToToggleAFormArray =
          this.controlToToggle instanceof FormArray;
        const isControlToToggleAFormControl = !isControlToToggleAFormArray;
        const isFormArrayInitDisabledLoad = this.controlToToggle.disabled;
        const toggleIsReset = value == null;
        const toggleIsSetToFalse = value === false;
        const toggleHasValue = Boolean(value);

        // field that becomes required on control toggle's value
        if (
          isControlToToggleAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue === String(value) &&
          this.appControlRequired
        ) {
          // Add required validator dynamically
          this.controlToToggle.addValidators(Validators.required);
          this.controlToToggle.updateValueAndValidity({ emitEvent: false });
          return;
        }

        if (
          isControlToToggleAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue !== String(value) &&
          this.appControlRequired
        ) {
          this.controlToToggle.removeValidators(Validators.required);
          this.controlToToggle.updateValueAndValidity({ emitEvent: false });
          return;
        }

        // field that depends on control toggle's value
        // like other method of txn field depnds on method of txn field "Other" value
        // only needs to be enabled as validator required set by default
        if (
          isControlToToggleAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue === String(value) &&
          !this.appControlRequired
        ) {
          this.controlToToggle.enable({ emitEvent: false });
          return;
        }

        if (
          isControlToToggleAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue !== String(value) &&
          !this.appControlRequired
        ) {
          this.controlToToggle.reset();
          this.controlToToggle.disable({ emitEvent: false });
          return;
        }

        // field that depends on checkbox toggle's value
        // only needs to be enabled as validator required set by default
        if (isControlToToggleAFormControl && toggleHasValue) {
          this.controlToToggle.enable({ emitEvent: false });
          return;
        }

        if (
          isControlToToggleAFormControl &&
          (toggleIsReset || toggleIsSetToFalse)
        ) {
          this.controlToToggle.reset();
          this.controlToToggle.disable({ emitEvent: false });
          return;
        }

        // array field depends on checkbox toggle's value
        // only needs to be enabled as field validators set as required by default
        if (isControlToToggleAFormArray && toggleHasValue && !this.isBulkEdit) {
          this.controlToToggle.enable({ emitEvent: false });

          if (this.controlToToggle.value.length === 0)
            this.addControlGroup.emit();
          return;
        }

        if (isControlToToggleAFormArray && toggleHasValue && this.isBulkEdit) {
          this.controlToToggle.enable({ emitEvent: false });

          this.controlToToggle.clear({ emitEvent: false });
          this.addControlGroup.emit();
          return;
        }

        if (isControlToToggleAFormArray && toggleIsSetToFalse) {
          this.controlToToggle.clear({ emitEvent: false });
          return;
        }

        if (isControlToToggleAFormArray && toggleIsReset) {
          this.controlToToggle.reset({ emitEvent: false });
          this.controlToToggle.disable({ emitEvent: false });
          return;
        }

        if (
          isControlToToggleAFormArray &&
          !toggleHasValue &&
          isFormArrayInitDisabledLoad
        ) {
          this.controlToToggle.disable({ emitEvent: false });
          return;
        }

        console.assert(this.controlToWatch!.disabled);
      });
  }
}
