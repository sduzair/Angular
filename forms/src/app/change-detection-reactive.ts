import { CommonModule } from "@angular/common";
import { Component, Input, OnInit } from "@angular/core";
import { UserService } from "./user.service";
import { Observable, catchError, map, of } from "rxjs";
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, ɵElement } from "@angular/forms";

// component that detects changes in a reactive form, has inline template, takes user name and password as input, and submits the form
@Component({
    standalone: true,
    selector: "change-detection-reactive",
    template: `
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label for="name">Name:</label>
          <span class="pending-input-container">
            <input type="text" id="name" formControlName="username" required/>
          </span >
          <div *ngIf="name.invalid && name.dirty && name.errors?.['required']">
              Name is required.
          </div>
          <div *ngIf="name.invalid && name.dirty && name.errors?.['nameValidator']">
              {{ name.errors?.['nameValidator']?.['value'] }} is invalid.
          </div>
          <div *ngIf="name.invalid && name.dirty && name.errors?.['nameTaken']">
              {{ name.value }} is taken.
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
        <div>
          <label for="confirmPassword">Confirm Password:</label>
          <input type="password" id="confirmPassword" formControlName="confirmPassword" required>
            <div *ngIf="confirmPassword.invalid && confirmPassword.dirty && confirmPassword.errors?.['required']">
              Password confirmation is required.
            </div>
          <div *ngIf="confirmPassword.dirty && form.errors?.['matchPasswordValidator']">
            Passwords must match.
          </div>
        </div>
        <div formGroupName="address">
          <div>
            <label for="street">Street:</label>
            <input type="text" id="street" formControlName="street" required/>
            <div *ngIf="street.invalid && street.dirty && street.errors?.['required']">
                Street is required.
            </div>
          </div>
          <div>
            <label for="city">City:</label>
            <input type="text" id="city" formControlName="city" required/>
            <div *ngIf="city.invalid && city.dirty && city.errors?.['required']">
                City is required.
            </div>
          </div>
          <div>
            <label for="state">State:</label>
            <input type="text" id="state" formControlName="state" required/>
            <div *ngIf="state.invalid && state.dirty && state.errors?.['required']">
                State is required.
            </div>
          </div>
          <div>
            <label for="zip">Zip:</label>
            <input type="text" id="zip" formControlName="zip" required/>
            <div *ngIf="zip.invalid && zip.dirty && zip.errors?.['required']">
                Zip is required.
            </div>
          </div>
        </div>
        <button type="submit" [disabled]="form.status === 'INVALID'">Submit</button>
      </form>
    `,
    styles: [`
      input.ng-valid:not([type=password]) {
        border-left: 5px solid #42A948; /* green */
        background-color: #DFF0D8; /* light green */
      }
      .pending-input-container {
        position: relative;
        &:has(.ng-pending)::after {
          position: absolute;
          top: -3.5px;
          content: "...";
          color: #42A948;
          font-size: 1.5em;
          width: 6em;
        }
      }
    `
    ],
    imports: [ReactiveFormsModule, CommonModule]
})
export class ChangeDetectionReactiveComponent implements OnInit {
  form!: FormGroupType<RegistrationForm>

  constructor(private fb: FormBuilder, private _userNameService: UserService) { }

  ngOnInit(): void {
    this.form = this.fb.nonNullable.group({
      username: this.fb.nonNullable.control('', { validators: [Validators.required, this.getNameValidator(/bob/i)], asyncValidators: [this.isUserNameTakenAsyncValidator.bind(this)], updateOn: 'blur' }),
      password: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', Validators.required],
      address: this.fb.nonNullable.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zip: ['', Validators.required]
      }),
    }, { validators: this.matchPasswordValidator });
  }


  get name() {
    return this.form.controls.username;
  }

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  get street() {
    return this.form.controls.address.controls.street;
  }

  get city() {
    return this.form.controls.address.controls.city;
  }

  get state() {
    return this.form.controls.address.controls.state;
  }
  
  get zip() {
    return this.form.controls.address.controls.zip;
  }
  
  onSubmit() {
    // console.log(this.form.value);
  }

  getNameValidator<T extends FormGroupType<RegistrationForm>['controls']['username']>(nameRegex: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const nameControl = control as T;
      const valid = nameRegex.test(nameControl.value);
      return valid ? { nameValidator: { value: nameControl.value } } : null;
    }
  }
  
  matchPasswordValidator<T extends FormGroupType<RegistrationForm>>(control: AbstractControl<any, any>): ValidationErrors | null {
    const formGroup = control as T;
    const password = formGroup.controls.password;
    const confirmPassword = formGroup.controls.confirmPassword;
    return password && confirmPassword && password.value !== confirmPassword.value ? { matchPasswordValidator: true } : null;
  }
  
  isUserNameTakenAsyncValidator<T extends FormGroupType<RegistrationForm>['controls']['username']>(control: AbstractControl): Observable<ValidationErrors | null> {
    const nameControl = control as T;
    return this._userNameService.isUserNameTaken(nameControl.value).pipe(
      map(isTaken => isTaken ? { nameTaken: true } : null),
      catchError(() => of(null))
    );
  }
}

export interface RegistrationForm {
  username: string;
  password: string;
  confirmPassword: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

function nameValidator(nameRegex: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valid = nameRegex.test(control.value);
    return valid ? { nameValidator: { value: control.value } } : null;
  }
}

export type FormGroupType<T> = FormGroup<{
  [K in keyof T]: |
    T[K] extends object
    ? T[K] extends Array<infer E>
      ? E extends object
        ? FormArray<FormGroupType<E>>
        : FormArray<FormControl<E>>
      : FormGroupType<T[K]>
    : FormControl<T[K]>;
}>;