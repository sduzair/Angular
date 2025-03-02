import { Injectable, type OnDestroy } from "@angular/core";
import type { Subscription } from "rxjs";
// biome-ignore lint/style/useImportType: injection token cannot be a type/interface
import { Hero, HeroService } from "./hero.service";

@Injectable()
export class HeroCacheService implements OnDestroy {
  hero: Hero | null = null;
  subscriptions: Subscription[] = [];
  constructor(private heroService: HeroService) {}
  ngOnDestroy(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
  }

  getHeroById(id: number): Hero {
    if (!this.hero) {
      this.subscriptions.push(
        this.heroService.getHeroById(id).subscribe((hero) => {
          this.hero = hero;
        })
      );
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      return this.hero!;
    }
    return this.hero;
  }
}
