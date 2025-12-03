import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { map, shareReplay, startWith } from 'rxjs';
import { SessionStateService } from '../aml/session-state.service';
import {
  AbmSourceData,
  AmlTransactionSearchService,
  EmtSourceData,
  FlowOfFundsSourceData,
  OlbSourceData,
  TransactionSearchResponse,
} from '../transaction-search/aml-transaction-search.service';
import { AbmTableComponent } from './abm-table/abm-table.component';
import { EmtTableComponent } from './emt-table/emt-table.component';
import { FofTableComponent } from './fof-table/fof-table.component';
import { OlbTableComponent } from './olb-table/olb-table.component';

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
    <mat-tab-group class="col" mat-stretch-tabs="false" mat-align-tabs="start">
      <mat-tab>
        <ng-template mat-tab-label>
          Flow of Funds
          <mat-chip class="ms-1" disableRipple>
            {{ fofSourceDataSelectionCount$ | async }}
          </mat-chip>
        </ng-template>
        <app-fof-table
          [fofSourceData]="fofSourceData"
          [selection]="selection" />
      </mat-tab>
      <mat-tab>
        <ng-template mat-tab-label>
          ABM
          <mat-chip class="ms-1" disableRipple>
            {{ abmSourceDataSelectionCount$ | async }}
          </mat-chip>
        </ng-template>
        <app-abm-table
          [abmSourceData]="abmSourceData"
          [selection]="selection" />
      </mat-tab>
      <mat-tab>
        <ng-template mat-tab-label>
          OLB
          <mat-chip class="ms-1" disableRipple>
            {{ olbSourceDataSelectionCount$ | async }}
          </mat-chip>
        </ng-template>
        <app-olb-table
          [olbSourceData]="olbSourceData"
          [selection]="selection" />
      </mat-tab>
      <mat-tab>
        <ng-template mat-tab-label>
          EMT
          <mat-chip class="ms-1" disableRipple>
            {{ emtSourceDataSelectionCount$ | async }}
          </mat-chip>
        </ng-template>
        <app-emt-table [emtSourceData]="emtSourceData" [selection]="selection"
      /></mat-tab>
    </mat-tab-group>
  `,
  styleUrl: './transaction-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionViewComponent {
  @Input() transactionSearch!: TransactionSearchResponse;
  @Input() readonly initSelections!: { flowOfFundsAmlTransactionId: string }[];

  fofSourceData: FlowOfFundsSourceData[] = this.transactionSearch.find(
    (res) => res.sourceId === 'FlowOfFunds',
  )?.sourceData!;

  abmSourceData: AbmSourceData[] = this.transactionSearch.find(
    (res) => res.sourceId === 'ABM',
  )?.sourceData!;

  olbSourceData: OlbSourceData[] = this.transactionSearch.find(
    (res) => res.sourceId === 'OLB',
  )?.sourceData!;

  emtSourceData: EmtSourceData[] = this.transactionSearch.find(
    (res) => res.sourceId === 'EMT',
  )?.sourceData!;

  selection = new SelectionModel(
    true,
    this.initSelections,
    true,
    this.selectionComparator,
  );

  selectionComparator(
    o1: TableSelectionCompareWithAmlTransactionId,
    o2: TableSelectionCompareWithAmlTransactionId,
  ): boolean {
    return o1.flowOfFundsAmlTransactionId === o2.flowOfFundsAmlTransactionId;
  }

  private selectedItems$ = this.selection.changed.pipe(
    startWith(null), // Emit initial value immediately
    map(() => this.selection.selected),
    shareReplay({ bufferSize: 1, refCount: true }), // Share among multiple subscribers
  );

  fofSourceDataSelectionCount$ = this.selectedItems$.pipe(
    map((selections) => selections.length),
  );

  abmSourceDataSelectionCount$ = this.selectedItems$.pipe(
    map(
      (selections) =>
        selections.filter((txn) =>
          txn.flowOfFundsAmlTransactionId.startsWith('ABM'),
        ).length,
    ),
  );

  olbSourceDataSelectionCount$ = this.selectedItems$.pipe(
    map(
      (selections) =>
        selections.filter((txn) =>
          txn.flowOfFundsAmlTransactionId.startsWith('OLB'),
        ).length,
    ),
  );

  emtSourceDataSelectionCount$ = this.selectedItems$.pipe(
    map(
      (selections) =>
        selections.filter(
          (txn) =>
            txn.flowOfFundsAmlTransactionId.startsWith('OLB') &&
            this.emtSourceData.findIndex(
              (emt) =>
                emt.flowOfFundsAmlTransactionId ===
                (txn as EmtSourceData).flowOfFundsAmlTransactionId,
            ) >= 0,
        ).length,
    ),
  );

  private selectionsLastSaved = new Set(
    this.initSelections.map((sel) => sel.flowOfFundsAmlTransactionId),
  );

  selectionControlHasChanges$ = this.selectedItems$.pipe(
    map(
      (currentSelections) =>
        currentSelections.length !== this.selectionsLastSaved.size ||
        !currentSelections.every((sel) =>
          this.selectionsLastSaved.has(sel.flowOfFundsAmlTransactionId),
        ),
    ),
  );
}

export const transactionSearchResolver: ResolveFn<TransactionSearchResponse> = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const amlTransactionSearchService = inject(AmlTransactionSearchService);
  const amlId = route.paramMap.get('amlId')!;
  return amlTransactionSearchService.fetchTransactionSearch(amlId);
};

export const selectionsResolver: ResolveFn<
  { flowOfFundsAmlTransactionId: string }[]
> = (_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  return inject(SessionStateService).sessionState$.pipe(
    map(({ strTransactions }) => {
      return strTransactions.map((txn) => ({
        flowOfFundsAmlTransactionId: txn.flowOfFundsAmlTransactionId,
      }));
    }),
  );
};

export interface TableSelectionCompareWithAmlTransactionId {
  flowOfFundsAmlTransactionId: string;
}
