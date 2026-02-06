import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  Renderer2,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl } from '@angular/forms';
import { MatDatepickerInput } from '@angular/material/datepicker';
import { debounceTime, startWith } from 'rxjs';

@Directive({
  selector: 'input[matInput][matDatepicker][appToggleControl]',
  standalone: true,
})
export class DatepickerReadonlyDirective implements AfterViewInit {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private destroyRef = inject(DestroyRef);
  private ngControl = inject(NgControl, { optional: true });
  private datepickerInput =
    inject<MatDatepickerInput<Date>>(MatDatepickerInput);

  ngAfterViewInit(): void {
    if (!this.ngControl?.control) return;

    // Watch for control value changes
    this.ngControl.control.valueChanges
      .pipe(
        startWith(this.ngControl.control.value),
        debounceTime(0), // Allow DOM to update
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        // Check readonly state after DOM updates
        setTimeout(() => this.updateDatepickerToggle(), 0);
      });

    // Initial check
    setTimeout(() => this.updateDatepickerToggle(), 0);
  }

  private updateDatepickerToggle(): void {
    const inputElement = this.elementRef.nativeElement as HTMLInputElement;
    const isReadonly = inputElement.hasAttribute('readonly');

    if (!isReadonly) return;

    // Disable the underlying MatDatepickerInput directive
    this.datepickerInput.disabled = isReadonly;

    // Find the parent mat-form-field
    const matFormField = inputElement.closest('mat-form-field');
    if (!matFormField) return;

    // Find the mat-datepicker-toggle button
    const toggle = matFormField.querySelector('mat-datepicker-toggle button');

    if (!toggle) return;

    if (isReadonly) {
      this.renderer.setAttribute(toggle, 'tabindex', '-1');
      this.renderer.setAttribute(toggle, 'disabled', 'true');
    } else {
      this.renderer.removeAttribute(toggle, 'tabindex');
      this.renderer.removeAttribute(toggle, 'disabled');
    }
  }
}
