import { Component } from "@angular/core";
import { ChildOutputComponent } from "./child-output/child-output.component";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-root",
  imports: [CommonModule, ChildOutputComponent],
  template: `
    <h2>Should mankind colonize Mars?</h2>
    <h3>Agree: {{ agreed }}, Disagree: {{ voters.length - agreed }}</h3>
    <app-child-output
      *ngFor="let voter of voters"
      [name]="voter"
      (voted)="onVoted($event)"
    />
  `,
  styles: [],
})
export class AppComponent {
  voters = ["John", "Emily", "Hasan"];
  agreed = 0;
  onVoted(vote: boolean) {
    if (!vote) return;
    this.agreed++;
  }
}
