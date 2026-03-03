import { ArrayDataSource } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  TrackByFunction,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  MatTree,
  MatTreeModule,
  MatTreeNodePadding,
} from '@angular/material/tree';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, take } from 'rxjs';
import { AmlCaseTeardownService } from '../aml/aml-case-teardown.service';
import {
  AmlCloseConfirmDialogComponent,
  ConfirmDialogData,
} from '../aml/aml-close-confirm-dialog.component';
import { AuthService } from '../auth.service';
import { NavTreeService } from './nav-tree.service';

@Component({
  selector: 'app-nav-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatIconButton,
    MatTreeNodePadding,
    MatDialogModule,
  ],
  template: `
    <mat-sidenav-container class="d-flex flex-column h-100">
      <mat-sidenav
        mode="side"
        opened
        disableClose
        fixedInViewport
        class="app-nav border-end shadow-sm">
        <mat-toolbar class="px-3 mb-2 border-bottom justify-content-between">
          <span>Poacher UI</span>
          <button
          class="logout-btn"
            type="button"
            matIconButton
            (click)="onLogout()"
            matTooltip="Logout"
            aria-label="Logout">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>

        <mat-tree
          #tree="matTree"
          [dataSource]="dataSource"
          [childrenAccessor]="childrenAccessor"
          [trackBy]="trackById"
          class="px-2">
          <mat-tree-node
            *matTreeNodeDef="let node; when: hasChild"
            matTreeNodePadding
            class="py-1">
            <div
              class="d-flex align-items-center w-100 p-1 rounded app-hover-bg">
              <button
                type="button"
                matIconButton
                matTreeNodeToggle
                [attr.aria-label]="'Toggle ' + node.name">
                <mat-icon>
                  {{ tree.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
                </mat-icon>
              </button>

              <mat-icon class="me-2">
                {{ node.matIcon }}
              </mat-icon>

              <span class="fw-medium user-select-none">
                {{ node.name }}
              </span>

              @if (isAmlNode(node)) {
                <button
                  type="button"
                  matIconButton
                  class="ms-auto"
                  [attr.aria-label]="'Close ' + node.name"
                  (click)="onRemoveAmlCase($event, node)">
                  <mat-icon>highlight_remove</mat-icon>
                </button>
              }
            </div>
          </mat-tree-node>

          <mat-tree-node
            *matTreeNodeDef="let node"
            class="py-1"
            matTreeNodePadding>
            <a
              [routerLink]="node.route"
              routerLinkActive="app-hover-bg-active"
              class="d-flex align-items-center w-100 p-1 rounded app-hover-bg text-decoration-none transition-base"
              style="cursor: pointer;">
              <mat-icon class="me-2">
                {{ node.matIcon }}
              </mat-icon>

              <span>{{ node.name }}</span>
            </a>
          </mat-tree-node>
        </mat-tree>
      </mat-sidenav>

      <mat-sidenav-content class="overflow-y-scroll">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styleUrl: './nav-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavLayoutComponent implements AfterViewInit {
  @ViewChild(MatTree) tree!: MatTree<NavNode>;

  private readonly navTreeService = inject(NavTreeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly amlCaseTeardownService = inject(AmlCaseTeardownService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);

  dataSource!: ArrayDataSource<NavNode>;

  childrenAccessor = (node: NavNode) => node.children ?? [];
  hasChild = (_: number, node: NavNode) => !!node.children?.length;
  trackById: TrackByFunction<NavNode> = (_index: number, item: NavNode) =>
    item.id;

  isAmlNode = (node: NavNode): boolean => node.id.startsWith('AML-');

  constructor() {
    // Subscribe to tree data changes
    this.navTreeService.treeData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe((data) => {
        this.dataSource = new ArrayDataSource<NavNode>(data);
      });
  }

  onRemoveAmlCase(event: MouseEvent, node: NavNode): void {
    event.stopPropagation();

    const amlId = node.id.replace('AML-', '');

    const dialogRef = this.dialog.open(AmlCloseConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Remove AML Case',
        message: `Unsaved changes to AML-${amlId} will be lost. Continue?`,
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
      } satisfies ConfirmDialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-takeuntil
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.amlCaseTeardownService.remove(amlId);
      });
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngAfterViewInit() {
    queueMicrotask(() => this.expandActivePath());

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe(() => {
        this.expandActivePath();
      });
  }

  expandActivePath() {
    if (!this.tree) return;

    const currentUrl = this.router.url;
    const data = this.navTreeService.currentTreeData;

    data.forEach((node) => {
      this.checkAndExpand(node, currentUrl);
    });
  }

  private checkAndExpand(node: NavNode, url: string): boolean {
    const isDirectMatch = node.route && url.includes(node.route);

    let hasActiveChild = false;
    if (node.children?.length) {
      hasActiveChild = node.children.some((child) =>
        this.checkAndExpand(child, url),
      );
    }

    if (hasActiveChild) {
      this.tree.expand(node);
      return true;
    }

    return isDirectMatch || false;
  }
}

export interface NavNode {
  name: string;
  route?: string; // Optional: Parents might not have a route
  children?: NavNode[];
  matIcon: string;
  id: string; // unique ID for tracking
}
