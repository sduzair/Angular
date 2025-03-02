import { Injectable } from "@angular/core";
import { of, type Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class HeroService {
  heroes: Hero[] = [
    {
      name: "Iqbal",
      description: "Famous poet from the indian subcontinent",
    },
    {
      name: "Trump",
      description: "Current president of the United States of America",
    },
    {
      name: "Rosa Parks",
      description: "Civil rights movement activist",
    },
  ];
  getHeroById(id: number): Observable<Hero> {
    return of(this.heroes[id]);
  }
}
export type Hero = {
  name: string;
  description: string;
};
