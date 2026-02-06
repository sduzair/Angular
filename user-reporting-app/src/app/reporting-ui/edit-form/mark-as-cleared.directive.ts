import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  Renderer2,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl, ValidatorFn } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';

export const MARKED_AS_CLEARED = null;
export const SET_AS_EMPTY = '';

@Directive({
  selector: '[appMarkAsCleared]',
})
export class MarkAsClearedDirective implements AfterViewInit {
  private formField = inject(MatFormField, { optional: true })!;
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  private destroy$ = inject(DestroyRef);
  origWriteValue: ((obj: unknown) => void) | undefined;
  originalValidators: [ValidatorFn] | null = null;

  get valueAccessor() {
    return (this.formField._control.ngControl as NgControl).valueAccessor!;
  }

  get control() {
    return this.formField._control.ngControl?.control!;
  }

  @HostListener('click', ['$event'])
  onClick($event: Event): void {
    $event.stopPropagation();

    this.control.enable();
    this.control.setValue(null);

    // Temporarily pause model to view updates
    this.origWriteValue = this.valueAccessor?.writeValue.bind(
      this.valueAccessor,
    );
    this.valueAccessor!.writeValue = () => {
      /* empty */
    };
    // Temporarily pause validation
    this.originalValidators = this.control.validator
      ? [this.control.validator]
      : null;
    this.control.clearValidators();

    this.control.setValue(MARKED_AS_CLEARED, { emitEvent: false });
    this.control.updateValueAndValidity();

    // Restore view updates and validation
    setTimeout(() => {
      this.valueAccessor!.writeValue = this.origWriteValue!;
      this.control.setValidators(this.originalValidators!);
      // control.updateValueAndValidity();
    });
  }

  ngAfterViewInit(): void {
    const matIconElement =
      this.elementRef.nativeElement.querySelector('mat-icon');
    // Subscribe to value changes to trigger host class update
    this.control.valueChanges
      .pipe(takeUntilDestroyed(this.destroy$))
      .subscribe(() => this.updateIconClass(matIconElement));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateIconClass(matIconElement: any): void {
    console.assert(!!matIconElement);

    if (!this.control!.disabled && this.control!.value === MARKED_AS_CLEARED) {
      this.renderer.addClass(matIconElement, 'mat-warn');
      // eslint-disable-next-line no-constant-condition
    } else if (true || this.control!.value === SET_AS_EMPTY) {
      this.renderer.removeClass(matIconElement, 'mat-warn');
    }
  }
}
