import {
  DestroyRef,
  Directive,
  EventEmitter,
  HostBinding,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlContainer,
  FormArray,
  FormGroupDirective,
  NgControl,
  ValidatorFn,
} from '@angular/forms';
import { startWith } from 'rxjs';
import { SPECIAL_EMPTY_VALUE } from './mark-as-empty.directive';

@Directive({
  selector: '[appControlToggle]',
})
export class ControlToggleDirective implements OnInit {
  private formGroupDirective = inject(FormGroupDirective);
  private controlContainer = inject(ControlContainer);
  private ngControl = inject(NgControl, { optional: true });

  @Input({ required: true }) appControlToggle!: string;
  @Input() isBulkEdit = false;
  @Input({ required: false }) appControlToggleValue?: unknown;
  @Output() readonly addControlGroup = new EventEmitter();

  @HostBinding('attr.readonly') get isReadonly(): boolean | null {
    return this.controlToToggle.value === SPECIAL_EMPTY_VALUE ? true : null;
  }

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

  controlToToggleOrigWriteValue: ((obj: unknown) => void) | undefined;

  controlToToggleOriginalValidators: [ValidatorFn] | null = null;

  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    if (!this.controlToWatch || !this.controlToToggle) {
      throw new Error(
        'ControlToggleDirective: controls not found in the form group',
      );
    }

    // Subscribe to value changes of the control to watch
    this.controlToWatch.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        startWith(this.controlToWatch.value),
      )
      .subscribe((value) => {
        const isControlToToggleAFormArray =
          this.controlToToggle instanceof FormArray;
        const isControlToToggleAFormControl = !isControlToToggleAFormArray;

        // console.log("🚀 ~ ControlToggleDirective ~ .subscribe ~ value:", value);
        if (isControlToToggleAFormControl && value === SPECIAL_EMPTY_VALUE) {
          this.controlToToggle.reset();

          // Temporarily pause model to view updates
          this.controlToToggleOrigWriteValue =
            this.controlToToggleValueAccessor.writeValue.bind(
              this.controlToToggleValueAccessor,
            );
          this.controlToToggleValueAccessor.writeValue = () => {
            /* empty */
          };

          // Temporarily pause validation
          this.controlToToggleOriginalValidators = this.controlToToggle
            .validator
            ? [this.controlToToggle.validator]
            : null;
          this.controlToToggle.clearValidators();

          // Set special empty val on control to toggle
          this.controlToToggle.setValue(SPECIAL_EMPTY_VALUE, {
            emitEvent: false,
          });
          this.controlToToggle.markAsDirty();

          // Restore model to view updates and validation
          setTimeout(() => {
            this.controlToToggleValueAccessor.writeValue =
              this.controlToToggleOrigWriteValue!;
            this.controlToToggle.setValidators(
              this.controlToToggleOriginalValidators!,
            );
          });
          return;
        }

        const isFormArrayInitDisabledLoad = this.controlToToggle.disabled;
        const toggleIsReset = value == null;
        const toggleIsSetToFalse = value === false;
        const toggleHasValue = Boolean(value);

        // field that depends on control toggle's value
        // like other method of txn field depnds on method of txn field "Other" value
        // only needs to be enabled as validator required set by default
        if (
          isControlToToggleAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue === String(value)
        ) {
          this.controlToToggle.enable({ emitEvent: false });
          return;
        }

        if (
          isControlToToggleAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue !== String(value)
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
