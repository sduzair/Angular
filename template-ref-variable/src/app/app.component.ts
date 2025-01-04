import { Component } from "@angular/core";
import { CountdownTimerComponent } from "./child/child.component";

@Component({
  selector: "app-root",
  imports: [CountdownTimerComponent],
  template: `<div>
    <button (click)="countdownTimer.start()">Start</button>
    <button (click)="countdownTimer.stop()">Stop</button>
    <button (click)="countdownTimer.reset()">Reset</button>
    <div>{{ countdownTimer.seconds }}</div>
    <app-countdown-timer #countdownTimer />
  </div>`,
  styles: [],
})
export class AppComponent {}
