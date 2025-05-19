import { Component } from "@angular/core";
import { provideNativeDateAdapter } from "@angular/material/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  providers: [provideNativeDateAdapter()],
  template: "<router-outlet/>",
  styles: [],
})
export class AppComponent {
  title = "mat-table";
}
