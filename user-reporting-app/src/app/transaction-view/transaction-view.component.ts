import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { combineLatestWith, debounceTime, map } from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import { RouteExtrasFromSearch } from '../transaction-search/transaction-search.component';
import { AbmTableComponent } from './abm-table/abm-table.component';
import { AbstractTransactionViewComponent } from './abstract-transaction-view.component';
import { EmtTableComponent } from './emt-table/emt-table.component';
import { FofTableComponent } from './fof-table/fof-table.component';
import { OlbTableComponent } from './olb-table/olb-table.component';
import { WiresTableComponent } from './wires-table/wires-table.component';

@Component({
  selector: 'app-transaction-view',
  imports: [
    CommonModule,
    MatToolbarModule,
    FofTableComponent,
    MatSelectModule,
    MatTabsModule,
    AbmTableComponent,
    OlbTableComponent,
    EmtTableComponent,
    MatChip,
    MatButton,
    WiresTableComponent,
  ],
  template: `
    <div class="row row-cols-1 mx-0">
      <mat-toolbar class="col">
        <mat-toolbar-row class="px-0 header-toolbar-row">
          <div class="flex-fill"></div>
          <button
            type="button"
            color="primary"
            mat-flat-button
            [disabled]="(selectionControlHasChanges$ | async) === false">
            Save
          </button>
        </mat-toolbar-row>
      </mat-toolbar>
    </div>
    @if (selectionModel$ | async; as selectionModel) {
      <mat-tab-group
        class="col tab-group"
        mat-stretch-tabs="false"
        mat-align-tabs="start">
        <mat-tab>
          <ng-template mat-tab-label>
            Flow of Funds
            <mat-chip class="ms-1" disableRipple>
              {{ fofSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-fof-table
            [fofSourceData]="(fofSourceData$ | async) || []"
            [selection]="selectionModel" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            ABM
            <mat-chip class="ms-1" disableRipple>
              {{ abmSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-abm-table
            [abmSourceData]="(abmSourceData$ | async) || []"
            [selection]="selectionModel" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            OLB
            <mat-chip class="ms-1" disableRipple>
              {{ olbSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-olb-table
            [olbSourceData]="(olbSourceData$ | async) || []"
            [selection]="selectionModel" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            EMT
            <mat-chip class="ms-1" disableRipple>
              {{ emtSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-emt-table
            [emtSourceData]="(emtSourceData$ | async) || []"
            [selection]="selectionModel"
        /></mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            Wires
            <mat-chip class="ms-1" disableRipple>
              {{ wiresSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-wires-table
            [wiresSourceData]="(wiresSourceData$ | async) || []"
            [selection]="selectionModel" />
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styleUrl: './transaction-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionViewComponent extends AbstractTransactionViewComponent {
  fofSourceData$ = this.searchResult$.pipe(
    map(
      (search) =>
        search.find((res) => res.sourceId === 'FlowOfFunds')?.sourceData!,
    ),
  );

  abmSourceData$ = this.searchResult$.pipe(
    map((search) => search.find((res) => res.sourceId === 'ABM')?.sourceData!),
  );

  olbSourceData$ = this.searchResult$.pipe(
    map((search) => search.find((res) => res.sourceId === 'OLB')?.sourceData!),
  );

  emtSourceData$ = this.searchResult$.pipe(
    map((search) => search.find((res) => res.sourceId === 'EMT')?.sourceData!),
  );

  wiresSourceData$ = this.searchResult$.pipe(
    map(
      (search) => search.find((res) => res.sourceId === 'Wires')?.sourceData!,
    ),
  );

  private selectionsLastSaved$ = this.selections$.pipe(
    map(
      (selections) =>
        new Set(selections.map((sel) => sel.flowOfFundsAmlTransactionId)),
    ),
  );

  selectionControlHasChanges$ = this.selectionsCurrent$
    .pipe(debounceTime(200))
    .pipe(
      combineLatestWith(this.selectionsLastSaved$),
      map(
        ([selections, selectionsLastSaved]) =>
          selections.length !== selectionsLastSaved.size ||
          !selections.every((sel) =>
            selectionsLastSaved.has(sel.flowOfFundsAmlTransactionId),
          ),
      ),
    );
}

export const searchResultResolver: ResolveFn<boolean> = (
  _route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const caseRecordStore = inject(CaseRecordStore);

  const routeExtras = inject(Router).currentNavigation()?.extras.state as
    | RouteExtrasFromSearch
    | undefined;

  if (!routeExtras) {
    return true;
  }

  const { searchParams, searchResult } = routeExtras;
  caseRecordStore.setSearchParams(searchParams);
  caseRecordStore.setSearchResult(searchResult);
  return true;
};

export interface TableSelectionType {
  flowOfFundsAmlTransactionId: string;
}
