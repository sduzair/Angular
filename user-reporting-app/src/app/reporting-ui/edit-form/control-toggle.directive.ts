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
import { MARKED_AS_CLEARED } from './mark-as-cleared.directive';

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
    return this.depPropControl.value === MARKED_AS_CLEARED ? true : null;
  }

  get controlToWatch() {
    return this.formGroupDirective.form.get(this.appControlToggle);
  }

  get depPropControl() {
    let depPropControl = this.ngControl?.control;
    if (!depPropControl) {
      depPropControl = this.controlContainer.control;
    }
    return depPropControl!;
  }

  get depPropControlValueAccessor() {
    return this.ngControl!.valueAccessor!;
  }

  depPropControlOrigWriteValue: ((obj: unknown) => void) | undefined;

  depPropControlOriginalValidators: [ValidatorFn] | null = null;

  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    if (!this.controlToWatch || !this.depPropControl) {
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
        const isDepControlAFormArray = this.depPropControl instanceof FormArray;
        const isDepControlAFormControl = !isDepControlAFormArray;

        if (isDepControlAFormControl && value === null && this.isBulkEdit) {
          this.depPropControl.reset();

          // clear dependent control
          this.depPropControl.setValue(MARKED_AS_CLEARED, {
            emitEvent: false,
          });
          return;
        }

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
          this.depPropControl.enable({ emitEvent: false });
          return;
        }

        if (
          isDepControlAFormControl &&
          this.appControlToggleValue &&
          this.appControlToggleValue !== String(value ?? '')
        ) {
          this.depPropControl.reset();
          this.depPropControl.disable({ emitEvent: false });
          return;
        }

        // field that depends on checkbox toggle's value
        // only needs to be enabled as validator required set by default
        if (isDepControlAFormControl && toggleHasValue) {
          this.depPropControl.enable({ emitEvent: false });
          return;
        }

        if (isDepControlAFormControl && (toggleIsReset || toggleIsSetToFalse)) {
          this.depPropControl.reset();
          this.depPropControl.disable({ emitEvent: false });
          return;
        }

        // array field depends on checkbox toggle's value
        // only needs to be enabled as field validators set as required by default
        if (isDepControlAFormArray && toggleHasValue && !this.isBulkEdit) {
          this.depPropControl.enable({ emitEvent: false });

          if (this.depPropControl.value.length === 0)
            this.addControlGroup.emit();
          return;
        }

        if (isDepControlAFormArray && toggleHasValue && this.isBulkEdit) {
          this.depPropControl.enable({ emitEvent: false });

          this.depPropControl.clear({ emitEvent: false });
          this.addControlGroup.emit();
          return;
        }

        if (isDepControlAFormArray && toggleIsSetToFalse) {
          this.depPropControl.clear({ emitEvent: false });
          return;
        }

        if (isDepControlAFormArray && toggleIsReset) {
          this.depPropControl.reset({ emitEvent: false });
          this.depPropControl.disable({ emitEvent: false });
          return;
        }

        console.assert(this.controlToWatch!.disabled);
      });
  }
}
