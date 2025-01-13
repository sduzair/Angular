import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FormComponent } from "./form/form.component";

@Component({
  selector: "app-root",
  imports: [FormComponent],
  template: `
    <h1>Welcome to {{ title }}!</h1>
    <app-form />
  `,
  styles: [],
})
export class AppComponent {
  title = "reactive-form";
}
