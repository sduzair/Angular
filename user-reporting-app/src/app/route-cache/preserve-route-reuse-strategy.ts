import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  BaseRouteReuseStrategy,
  destroyDetachedRouteHandle,
  DetachedRouteHandle,
} from '@angular/router';

@Injectable()
export class CachedRouteReuseStrategy extends BaseRouteReuseStrategy {
  private handlers = new Map<string, DetachedRouteHandle>();
  // Determines if a route should be stored for later reuse
  override shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data['reuse'] === true;
  }

  // Stores the detached route handle when shouldDetach returns true
  override store(
    route: ActivatedRouteSnapshot,
    handle: DetachedRouteHandle | null,
  ): void {
    if (!handle || route.data['reuse'] !== true) return;

    const key = this.getRouteKey(route);
    this.handlers.set(key, handle);
  }

  // Checks if a stored route should be reattached
  override shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.getRouteKey(route);
    return route.data['reuse'] === true && this.handlers.has(key);
  }

  // Returns the stored route handle for reattachment
  override retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    return route.data['reuse'] === true
      ? (this.handlers.get(key) ?? null)
      : null;
  }

  override shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }

  /**
   * Call or non aml/:amlId scope or AFTER navigation away from the aml/:amlId scope has completed.
   */
  evictAmlCase(amlId: string): void {
    const segmentToMatch = `/aml/${amlId}`;

    for (const [key, handle] of this.handlers.entries()) {
      if (key.includes(segmentToMatch)) {
        destroyDetachedRouteHandle(handle); // ngOnDestroy fires on full component tree
        this.handlers.delete(key);
      }
    }
  }

  retrieveStoredRouteHandles(): DetachedRouteHandle[] {
    return Array.from(this.handlers.values());
  }

  private getRouteKey(route: ActivatedRouteSnapshot): string {
    return route.pathFromRoot
      .map((v) => v.url.map((segment) => segment.toString()).join('/'))
      .join('/');
  }
}
