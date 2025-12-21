import { ArrayDataSource } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  inject,
  TrackByFunction,
  AfterViewInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
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
import { filter } from 'rxjs';

interface NavNode {
  name: string;
  route?: string; // Optional: Parents might not have a route
  children?: NavNode[];
  matIcon: string;
  id: string; // unique ID for tracking
}

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
    MatTreeNodePadding,
  ],
  template: `
    <!-- d-flex flex-column h-100: Full height flex container -->
    <mat-sidenav-container class="d-flex flex-column h-100 overflow-hidden">
      <!-- w-auto: Width auto adapts to content (or set fixed width like style="width: 250px") -->
      <!-- border-end: Bootstrap border utility -->
      <mat-sidenav
        mode="side"
        opened
        disableClose
        fixedInViewport
        class="app-nav border-end shadow-sm">
        <!-- px-3: Horizontal padding -->
        <mat-toolbar class="px-3 mb-2 border-bottom">
          <span>Poacher UI</span>
        </mat-toolbar>

        <mat-tree
          #tree="matTree"
          [dataSource]="dataSource"
          [childrenAccessor]="childrenAccessor"
          [trackBy]="trackById"
          class="px-2">
          <!-- PARENT NODE TEMPLATE -->
          <mat-tree-node
            *matTreeNodeDef="let node; when: hasChild"
            matTreeNodePadding
            class="py-1">
            <div
              class="d-flex align-items-center w-100 p-1 rounded app-hover-bg">
              <button
                type="button"
                mat-icon-button
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
            </div>
          </mat-tree-node>

          <!-- LEAF NODE TEMPLATE -->
          <mat-tree-node
            *matTreeNodeDef="let node"
            class="py-1"
            matTreeNodePadding>
            <a
              [routerLink]="node.route"
              routerLinkActive="app-hover-bg-active"
              class="d-flex align-items-center w-100 p-1 rounded app-hover-bg text-decoration-none transition-base"
              style="cursor: pointer;">
              <!-- use ms-4 to indent to align with parent text (skips toggle button (chevron_right) width) -->
              <mat-icon class="me-2">
                {{ node.matIcon }}
              </mat-icon>

              <span>{{ node.name }}</span>
            </a>
          </mat-tree-node>
        </mat-tree>
      </mat-sidenav>

      <mat-sidenav-content class="overflow-hidden">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styleUrl: './nav-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavLayoutComponent implements AfterViewInit {
  @ViewChild(MatTree) tree!: MatTree<NavNode>;

  // Initial Data matching your Route Config
  private data: NavNode[] = [
    {
      name: 'Transaction Search',
      route: '/transactionsearch',
      matIcon: 'search',
      id: '/transactionsearch',
    },
    {
      name: 'AML-12345',
      matIcon: 'folder_shared',
      id: 'AML-12345',
      children: [
        {
          name: 'Transaction View',
          route: '/aml/12345/transaction-view',
          matIcon: 'compare_arrows',
          id: '/aml/12345/transaction-view',
        },
        {
          name: 'Reporting UI',
          route: '/aml/12345/reporting-ui',
          matIcon: 'table_chart',
          id: '/aml/12345/reporting-ui',
        },
      ],
    },
  ];

  childrenAccessor = (node: NavNode) => node.children ?? [];
  dataSource = new ArrayDataSource<NavNode>(this.data);
  hasChild = (_: number, node: NavNode) => !!node.children?.length;
  trackById: TrackByFunction<NavNode> = (_index: number, item: NavNode) => {
    return item.id;
  };

  // Example method to dynamically add an AML case
  addAmlCase(amlId: string) {
    const newNode: NavNode = {
      name: `AML-${amlId}`,
      matIcon: 'folder_shared',
      id: `AML-${amlId}`,
      children: [
        {
          name: 'Transaction View',
          route: `/aml/${amlId}/transaction-view`,
          matIcon: 'compare_arrows',
          id: `/aml/${amlId}/transaction-view`,
        },
        {
          name: 'Reporting Table',
          route: `/aml/${amlId}/reporting-ui`,
          matIcon: 'table_chart',
          id: `/aml/${amlId}/reporting-ui`,
        },
      ],
    };

    this.data = [...this.data, newNode];
    this.dataSource = new ArrayDataSource<NavNode>(this.data);

    // Auto-expand the new node
    queueMicrotask(() => this.tree.expand(newNode));
  }

  // Manages the expansion state.
  private readonly router = inject(Router);
  private destroyRef = inject(DestroyRef);
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

    // Traverse data to find nodes that should be open
    this.data.forEach((node) => {
      this.checkAndExpand(node, currentUrl);
    });
  }

  /**
   * Recursively checks this node or any descendant is active.
   * If true, expands THIS node.
   */
  private checkAndExpand(node: NavNode, url: string): boolean {
    // 1. Check direct match (optional, usually leaf doesn't need expanding but parent does)
    const isDirectMatch = node.route && url.includes(node.route);

    // 2. Check children
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
