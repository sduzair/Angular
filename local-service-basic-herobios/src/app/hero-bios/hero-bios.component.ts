import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { HeroBioComponent } from "../hero-bio/hero-bio.component";

@Component({
  selector: "app-hero-bios",
  imports: [HeroBioComponent],
  template: `
    <p>List for Heroes and their bio:</p>
    <app-hero-bio [heroId]="0" />
    <app-hero-bio [heroId]="1" />
    <app-hero-bio [heroId]="2" />
  `,
  styleUrl: "./hero-bios.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBiosComponent {}
