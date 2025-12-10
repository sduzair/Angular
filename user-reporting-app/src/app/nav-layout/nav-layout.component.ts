import { ArrayDataSource } from '@angular/cdk/collections';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTreeModule, MatTree } from '@angular/material/tree';
import { RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-nav-layout',
  imports: [
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="shell d-flex flex-column min-vh-100">
      <mat-sidenav mode="side" opened disableClose fixedInViewport class="nav">
        <mat-toolbar class="mb-3">Poacher UI</mat-toolbar>

        <!-- Flat tree using childrenAccessor -->
        <mat-tree
          #tree="matTree"
          [dataSource]="dataSource"
          [childrenAccessor]="childrenAccessor">
          <!-- Parent (AML ID) node -->
          <mat-tree-node
            *matTreeNodeDef="let node; when: hasChild"
            matTreeNodePadding
            class="mt-2">
            <button
              type="button"
              mat-icon-button
              matTreeNodeToggle
              aria-label="toggle">
              <mat-icon>
                {{ tree.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
              </mat-icon>
            </button>
            <button type="button" mat-icon-button disabled>
              <mat-icon>perm_identity</mat-icon>
            </button>
            <span class="mat-body-1 mb-0">{{ node.name }}</span>
          </mat-tree-node>

          <!-- Leaf nodes (routes) -->
          <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
            <button type="button" mat-icon-button>
              <mat-icon>
                {{ node.matIcon }}
              </mat-icon>
            </button>
            <a
              href="#"
              (click)="onLeafClick(node); $event.preventDefault()"
              class="mat-body-1 mb-0 text-decoration-none text-reset">
              {{ node.name }}
            </a>
          </mat-tree-node>
        </mat-tree>
      </mat-sidenav>

      <mat-sidenav-content
        class="flex-filled d-flex flex-column justify-content-center overflow-hidden">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styleUrl: './nav-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavLayoutComponent {
  @ViewChild(MatTree) tree!: MatTree<NavNode>;

  // Initial dataset
  private data: NavNode[] = [
    {
      name: 'Transaction Search',
      route: 'transactionsearch',
      matIcon: 'search',
    },
    {
      name: 'AML-12345',
      children: [
        {
          name: 'Transaction View',
          route: '/aml/AML-12345/transaction-view',
          matIcon: 'compare_arrows',
        },
        {
          name: 'Reporting UI',
          route: '/aml/AML-12345/report',
          matIcon: 'format_list_bulleted',
        },
      ],
      matIcon: 'perm_identity',
    },
    {
      name: 'AML-12345',
      children: [
        {
          name: 'Transaction View',
          route: '/aml/AML-12345/transaction-view',
          matIcon: 'compare_arrows',
        },
        {
          name: 'Reporting UI',
          route: '/aml/AML-12345/report',
          matIcon: 'format_list_bulleted',
        },
      ],
      matIcon: 'perm_identity',
    },
  ];

  // childrenAccessor for flat rendering
  childrenAccessor = (node: NavNode) => node.children ?? [];

  // Simple array data source; replace immutably to update
  dataSource = new ArrayDataSource<NavNode>(this.data);

  hasChild = (_: number, node: NavNode) => !!node.children?.length;

  private router = inject(Router);

  addAml(amlId: string) {
    const newNode: NavNode = {
      name: amlId,
      children: [
        {
          name: 'Transaction View',
          route: `/aml/${amlId}/transaction`,
          matIcon: 'compare_arrows',
        },
        {
          name: 'Reporting UI',
          route: `/aml/${amlId}/report`,
          matIcon: 'format_list_bulleted',
        },
      ],
      matIcon: 'perm_identity',
    };
    this.data = [...this.data, newNode];
    this.dataSource = new ArrayDataSource<NavNode>(this.data); // reassign for OnPush
    // Optionally expand the new parent programmatically
    queueMicrotask(() => this.tree.expand(newNode));
  }

  onLeafClick(node: NavNode) {
    if (node.route) {
      this.router.navigateByUrl(node.route);
    }
  }
}

interface NavNode {
  name: string;
  route?: string;
  children?: NavNode[];
  matIcon: string;
}
