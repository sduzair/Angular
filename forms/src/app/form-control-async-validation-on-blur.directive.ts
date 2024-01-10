import { Directive, Input, HostListener } from '@angular/core';
import { FormControl } from '@angular/forms';

@Directive({
  standalone: true,
  selector: '[appFormControlWithAsyncValidationOnBlur]',
})
export class FormControlAsyncValidationOnBlur {
  @Input() appFormControlWithAsyncValidationOnBlur!: FormControl;

  @HostListener('input')
  onInput() {
    this.setControlAsPending(this.appFormControlWithAsyncValidationOnBlur);
  }

  setControlAsPending(arg0: FormControl) {
    arg0.markAsPending();
  }
}