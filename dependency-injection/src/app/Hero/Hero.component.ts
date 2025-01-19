import { Component, type OnInit } from "@angular/core";
// biome-ignore lint/style/useImportType: <explanation>
import { HeroService } from "../Hero.service";
import { CommonModule } from "@angular/common";
import { from, type Observable } from "rxjs";

@Component({
  selector: "app-hero",
  imports: [CommonModule],
  template: ` <h2>Heroes:</h2>
    <p *ngFor="let hero of heroes$ | async">{{ hero }}</p>`,
  styleUrl: "./Hero.component.css",
})
export class HeroComponent {
  heroes$!: Observable<string[]>;
  constructor(public heroService: HeroService) {
    this.heroes$ = from(this.heroService.getHeroes());
  }
}
