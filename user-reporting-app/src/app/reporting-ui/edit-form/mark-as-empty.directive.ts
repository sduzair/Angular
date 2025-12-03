import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  Renderer2,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl, ValidatorFn } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';

export const SPECIAL_EMPTY_VALUE = '<<marked as empty>>';

@Directive({
  selector: '[appMarkAsEmpty]',
})
export class MarkAsEmptyDirective implements AfterViewInit {
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

    // Set special empty val on control
    this.control.setValue(SPECIAL_EMPTY_VALUE, { emitEvent: false });
    this.control.markAsDirty();
    this.control.updateValueAndValidity();

    // Restore view updates and validation
    setTimeout(() => {
      this.valueAccessor!.writeValue = this.origWriteValue!;
      this.control.setValidators(this.originalValidators!);
    });
  }

  private matIconElement: HTMLElement | null = null;
  ngAfterViewInit(): void {
    this.matIconElement =
      this.elementRef.nativeElement.querySelector('mat-icon');
    // Subscribe to value changes to trigger host class update
    this.control.valueChanges
      .pipe(takeUntilDestroyed(this.destroy$))
      .subscribe(() => this.updateIconClass());
  }

  private updateIconClass(): void {
    console.assert(!!this.matIconElement);

    if (this.control?.value === SPECIAL_EMPTY_VALUE) {
      this.renderer.addClass(this.matIconElement, 'mat-warn');
    } else {
      this.renderer.removeClass(this.matIconElement, 'mat-warn');
    }
  }
}
