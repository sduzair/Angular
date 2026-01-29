import {
  DestroyRef,
  Directive,
  EventEmitter,
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
} from '@angular/forms';
import { startWith } from 'rxjs';

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

  get controlToWatch() {
    return this.formGroupDirective.form.get(this.appControlToggle);
  }

  get dependentControl() {
    let dependentControl = this.ngControl?.control;
    if (!dependentControl) {
      dependentControl = this.controlContainer.control;
    }
    return dependentControl!;
  }

  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    if (!this.controlToWatch || !this.dependentControl) {
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
        const isDepControlAFormArray =
          this.dependentControl instanceof FormArray;
        const isDepControlAFormControl = !isDepControlAFormArray;

        const toggleIsReset = value == null;
        const toggleIsSetToFalse = value === false;
        const toggleHasValue = Boolean(value);

        // field that depends on control toggle's value
        // like other method of txn field depnds on method of txn field "Other" value
        // only needs to be enabled as validator required set by default
        if (
          isDepControlAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue === String(value ?? '')
        ) {
          this.dependentControl.enable({ emitEvent: false });
          return;
        }

        if (
          isDepControlAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue !== String(value ?? '')
        ) {
          this.dependentControl.reset();
          this.dependentControl.disable({ emitEvent: false });
          return;
        }

        // field that depends on checkbox toggle's value
        // only needs to be enabled as validator required set by default
        if (isDepControlAFormControl && toggleHasValue) {
          this.dependentControl.enable({ emitEvent: false });
          return;
        }

        if (isDepControlAFormControl && (toggleIsReset || toggleIsSetToFalse)) {
          this.dependentControl.reset();
          this.dependentControl.disable({ emitEvent: false });
          return;
        }

        // array field depends on checkbox toggle's value
        // only needs to be enabled as field validators set as required by default
        if (isDepControlAFormArray && toggleHasValue && !this.isBulkEdit) {
          this.dependentControl.enable({ emitEvent: false });

          if (this.dependentControl.value.length === 0)
            this.addControlGroup.emit();
          return;
        }

        if (isDepControlAFormArray && toggleHasValue && this.isBulkEdit) {
          this.dependentControl.enable({ emitEvent: false });

          this.dependentControl.clear({ emitEvent: false });
          this.addControlGroup.emit();
          return;
        }

        if (isDepControlAFormArray && toggleIsSetToFalse) {
          this.dependentControl.clear({ emitEvent: false });
          return;
        }

        if (isDepControlAFormArray && toggleIsReset) {
          this.dependentControl.reset({ emitEvent: false });
          this.dependentControl.disable({ emitEvent: false });
          return;
        }

        console.assert(this.controlToWatch!.disabled);
      });
  }
}
