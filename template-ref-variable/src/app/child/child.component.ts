import { Component, type OnDestroy, type OnInit } from "@angular/core";

@Component({
  selector: "app-countdown-timer",
  imports: [],
  template: "<p>{{ message }}</p>",
  styleUrl: "./child.component.css",
})
export class CountdownTimerComponent implements OnInit, OnDestroy {
  message = "";
  seconds = 10;
  intervalId = 0;

  ngOnInit(): void {
    this.start();
  }
  ngOnDestroy(): void {
    this.reset();
  }

  start() {
    clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      this.seconds--;
      if (this.seconds === 0) {
        this.message = "Blast off!";
        clearInterval(this.intervalId);
      } else {
        this.message = `T-${this.seconds} seconds to lift off`;
      }
    }, 1000);
  }

  stop() {
    clearInterval(this.intervalId);
  }

  reset() {
    clearInterval(this.intervalId);
    this.seconds = 10;
    this.message = "";
  }
}
