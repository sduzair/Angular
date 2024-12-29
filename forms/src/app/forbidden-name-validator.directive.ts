import { Directive, Input } from "@angular/core";
import { type AbstractControl, NG_VALIDATORS, type ValidationErrors, type Validator, type ValidatorFn } from "@angular/forms";

@Directive({
  selector: "[appForbiddenName]",
  providers: [{ provide: NG_VALIDATORS, useExisting: ForbiddenNameValidatorDirective, multi: true }],
  standalone: true
})
export class ForbiddenNameValidatorDirective implements Validator {
  @Input({ required: true }) appForbiddenName!: string;

  validate(control: AbstractControl): ValidationErrors | null {
    return this.nameValidator(new RegExp(/bob/i))(control);
  }

  nameValidator(nameRegex: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valid = nameRegex.test(control.value);
      return valid ? { appForbiddenName : control.value  } : null;
    }
  }
}
