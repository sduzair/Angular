import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ForbiddenNameValidatorDirective } from "./forbidden-name-validator.directive";
import { SubstringValidatorDirective } from "./substring-validator.directive";

// component that detects changes in a template driven form, has inline template, takes user name and password as input, and submits the form
@Component({
  standalone: true,
  selector: "change-detection-template-driven",
  template: `
    <form #form="ngForm" (ngSubmit)="onSubmit(form)">
      <div>
        <label for="name">Name:</label>
        <input
          type="text"
          id="name"
          name="name"
          ngModel
          #name="ngModel"
          required
          minlength="4"
          appForbiddenName="Bobby"
          appSubstring="adam"
        />
        <div *ngIf="name.invalid && name.dirty">
          <div *ngIf="name.hasError('required')">Name is required</div>
          <div *ngIf="name.hasError('minlength')">
            Name must be at least 4 characters long.
          </div>
          <div *ngIf="name.hasError('appForbiddenName')">
            Name cannot be Bobby.
          </div>
          <div *ngIf="name.hasError('appSubstring')">Invalid substring.</div>
          <!-- <div *ngFor="let error of name.errors | keyvalue">
            {{ error.key }}: {{ error.value }}
          </div> -->
        </div>
      </div>
      <div>
        <label for="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          ngModel
          #password="ngModel"
          required
        />
        <div *ngIf="password.invalid && password.dirty">
          <div *ngIf="password.hasError('required')">Password is required.</div>
        </div>
      </div>
      <button type="submit" [disabled]="form.form.status === 'INVALID'">
        Submit
      </button>
    </form>
  `,
  imports: [
    FormsModule,
    CommonModule,
    SubstringValidatorDirective,
    ForbiddenNameValidatorDirective,
  ],
})
export class ChangeDetectionTemplateDrivenComponent {
  // method that takes a form value as input and logs it to the console
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  onSubmit(form: any) {
    console.log(form);
  }
}
