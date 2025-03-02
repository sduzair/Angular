import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HeroBiosComponent } from "./hero-bios/hero-bios.component";

@Component({
  selector: "app-root",
  template: `
    <h1>Welcome to {{ title }}!</h1>
    <app-hero-bios />
  `,
  styles: [],
  imports: [HeroBiosComponent],
})
export class AppComponent {
  title = "local-service-basic-herobios";
}
