/* eslint-disable no-param-reassign */
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIcon, MatIconModule } from '@angular/material/icon';
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
import { format, parse } from 'date-fns';
import { filter, map, Observable, startWith } from 'rxjs';
import { Breadcrumb } from '../app.routes';
import { AuthService } from '../auth.service';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import { NavTreeService } from '../nav-layout/nav-tree.service';
import { CaseRecordStore, ReviewPeriod } from './case-record.store';

@Component({
  selector: 'app-aml',
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatChipsModule,
    MatProgressSpinner,
    RouterModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    ChatbotComponent,
  ],
  template: `
    <div class="container-fluid px-0 h-100">
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
              <!-- Last Updated By / Closed By -->
              @if (isClosed$ | async) {
                @if (closedBy$ | async; as closedBy) {
                  <mat-chip color="accent" class="info-chip">
                    <mat-icon matChipAvatar>lock_person</mat-icon>
                    Closed by: {{ closedBy }}
                  </mat-chip>
                }
              } @else {
                @if (lastUpdatedBy$ | async; as updatedBy) {
                  <mat-chip color="accent" class="info-chip">
                    <mat-icon matChipAvatar>edit</mat-icon>
                    By: {{ updatedBy }}
                  </mat-chip>
                }
              }

              <!-- Params Changes -->
              @let searchParamsChanged =
                (searchParamsChanged$ | async) ?? false;
              <mat-icon
                color="warn"
                class="align-self-center"
                [class.d-none]="!searchParamsChanged"
                matTooltip="Search criteria has changed. Transaction selections may no longer reflect current search parameters."
                matTooltipPosition="below"
                aria-label="Search criteria changed warning">
                warning_amber
              </mat-icon>

              <!-- Status -->
              @if (amlCaseStatus$ | async; as status) {
                <mat-chip color="accent" class="info-chip">
                  <mat-icon matChipAvatar>label_important_outline</mat-icon>
                  {{ status }}
                </mat-chip>
              }

              <!-- Role -->
              @if (role$ | async; as role) {
                <mat-chip color="accent" class="info-chip">
                  <mat-icon matChipAvatar>shield</mat-icon>
                  {{ role }}
                </mat-chip>
              }

              <!-- Username -->
              @if (username$ | async; as username) {
                <mat-chip color="accent" class="info-chip">
                  <mat-icon matChipAvatar>person</mat-icon>
                  You: {{ username }}
                </mat-chip>
              }

              <!-- Selections Count -->
              <mat-chip color="accent" class="info-chip">
                <mat-icon matChipAvatar>checklist</mat-icon>
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
                    <mat-icon matChipAvatar>date_range</mat-icon>
                    {{ formatReviewPeriod(period) }}
                  </mat-chip>
                }
              }
            </div>

            <!-- Last Updated / Closed At (mutually exclusive) -->
            @if (isClosed$ | async) {
              <mat-chip
                color="accent"
                selected="true"
                class="last-updated-chip info-chip">
                <mat-icon matChipAvatar class="last-updated-chip-spinner"
                  >lock</mat-icon
                >
                Closed: {{ closedAt$ | async | date: 'short' }}
              </mat-chip>
            } @else {
              <mat-chip
                color="accent"
                selected="true"
                class="last-updated-chip info-chip">
                @if (savingStatus$ | async) {
                  <mat-progress-spinner
                    diameter="20"
                    mode="indeterminate"
                    class="last-updated-chip-spinner">
                  </mat-progress-spinner>
                } @else {
                  <mat-icon matChipAvatar class="last-updated-chip-spinner"
                    >update</mat-icon
                  >
                }
                Last Updated: {{ lastUpdated$ | async | date: 'short' }}
              </mat-chip>
            }
          </mat-toolbar-row>
        </mat-toolbar>
      </div>
      <mat-drawer-container hasBackdrop="false" appScrollPositionPreserve>
        <mat-drawer
          position="end"
          #drawer
          class="border my-5 chatbot-drawer">
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
        matFab
        extended
        color="primary"
        class="position-fixed z-3 ai-btn px-3"
        (click)="drawer.toggle()">
        <mat-icon class="mx-0">auto_awesome</mat-icon>
      </button>
    </div>
  `,
  styleUrl: './aml.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmlComponent implements OnInit {
  private caseRecordStore = inject(CaseRecordStore);
  private readonly _router = inject(Router);
  private authService = inject(AuthService);
  lastUpdated$ = this.caseRecordStore.lastUpdated$;

  savingStatus$ = this.caseRecordStore.qIsSaving$;
  protected searchParamsChanged$ = this.caseRecordStore.searchParamsChanged$;

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
    map(({ result: computedSelections }) => ({
      selectionCount: computedSelections.length,
      startingCount: computedSelections.flatMap((sel) => sel.startingActions)
        .length,
    })),
  );

  lastUpdatedBy$ = this.caseRecordStore.state$.pipe(
    map((state) => state.lastUpdatedBy ?? state.createdBy),
  );
  amlCaseStatus$ = this.caseRecordStore.status$;

  reviewPeriods$ = this.caseRecordStore.state$.pipe(
    map((state) => state.searchParams.reviewPeriodSelection),
  );

  // Auth-derived chips
  currentUser$ = toObservable(this.authService.currentUser);

  username$ = this.currentUser$.pipe(map((user) => user?.username ?? null));

  role$ = this.currentUser$.pipe(map((user) => user?.role ?? null));

  isClosed$ = this.caseRecordStore.state$.pipe(map((state) => state.isClosed));

  closedAt$ = this.caseRecordStore.state$.pipe(
    map((state) => state.closedAt ?? null),
  );

  closedBy$ = this.caseRecordStore.state$.pipe(
    map((state) => state.closedBy ?? null),
  );

  formatReviewPeriod(period: ReviewPeriod): string {
    const parseDate = (dateStr: string) =>
      parse(dateStr, 'yyyy/MM/dd', new Date());

    const start = format(parseDate(period.start), 'MMM d, yyyy');
    const end = format(parseDate(period.end), 'MMM d, yyyy');

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
