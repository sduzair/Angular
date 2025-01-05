import { type AfterViewInit, Component, ViewChild } from "@angular/core";
import { ViewChildComponent } from "./view-child/view-child.component";

@Component({
  selector: "app-root",
  imports: [ViewChildComponent],
  template: `
    <h1>Welcome to {{ title }}!</h1>

    <button (click)="viewChildComponent.start()">Start</button>
    <button (click)="viewChildComponent.stop()">Stop</button>
    <button (click)="viewChildComponent.reset()">Reset</button>
    <h3>Time: {{ time() }}</h3>
    <app-view-child />
  `,
  styles: [],
})
export class AppComponent implements AfterViewInit {
  title = "VIEW-CHILD";
  time = () => 0;

  @ViewChild(ViewChildComponent)
  viewChildComponent!: ViewChildComponent;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.time = () => this.viewChildComponent.time;
    }, 0);
  }
}
