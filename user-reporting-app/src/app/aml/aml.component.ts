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
import { CaseRecordStore } from './case-record.store';

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
          <mat-toolbar-row class="px-0 header-toolbar-row">
            <!-- BREADCRUMBS -->
            <nav class="d-flex align-items-center fs-5" aria-label="breadcrumb">
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
            <div class="flex-fill"></div>
            <mat-chip selected="true" class="last-updated-chip">
              @if (savingStatus$ | async) {
                <mat-progress-spinner
                  diameter="20"
                  mode="indeterminate"
                  class="last-updated-chip-spinner"></mat-progress-spinner>
              } @else {
                <mat-icon class="mat-accent last-updated-chip-spinner">
                  update
                </mat-icon>
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
  private readonly _router = inject(Router);
  lastUpdated$ = inject(CaseRecordStore).lastUpdated$;

  savingStatus$ = inject(CaseRecordStore).qIsSaving$;

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
