import { Directive, forwardRef, Attribute } from '@angular/core';
import { Validator, AbstractControl, NG_VALIDATORS } from '@angular/forms';

@Directive({
  selector: '[appSubstringValidator]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => SubstringValidatorDirective), multi: true }
  ]
})
export class SubstringValidatorDirective implements Validator {
  constructor(@Attribute('appSubstringValidator') public substring: string) { }

  validate(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    return value && value.includes(this.substring) ? null : { 'substring': false };
  }
}
