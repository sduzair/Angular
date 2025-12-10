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

export const SPECIAL_EMPTY_VALUE = null;

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
    // Set special empty val on control
    this.control.setValue(SPECIAL_EMPTY_VALUE);
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
