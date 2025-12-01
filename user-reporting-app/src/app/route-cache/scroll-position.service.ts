import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScrollPositionService {
  private scrollPositions = new Map<string, ScrollPositions>();

  saveScrollPositions(routeKey: string, positions: ScrollPositions): void {
    this.scrollPositions.set(routeKey, positions);
  }

  getScrollPositions(routeKey: string): ScrollPositions | undefined {
    return this.scrollPositions.get(routeKey);
  }

  clearScrollPositions(routeKey: string): void {
    this.scrollPositions.delete(routeKey);
  }
}

type ScrollPositions = Record<string, [number, number]>;
