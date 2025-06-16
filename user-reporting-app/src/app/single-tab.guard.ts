import { inject } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
  Router,
  type CanActivateFn,
} from "@angular/router";

const STORAGE_KEY = "appOpenTabs";

/**
 * IMPORTANT: The route component that uses this guard must define a window unload handler to remove route entry
 *
 * @param {*} route
 * @param {*} state
 * @returns {boolean}
 */
export const singleTabGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const openTabs: GuardedRoutes | null = JSON.parse(
    localStorage.getItem(STORAGE_KEY)!,
  );
  if (!openTabs) {
    const initGuardedRoutes: GuardedRoutes = {
      routes: [route.url[0].path],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initGuardedRoutes));
    return true;
  }
  if (!openTabs.routes.includes(route.url[0].path)) {
    openTabs.routes.push(route.url[0].path);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openTabs));
    return true;
  }

  const url = router.createUrlTree(["/single-tab-guard"], {
    queryParams: { page: route.url[0].path },
  });
  return new RedirectCommand(url, {
    skipLocationChange: true,
  });
};

type GuardedRoutes = {
  routes: string[];
};

export function removePageFromOpenTabs(route: ActivatedRouteSnapshot) {
  const openTabs: GuardedRoutes | null = JSON.parse(
    localStorage.getItem(STORAGE_KEY)!,
  );
  console.assert(!!openTabs && Array.isArray(openTabs.routes));

  const updatedOpenTabs: GuardedRoutes = {
    routes: openTabs!.routes.filter((item) => item !== route.url[0].path),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOpenTabs));
}
