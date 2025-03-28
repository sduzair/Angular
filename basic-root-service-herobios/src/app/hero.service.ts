import { Injectable } from "@angular/core";
import { from, of, switchMap, throwError, type Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class HeroService {
  heroesSeed: Hero[] = [
    {
      id: "1",
      name: "Iqbal",
      description: "Famous poet from the indian subcontinent",
    },
    {
      id: "2",
      name: "Trump",
      description: "Current president of the United States of America",
    },
    {
      id: "3",
      name: "Rosa Parks",
      description: "Black civil rights movement activist",
    },
  ];
  private readonly DB_NAME = "heroesDB";
  private readonly HERO_STORE = "hero-store";
  dBPromise: Promise<IDBDatabase>;
  constructor() {
    this.dBPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.HERO_STORE)) {
          db.createObjectStore(this.HERO_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = async (ev: Event) => {
        try {
          const db = req.result;
          await this.seedInitialData(db);
          resolve(db);
        } catch (error) {
          reject(error);
        }
      };
    });
  }
  async seedInitialData(db: IDBDatabase) {
    const count = await new Promise((resolve) => {
      const tranasction = db.transaction(this.HERO_STORE, "readonly");
      const store = tranasction.objectStore(this.HERO_STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
    });

    if (count !== 0) return;

    await new Promise<void>((resolve) => {
      const tranasction = db.transaction(this.HERO_STORE, "readwrite");
      const store = tranasction.objectStore(this.HERO_STORE);

      for (const hero of this.heroesSeed) {
        store.add(hero);
      }

      tranasction.oncomplete = () => resolve();
    });
  }
  getAllHeroes(): Observable<Hero[]> {
    return from(
      this.dBPromise.then(
        (db) =>
          new Promise<Hero[]>((resolve) => {
            const transaction = db.transaction(this.HERO_STORE, "readonly");
            const store = transaction.objectStore(this.HERO_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
          })
      )
    );
  }
  updateHeroDesc(id: string, newDesc: string) {
    return this.getHeroById(id).pipe(
      switchMap((hero) => {
        return this.updateHero({ ...hero, description: newDesc });
      })
    );
  }
  getHeroById(id: string) {
    return from(
      this.dBPromise.then(
        (db) =>
          new Promise<Hero>((resolve, reject) => {
            const transaction = db.transaction(this.HERO_STORE, "readonly");
            const store = transaction.objectStore(this.HERO_STORE);
            const req = store.getKey(id);
            req.onsuccess = () => resolve(req.result as unknown as Hero);
            req.onerror = () => reject(req.error);
          })
      )
    );
  }
  updateHero(hero: Hero) {
    return from(
      this.dBPromise.then(
        (db) =>
          new Promise<IDBValidKey>((resolve, reject) => {
            const transaction = db.transaction(this.HERO_STORE, "readwrite");
            const store = transaction.objectStore(this.HERO_STORE);
            const req = store.put(hero);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          })
      )
    );
  }
}
export type Hero = {
  id: string;
  name: string;
  description: string;
};
