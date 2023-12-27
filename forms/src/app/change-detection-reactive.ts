import { Component } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";

// component that detects changes in a reactive form, has inline template, takes user name and password as input, and submits the form
@Component({
    standalone: true,
    selector: "change-detection-reactive",
    template: `
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div>
                <label for="name">Name:</label>
                <input type="text" id="name" formControlName="name" required/>
                <!-- <div *ngIf -->
            </div>
            <div>
                <label for="password">Password:</label>
                <input type="password" id="password" formControlName="password">
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
    imports: [ReactiveFormsModule]
})
export class ChangeDetectionReactiveComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.nonNullable.group({
      name: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  get name() {
    return this.form.value.ddasdfe;
  }

  onSubmit() {
    // The form value is immutable. This line creates a new object.
    const updatedFormValue = { ...this.form.value };
    this.form.setValue(updatedFormValue);
  }
}