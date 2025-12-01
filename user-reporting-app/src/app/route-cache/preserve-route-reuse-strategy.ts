import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
} from '@angular/router';

@Injectable()
export class CachedRouteReuseStrategy implements RouteReuseStrategy {
  private handlers = new Map<string, DetachedRouteHandle>();
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Determines if a route should be stored for later reuse
    return route.data['reuse'] === true;
  }
  store(
    route: ActivatedRouteSnapshot,
    handle: DetachedRouteHandle | null,
  ): void {
    // Stores the detached route handle when shouldDetach returns true
    if (handle && route.data['reuse'] === true) {
      const key = this.getRouteKey(route);
      this.handlers.set(key, handle);
    }
  }
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    // Checks if a stored route should be reattached
    const key = this.getRouteKey(route);
    return route.data['reuse'] === true && this.handlers.has(key);
  }
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    // Returns the stored route handle for reattachment
    const key = this.getRouteKey(route);
    return route.data['reuse'] === true
      ? (this.handlers.get(key) ?? null)
      : null;
  }
  /**
   * Determines if the router should reuse the current route instance.
   * Reload current page with
   * this.router.navigateByUrl(this.router.url, {
   *   onSameUrlNavigation: "reload",
   * });
   */
  shouldReuseRoute(
    _future: ActivatedRouteSnapshot,
    _curr: ActivatedRouteSnapshot,
  ): boolean {
    // return future.routeConfig === curr.routeConfig;
    return false;
  }

  private getRouteKey(route: ActivatedRouteSnapshot): string {
    return route.routeConfig?.path ?? '';
  }
}
