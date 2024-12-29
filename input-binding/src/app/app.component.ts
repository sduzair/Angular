import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ChildComponent, type Hero } from "./child/child.component";
import { NgFor } from "@angular/common";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, ChildComponent, NgFor],
  template: `
    <h1>Heroes Example</h1>
    <app-child *ngFor="let hero of heroes" masterName="Spock" [hero]="hero" />
    <router-outlet />
  `,
  styles: [],
})
export class AppComponent {
  heroes: Hero[] = [
    { name: "John Doe" },
    { name: "Keanu Reeves" },
    { name: "Michael Jordan" },
  ];
}
