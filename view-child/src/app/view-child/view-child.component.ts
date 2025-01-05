import { Component, type OnDestroy, type OnInit } from "@angular/core";

@Component({
  selector: "app-view-child",
  imports: [],
  template: "<p>{{message}}</p>",
  styleUrl: "./view-child.component.css",
})
export class ViewChildComponent implements OnInit, OnDestroy {
  time = 10;
  intervalId = 0;
  message = "";

  start() {
    clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      this.time--;
    }, 1000);
  }
  stop() {
    clearInterval(this.intervalId);
  }
  reset() {
    this.time = 10;
    clearInterval(this.intervalId);
  }
  ngOnInit(): void {
    this.start();
  }
  ngOnDestroy(): void {
    this.time = 999;
    this.reset();
  }
}
