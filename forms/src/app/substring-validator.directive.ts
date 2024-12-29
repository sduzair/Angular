import { Directive, forwardRef, Input } from "@angular/core";
import {
  type Validator,
  type AbstractControl,
  NG_VALIDATORS,
} from "@angular/forms";

@Directive({
  selector: "[appSubstring]",
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => SubstringValidatorDirective),
      multi: true,
    },
  ],
  standalone: true,
})
export class SubstringValidatorDirective implements Validator {
  @Input({ required: true }) appSubstring!: string;

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  validate(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    return value?.includes(this.appSubstring) ? null : { appSubstring: value };
  }
}
