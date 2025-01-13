import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import {
  type AsyncValidatorFn,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from "@angular/forms";
import { delay, map, of } from "rxjs";

@Component({
  selector: "app-form",
  imports: [ReactiveFormsModule, CommonModule],
  template: `<form [formGroup]="personForm" (ngSubmit)="onSubmit()">
    <label>First Name:<input type="text" formControlName="firstName" /></label>
    <label>Last Name:<input type="text" formControlName="lastName" /></label>
    <div formGroupName="address">
      <label
        >City:
        <input type="text" formControlName="city" />
      </label>
      <label
        >State:
        <input type="text" formControlName="state" />
      </label>
      <label
        >Country:
        <input type="text" formControlName="country" />
      </label>
    </div>
    <div formArrayName="aliases">
      <h3>Aliases</h3>
      <button (click)="addAlias()">Add alias</button>

      <div
        *ngFor="
          let alias of personForm.controls.aliases.controls;
          let i = index
        "
      >
        <label>
          Alias:
          <input type="text" [formControlName]="i" />
        </label>
      </div>
    </div>
    <p *ngFor="let error of errors">{{ error }}</p>
    <button type="submit" [disabled]="!personForm.valid">Submit</button>
  </form>`,
  styleUrl: "./form.component.css",
})
export class FormComponent {
  personForm: PersonFormType = new FormGroup(
    {
      firstName: new FormControl("", {
        validators: [
          Validators.required,
          (control) =>
            /bob/i.test(control.value)
              ? { invalidFirstName: control.value }
              : null,
        ],
      }),
      lastName: new FormControl("", { validators: [Validators.required] }),
      address: new FormGroup({
        city: new FormControl("", { validators: [Validators.required] }),
        state: new FormControl("", {
          validators: [Validators.required],
          asyncValidators: [
            ((control: FormControl<string | null>) => {
              const state = control.value;
              return of(state).pipe(
                delay(1000),
                map((state) => {
                  return states.some((prov) => prov === state)
                    ? null
                    : { invalidState: control.value };
                })
              );
            }) as AsyncValidatorFn,
          ],
        }),
        country: new FormControl("", { validators: [Validators.required] }),
      }),
      aliases: new FormArray([
        new FormControl("", { validators: [Validators.required] }),
      ]),
    },
    {
      validators: [
        ((control: PersonFormType) =>
          control.controls.firstName.value &&
          control.controls.firstName.value === control.controls.lastName.value
            ? { invalidFullName: control.value }
            : null) as ValidatorFn,
      ],
      updateOn: "blur",
    }
  );

  get errors() {
    return this.personForm.errors ? Object.keys(this.personForm.errors) : null;
  }

  addAlias() {
    this.personForm.controls.aliases.push(
      new FormControl("", [Validators.required])
    );
  }

  onSubmit() {
    console.log(
      "🚀 ~ FormComponent ~ onSubmit ~ this.person.status:",
      this.personForm.status
    );
    console.log(
      "🚀 ~ FormComponent ~ onSubmit ~ this.person.touched:",
      this.personForm.touched
    );
    console.trace(this.personForm.value);
  }
}

type PersonFormType = FormGroup<{
  firstName: FormControl<string | null>;
  lastName: FormControl<string | null>;
  address: FormGroup<{
    city: FormControl<string | null>;
    state: FormControl<string | null>;
    country: FormControl<string | null>;
  }>;
  aliases: FormArray<FormControl<string | null>>;
}>;

const states = [
  "AB", // Alberta
  "BC", // British Columbia
  "MB", // Manitoba
  "NB", // New Brunswick
  "NL", // Newfoundland and Labrador
  "NS", // Nova Scotia
  "ON", // Ontario
  "PE", // Prince Edward Island
  "QC", // Quebec
  "SK", // Saskatchewan
  "NT", // Northwest Territories
  "NU", // Nunavut
  "YT", // Yukon Territory
];
