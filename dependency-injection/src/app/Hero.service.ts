import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class HeroService {
  async getHeroes() {
    return Promise.resolve(["Khaled", "Martin", "Gandhi"]);
  }
}
