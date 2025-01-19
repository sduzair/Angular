import { Component } from "@angular/core";
import { HeroComponent } from "./Hero/Hero.component";

@Component({
  selector: "app-root",
  template: `
    <h1>Welcome to {{ title }}!</h1>
    <app-hero />
  `,
  styles: [],
  imports: [HeroComponent],
})
export class AppComponent {
  title = "dependency-injection";
}
