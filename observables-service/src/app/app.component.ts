import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { MissionControlComponent } from "./MissionControl/MissionControl.component";

@Component({
  selector: "app-root",
  imports: [MissionControlComponent],
  template: `<h1>Welcome to {{ title }}!</h1>
    <app-mission-control />`,
  styles: [],
})
export class AppComponent {
  title = "observables-service";
}
