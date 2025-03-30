import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { HeroBioComponent } from "../hero-bio/hero-bio.component";
import { type Hero, HeroService } from "../hero.service";
import { tap, type Observable } from "rxjs";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-hero-bios",
  imports: [CommonModule, HeroBioComponent],
  template: `
    <p>List for Heroes and their bio:</p>
    <div class="hero-grid">
      <app-hero-bio
        class="hero-card"
        *ngFor="let hero of heroes$ | async"
        [hero]="hero"
      />
    </div>
  `,
  styleUrl: "./hero-bios.component.css",
  standalone: true,
  providers: [HeroService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBiosComponent {
  heroes$: Observable<Hero[]>;
  // heroes$ = this.heroService.
  constructor(private heroService: HeroService) {
    this.heroes$ = this.heroService.getAllHeroes();
  }
}
