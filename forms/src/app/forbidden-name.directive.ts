import { Directive, Input } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator, ValidatorFn } from "@angular/forms";

@Directive({
  selector: "[appForbiddenName]",
  providers: [{ provide: NG_VALIDATORS, useExisting: ForbiddenNameValidatorDirective, multi: true }]
})
export class ForbiddenNameValidatorDirective implements Validator {
  // @Input("appForbiddenName") forbiddenName: string | undefined;

  validate(control: AbstractControl): ValidationErrors | null {
    console.log("forbiddenName");
    return this.nameValidator(new RegExp(/bob/i))(control);
  }

  nameValidator(nameRegex: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valid = nameRegex.test(control.value);
      return valid ? { nameValidator: { value: control.value } } : null;
    }
  }
}