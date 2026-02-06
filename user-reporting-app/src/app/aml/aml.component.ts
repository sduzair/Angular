/* eslint-disable no-param-reassign */
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  PRIMARY_OUTLET,
  ResolveFn,
  Router,
  RouterModule,
  RouterOutlet,
} from '@angular/router';
import { filter, map, Observable, startWith } from 'rxjs';
import { Breadcrumb } from '../app.routes';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { NavTreeService } from '../nav-layout/nav-tree.service';
import { CaseRecordStore, ReviewPeriod } from './case-record.store';

@Component({
  selector: 'app-aml',
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatChip,
    MatProgressSpinner,
    MatIcon,
    RouterModule,
    MatSidenavModule,
    MatButtonModule,
    ChatbotComponent,
  ],
  template: `
    <div class="container-fluid px-0 overflow-y-auto overflow-x-hidden h-100">
      <div class="row row-cols-1 mx-0 sticky-top">
        <mat-toolbar class="col">
          <mat-toolbar-row class="header-toolbar-row px-0">
            <!-- BREADCRUMBS -->
            <nav class="breadcrumbs" aria-label="breadcrumb">
              @for (
                crumb of breadcrumbs$ | async;
                track crumb.url + crumb.label
              ) {
                <div class="d-flex align-items-center">
                  @if (!crumb.isLast) {
                    <a
                      [routerLink]="[crumb.url]"
                      class="text-decoration-none text-body-secondary link-body-emphasis link-underline-opacity-0 link-underline-opacity-100-hover">
                      {{ crumb.label }}
                    </a>

                    <mat-icon
                      class="text-muted mx-2"
                      style="font-size: 20px; height: 20px; width: 20px;">
                      chevron_right
                    </mat-icon>
                  } @else {
                    <span class="fw-medium text-body" aria-current="page">
                      {{ crumb.label }}
                    </span>
                  }
                </div>
              }
            </nav>

            <!-- Info chips -->
            <div class="info-chips-container">
              <!-- Last Updated By -->
              @if (lastUpdatedBy$ | async; as updatedBy) {
                <mat-chip color="accent" class="info-chip">
                  <mat-icon>person</mat-icon>
                  {{ updatedBy }}
                </mat-chip>
              }

              <!-- Selections Count -->
              <mat-chip color="accent" class="info-chip">
                <mat-icon>checklist</mat-icon>
                @if (counts$ | async; as counts) {
                  <span>
                    {{ counts.selectionCount }}

                    @if (counts.selectionCount !== counts.startingCount) {
                      <span class="opacity-75"
                        >({{ counts.startingCount }})</span
                      >
                    }
                  </span>
                  <span> selected</span>
                }
              </mat-chip>

              <!-- Review Period(s) -->
              @if (reviewPeriods$ | async; as periods) {
                @for (period of periods; track period.start) {
                  <mat-chip color="accent" class="info-chip">
                    <mat-icon>date_range</mat-icon>
                    {{ formatReviewPeriod(period) }}
                  </mat-chip>
                }
              }
            </div>

            <mat-chip
              color="accent"
              selected="true"
              class="last-updated-chip info-chip">
              @if (savingStatus$ | async) {
                <mat-progress-spinner
                  diameter="20"
                  mode="indeterminate"
                  class="last-updated-chip-spinner"></mat-progress-spinner>
              } @else {
                <mat-icon class="last-updated-chip-spinner">update</mat-icon>
              }
              Last Updated:
              {{ lastUpdated$ | async | date: 'short' }}
            </mat-chip>
          </mat-toolbar-row>
        </mat-toolbar>
      </div>
      <mat-drawer-container hasBackdrop="false" appScrollPositionPreserve>
        <mat-drawer
          position="end"
          #drawer
          class="shadow-lg border my-5"
          style="max-height: 80dvh;">
          <app-chatbot />
        </mat-drawer>
        <mat-drawer-content class="overflow-hidden">
          <div class="row mx-0">
            <div class="col">
              <router-outlet />
            </div>
          </div>
        </mat-drawer-content>
      </mat-drawer-container>
      <button
        type="button"
        mat-fab
        color="primary"
        class="position-fixed end-0 bottom-0 me-4 mb-4 z-3"
        (click)="drawer.toggle()">
        <mat-icon>auto_awesome</mat-icon>
      </button>
    </div>
  `,
  styleUrl: './aml.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmlComponent implements OnInit {
  private caseRecordStore = inject(CaseRecordStore);
  private readonly _router = inject(Router);
  lastUpdated$ = this.caseRecordStore.lastUpdated$;

  savingStatus$ = this.caseRecordStore.qIsSaving$;

  breadcrumbs$!: Observable<Breadcrumb[]>;

  ngOnInit(): void {
    // Listen to navigation events to rebuild breadcrumbs
    this.breadcrumbs$ = this._router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null), // Trigger initial build
      map(() => this._buildBreadcrumb(this._router.routerState.snapshot.root)),
    );
  }

  private _buildBreadcrumb(
    route: ActivatedRouteSnapshot, // CHANGED: Now takes a Snapshot
    url = '',
    breadcrumbs: Breadcrumb[] = [],
  ): Breadcrumb[] {
    // 1. Filter children using the snapshot's children array
    // Snapshot children are fully resolved for the current navigation
    const children = route.children.filter(
      (child) => child.outlet === PRIMARY_OUTLET,
    );

    if (children.length === 0) {
      if (breadcrumbs.length > 0) {
        breadcrumbs[breadcrumbs.length - 1].isLast = true;
      }
      return breadcrumbs;
    }

    // 2. Iterate (typically only one primary child is active)
    for (const child of children) {
      const routeURL: string = child.url
        .map((segment) => segment.path)
        .join('/');

      let nextUrl = url;
      if (routeURL !== '') {
        nextUrl = `${url}/${routeURL}`;
      }

      // 3. Get the title from the snapshot data
      // (Angular automatically resolves the 'title' property into data['title'] or title property)
      const routeTitle = child.title;

      if (routeTitle) {
        // Avoid duplicates (common with empty path redirects)
        const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
        const isDuplicate =
          lastCrumb &&
          lastCrumb.label === routeTitle &&
          lastCrumb.url === nextUrl;

        if (!isDuplicate) {
          breadcrumbs.push({
            label: routeTitle,
            url: nextUrl,
            isLast: false,
          });
        }
      }

      // 4. Recurse
      return this._buildBreadcrumb(child, nextUrl, breadcrumbs);
    }

    return breadcrumbs;
  }

  counts$ = this.caseRecordStore.selectionsComputed$.pipe(
    map((selections) => ({
      selectionCount: selections.length,
      startingCount: selections.flatMap((sel) => sel.startingActions).length,
    })),
  );

  lastUpdatedBy$ = this.caseRecordStore.state$.pipe(
    map((state) => state.lastUpdatedBy ?? state.createdBy),
  );

  reviewPeriods$ = this.caseRecordStore.state$.pipe(
    map((state) => state.searchParams.reviewPeriodSelection),
  );

  formatReviewPeriod(period: ReviewPeriod): string {
    const start = new Date(period.start).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(period.end).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `${start} - ${end}`;
  }
}

export const amlNavTreeResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
) => {
  const navTreeService = inject(NavTreeService);

  const amlId = route.paramMap.get('amlId')!;

  if (!navTreeService.hasAmlCase(amlId)) {
    navTreeService.addAmlCase(amlId);
  }

  return true;
};
