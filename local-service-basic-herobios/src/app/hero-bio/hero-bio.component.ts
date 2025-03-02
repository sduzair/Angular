import {
  ChangeDetectionStrategy,
  Component,
  Input,
  type OnInit,
} from "@angular/core";
import { HeroCacheService } from "../hero-cache.service";
import { FormsModule } from "@angular/forms";
import type { Hero } from "../hero.service";

@Component({
  selector: "app-hero-bio",
  imports: [FormsModule],
  template: `
    <h4>{{ hero.name }}</h4>
    <textarea cols="30" [(ngModel)]="hero.description"></textarea>
  `,
  styleUrl: "./hero-bio.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HeroCacheService],
})
export class HeroBioComponent implements OnInit {
  @Input({ required: true })
  heroId!: number;
  constructor(private heroCacheService: HeroCacheService) {}
  ngOnInit(): void {
    this.heroCacheService.getHeroById(this.heroId);
  }
  get hero(): Hero {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return this.heroCacheService.hero!;
  }
}
