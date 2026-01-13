import { Injectable } from '@angular/core';
import { NavNode } from './nav-layout.component';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavTreeService {
  private readonly initialData: NavNode[] = [
    {
      name: 'Transaction Search',
      route: '/transactionsearch',
      matIcon: 'search',
      id: '/transactionsearch',
    },
  ];

  private readonly treeDataSubject = new BehaviorSubject<NavNode[]>(
    this.initialData,
  );

  readonly treeData$: Observable<NavNode[]> =
    this.treeDataSubject.asObservable();

  get currentTreeData(): NavNode[] {
    return this.treeDataSubject.value;
  }

  /**
   * Adds a new AML case to the navigation tree
   * @param amlId - The AML case ID (without 'AML-' prefix)
   * @returns The newly created NavNode
   */
  addAmlCase(amlId: string): NavNode {
    const existingNode = this.findAmlCase(amlId);
    if (existingNode) {
      console.warn(`AML case ${amlId} already exists in the tree`);
      return existingNode;
    }

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
          name: 'Reporting UI',
          route: `/aml/${amlId}/reporting-ui`,
          matIcon: 'table_chart',
          id: `/aml/${amlId}/reporting-ui`,
        },
        {
          name: 'Analytics',
          route: `/aml/${amlId}/analytics`,
          matIcon: 'analytics',
          id: `/aml/${amlId}/analytics`,
        },
      ],
    };

    const updatedData = [...this.currentTreeData, newNode];
    this.treeDataSubject.next(updatedData);
    return newNode;
  }

  /**
   * Removes an AML case from the tree
   * @param amlId - The AML case ID (without 'AML-' prefix)
   * @returns true if removed, false if not found
   */
  removeAmlCase(amlId: string): boolean {
    const nodeId = `AML-${amlId}`;
    const currentData = this.currentTreeData;
    const filteredData = currentData.filter((node) => node.id !== nodeId);

    if (filteredData.length === currentData.length) {
      return false;
    }

    this.treeDataSubject.next(filteredData);
    return true;
  }

  /**
   * Finds an AML case node by ID
   * @param amlId - The AML case ID (without 'AML-' prefix)
   * @returns The NavNode if found, undefined otherwise
   */
  findAmlCase(amlId: string): NavNode | undefined {
    const nodeId = `AML-${amlId}`;
    return this.currentTreeData.find((node) => node.id === nodeId);
  }

  /**
   * Checks if an AML case exists in the tree
   * @param amlId - The AML case ID (without 'AML-' prefix)
   */
  hasAmlCase(amlId: string): boolean {
    return this.findAmlCase(amlId) !== undefined;
  }

  /**
   * Resets the tree to initial state
   */
  reset(): void {
    this.treeDataSubject.next(this.initialData);
  }

  /**
   * Get all AML cases
   */
  getAmlCases(): NavNode[] {
    return this.currentTreeData.filter((node) => node.id.startsWith('AML-'));
  }
}
