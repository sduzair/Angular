import { Component } from "@angular/core";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from "@angular/material/form-field";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { floatLabel: "auto", appearance: "outline" },
    },
    provideNativeDateAdapter(),
  ],
  template: "<router-outlet/>",
  styles: [],
})
export class AppComponent {
  title = "mat-table";
}
