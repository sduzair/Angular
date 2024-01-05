import { Component, Input } from "@angular/core";
import { FormGroupType, RegistrationForm } from "./change-detection-reactive";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { PascalCasePipe } from "./pascal-case.pipe";

@Component({
  standalone: true,
  selector: "change-detection-reactive-role",
  template: `
    <label [attr.for]="key">{{ key | pascalCase }}: </label>
    <input type="checkbox" [name]="key" id="key" [formControl]="roleControl">
  `,
  imports: [ReactiveFormsModule, CommonModule, PascalCasePipe],
})
export class ChangeDetectionReactiveRoleComponent {
  @Input({ required: true }) key!: string;
  @Input({ required: true }) roleControl!: FormGroupType<RegistrationForm>['controls']['roles']['controls'][string];

  constructor() {}
}