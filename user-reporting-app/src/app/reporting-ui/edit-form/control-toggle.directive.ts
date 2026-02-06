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
} from '@angular/forms';
import { startWith } from 'rxjs';
import { MARKED_AS_CLEARED, SET_AS_EMPTY } from './mark-as-cleared.directive';

@Directive({
  selector: '[appToggleControl]',
})
export class ControlToggleDirective implements OnInit {
  private formGroupDirective = inject(FormGroupDirective);
  private controlContainer = inject(ControlContainer);
  private ngControl = inject(NgControl, { optional: true });

  @Input({ required: true }) appToggleControl!: string;
  @Input() isBulkEdit = false;
  get isSingleEdit() {
    return !this.isBulkEdit;
  }
  @Input({ required: false }) appToggleControlValue?: unknown;
  @Output() readonly addControlGroup = new EventEmitter();

  get toggleControl() {
    return this.formGroupDirective.form.get(this.appToggleControl);
  }

  get dependentControl() {
    let dependentControl = this.ngControl?.control;
    if (!dependentControl) {
      dependentControl = this.controlContainer.control;
    }
    return dependentControl!;
  }

  @HostBinding('attr.readonly')
  get readonly() {
    return this.dependentControl.value === MARKED_AS_CLEARED ? '' : null;
  }

  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    if (!this.toggleControl || !this.dependentControl) {
      throw new Error(
        'ControlToggleDirective: controls not found in the form group',
      );
    }

    // Subscribe to value changes of the control to watch
    this.toggleControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        startWith(this.toggleControl.value),
      )
      .subscribe((toggleValue) => {
        const isDepControlAFormArray =
          this.dependentControl instanceof FormArray;
        const isDependentCtrlAFormControl = !isDepControlAFormArray;

        const toggleIsReset = toggleValue == null;
        const toggleIsSetToFalse = toggleValue === false;
        const toggleHasValue = Boolean(toggleValue);

        if (isDependentCtrlAFormControl && this.toggleControl!.disabled) {
          this.dependentControl.reset();
          this.dependentControl.disable();
          return;
        }

        // field that depends on control toggle's value
        if (
          isDependentCtrlAFormControl &&
          this.appToggleControlValue &&
          this.appToggleControlValue === String(toggleValue ?? '')
        ) {
          this.dependentControl.enable({ emitEvent: false });
          this.dependentControl.setValue(SET_AS_EMPTY);
          return;
        }

        if (
          isDependentCtrlAFormControl &&
          this.appToggleControlValue &&
          this.appToggleControlValue !== String(toggleValue ?? '')
        ) {
          this.dependentControl.enable({ emitEvent: false });
          this.dependentControl.setValue(MARKED_AS_CLEARED);
          return;
        }

        // field that depends on checkbox toggle's value
        if (isDependentCtrlAFormControl && toggleHasValue) {
          this.dependentControl.enable({ emitEvent: false });
          this.dependentControl.setValue(SET_AS_EMPTY);
          return;
        }

        if (
          isDependentCtrlAFormControl &&
          (toggleIsReset || toggleIsSetToFalse)
        ) {
          this.dependentControl.enable({ emitEvent: false });
          this.dependentControl.setValue(MARKED_AS_CLEARED);
          return;
        }

        // array field depends on checkbox toggle's value
        if (isDepControlAFormArray && toggleHasValue) {
          this.dependentControl.enable({ emitEvent: false });

          if (this.dependentControl.value.length === 0)
            this.addControlGroup.emit();
          return;
        }

        if (isDepControlAFormArray && toggleIsSetToFalse) {
          this.dependentControl.clear();
          return;
        }

        if (isDepControlAFormArray && toggleIsReset) {
          this.dependentControl.reset();
          this.dependentControl.disable({ emitEvent: false });
          return;
        }

        console.assert(this.toggleControl!.disabled);
      });
  }
}
