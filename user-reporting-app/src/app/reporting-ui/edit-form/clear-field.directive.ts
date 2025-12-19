import { Directive, HostBinding, HostListener, inject } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';

@Directive({
  selector: '[appClearField]',
})
export class ClearFieldDirective {
  private formField = inject(MatFormField, { optional: true });

  get control() {
    return this.formField!._control.ngControl?.control!;
  }

  @HostBinding('disabled')
  get isDisabled(): boolean {
    return this.control?.disabled || false;
  }

  @HostListener('click', ['$event'])
  onClick($event: Event): void {
    if (this.control.disabled) return;
    $event.stopPropagation();
    this.control.reset();
  }
}
