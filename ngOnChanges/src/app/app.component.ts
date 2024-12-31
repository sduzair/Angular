import { Component } from "@angular/core";
import { ChildComponent } from "./child/child.component";

@Component({
  selector: "app-root",
  imports: [ChildComponent],
  template: `
    <h1>Source code version</h1>
    <button (click)="newMinor()">Update minor</button>
    <button (click)="newMajor()">Update major</button>

    <app-child [major]="major" [minor]="minor" />
  `,
  styles: [],
})
export class AppComponent {
  major = 1;
  minor = 23;

  newMinor() {
    this.minor++;
  }

  newMajor() {
    this.major++;
    this.minor = 0;
  }
}
