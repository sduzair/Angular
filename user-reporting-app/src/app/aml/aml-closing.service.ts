import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router, RouteReuseStrategy } from '@angular/router';
import { filter, take } from 'rxjs';
import { NavTreeService } from '../nav-layout/nav-tree.service';
import { CachedRouteReuseStrategy } from '../route-cache/preserve-route-reuse-strategy';

@Injectable({ providedIn: 'root' })
export class AmlClosingService {
  private router = inject(Router);
  private navTreeService = inject(NavTreeService);
  private reuseStrategy = inject(
    RouteReuseStrategy,
  ) as CachedRouteReuseStrategy;

  close(amlId: string): void {
    const amlPath = `/aml/${amlId}`;
    const isInsideScope = this.router.url.startsWith(amlPath);

    if (isInsideScope) {
      // Wait for navigation to complete so store() calls during deactivation
      // finish before we evict — prevents re-caching after eviction
      this.router.events
        .pipe(
          filter((e) => e instanceof NavigationEnd),
          take(1),
        )
        // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil
        .subscribe(() => {
          this.evictAndRemove(amlId);
        });

      this.router.navigate(['/transactionsearch']);
    } else {
      // Already outside scope — safe to evict immediately
      this.evictAndRemove(amlId);
    }
  }

  private evictAndRemove(amlId: string): void {
    this.reuseStrategy.evictAmlCase(amlId); // destroys component tree, fires ngOnDestroy
    this.navTreeService.removeAmlCase(amlId); // removes from nav tree
  }
}
