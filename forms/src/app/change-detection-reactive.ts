import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";

// component that detects changes in a reactive form, has inline template, takes user name and password as input, and submits the form
@Component({
    standalone: true,
    selector: "change-detection-reactive",
    template: `
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div>
                <label for="name">Name:</label>
                <input type="text" id="name" formControlName="name" required/>
                <div *ngIf="name.invalid && name.dirty">
                  <div *ngIf="name.errors?.['required']">
                      Name is required.
                  </div>
                  <div *ngIf="name.errors?.['nameValidator']">
                      {{ name.errors?.['nameValidator'].value }} is invalid.
                  </div>
                </div>
            </div>
            <div>
                <label for="password">Password:</label>
                <input type="password" id="password" formControlName="password" required>
                <div *ngIf="password.invalid && password.dirty">
                  <div *ngIf="password.errors?.['required']">
                    Password is required.
                  </div>
                  <div *ngIf="password.errors?.['minlength']">
                    Password must be at least 4 characters long.
                  </div>
                </div>
            </div>
            <button type="submit" [disabled]="form.status === 'INVALID'">Submit</button>
        </form>
    `,
    styles: [`
      .ng-valid[required], .ng-valid.required  {
        border-left: 5px solid #42A948; /* green */
        background-color: #DFF0D8; /* light green */
      }`
    ],
    imports: [ReactiveFormsModule, CommonModule]
})
export class ChangeDetectionReactiveComponent {
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, nameValidator(/bob/i)]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  constructor(private fb: FormBuilder) { }

  get name() {
    return this.form.controls.name;
  }

  get password() {
    return this.form.controls.password;
  }

  onSubmit() {
    console.log(this.form.value);
  }
}

function nameValidator(nameRegex: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valid = nameRegex.test(control.value);
    return valid ? { nameValidator: { value: control.value } } : null;
  }
}