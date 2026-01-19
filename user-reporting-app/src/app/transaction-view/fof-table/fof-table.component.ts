import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  TrackByFunction,
  ViewChild,
} from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { IFilterForm } from '../../base-table/abstract-base-table';
import { BaseTableComponent } from '../../base-table/base-table.component';
import { FlowOfFundsSourceData } from '../../transaction-search/transaction-search.service';
import { TableSelectionType } from '../transaction-view.component';
import { LocalHighlightsService } from '../local-highlights.service';
import { CaseRecordStore } from '../../aml/case-record.store';
import { map, shareReplay, take } from 'rxjs';

@Component({
  selector: 'app-fof-table',
  imports: [BaseTableComponent, CommonModule, MatTableModule, MatCheckbox],
  template: `
    <app-base-table
      #baseTable
      [data]="this.fofSourceData"
      [dataColumnsValues]="dataColumnsValues"
      [dataColumnsIgnoreValues]="dataColumnsIgnoreValues"
      [displayedColumns]="displayedColumns"
      [displayColumnHeaderMap]="displayColumnHeaderMap"
      [stickyColumns]="stickyColumns"
      [selectFiltersValues]="selectFiltersValues"
      [dateFiltersValues]="dateFiltersValues"
      [dateFiltersValuesIgnore]="dateFiltersValuesIgnore"
      [displayedColumnsTime]="displayedColumnsTime"
      [dataSourceTrackBy]="dataSourceTrackBy"
      [selection]="masterSelection!"
      [selectionKey]="'flowOfFundsAmlTransactionId'"
      [filterFormHighlightSelectFilterKey]="'_uiPropHighlightColor'"
      [filterFormHighlightSideEffect]="filterFormHighlightSideEffect"
      [sortingAccessorDateTimeTuples]="sortingAccessorDateTimeTuples"
      [sortedBy]="'flowOfFundsTransactionDate'">
      <!-- Selection Model -->
      <ng-container
        matColumnDef="select"
        [sticky]="baseTable.isStickyColumn('select')">
        <th
          mat-header-cell
          *matHeaderCellDef
          class="px-0"
          [class.sticky-cell]="baseTable.isStickyColumn('select')">
          <div>
            <mat-checkbox
              (change)="$event ? toggleAllRows() : null"
              [checked]="hasValue() && isAllSelected()"
              [indeterminate]="hasValue() && !isAllSelected()"
              [class.invisible]="!hasValue()">
            </mat-checkbox>
          </div>
        </th>
        <td
          mat-cell
          *matCellDef="let row; let i = index"
          class="px-0"
          [class.sticky-cell]="baseTable.isStickyColumn('select')"
          [ngStyle]="{
            backgroundColor:
              row[baseTable.filterFormHighlightSelectFilterKey] || '',
          }">
          <div>
            <mat-checkbox
              (click)="baseTable.onCheckBoxClickMultiToggle($event, row, i)"
              (change)="$event ? baseTable.toggleRow(row) : null"
              [checked]="masterSelection!.isSelected(row)">
            </mat-checkbox>
          </div>
        </td>
      </ng-container>
    </app-base-table>
  `,
  styleUrl: './fof-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FofTableComponent<
  TSelection extends {
    [K in keyof TableSelectionType]: string;
  },
> {
  dataColumnsValues: (keyof FlowOfFundsSourceData)[] = [
    'flowOfFundsPostingDate',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionTime',
    'flowOfFundsTransactionDesc',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsSource',
    'flowOfFundsDebitAmount',
    'flowOfFundsDebitedAccount',
    'flowOfFundsDebitedTransit',
    'flowOfFundsCreditAmount',
    'flowOfFundsCreditedAccount',
    'flowOfFundsCreditedTransit',
    'flowOfFundsAccountCurrency',
    'flowOfFundsConductorPartyKey',
    'flowOfFundsCasePartyKey',
    'flowOfFundsAmlId',
    'flowofFundsSourceTransactionId',
    'flowOfFundsAmlTransactionId',
  ];

  dataColumnsIgnoreValues: (keyof FlowOfFundsSourceData)[] = [];

  displayedColumns = ['select' as const];

  displayColumnHeaderMap: Partial<
    Record<
      | Extract<keyof FlowOfFundsSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  > = {
    flowOfFundsAccountCurrency: 'Account Currency',
    flowOfFundsAmlId: 'Aml Id',
    flowOfFundsAmlTransactionId: 'Aml Transaction Id',
    flowOfFundsCasePartyKey: 'Case Party Key',
    flowOfFundsConductorPartyKey: 'Conductor Party Key',
    flowOfFundsCreditAmount: 'Credit Amount',
    flowOfFundsCreditedAccount: 'Credited Account',
    flowOfFundsCreditedTransit: 'Credited Transit',
    flowOfFundsDebitAmount: 'Debit Amount',
    flowOfFundsDebitedAccount: 'Debited Account',
    flowOfFundsDebitedTransit: 'Debited Transit',
    flowOfFundsPostingDate: 'Posting Date',
    flowOfFundsSource: 'Source',
    flowofFundsSourceTransactionId: 'Source Transaction Id',
    flowOfFundsTransactionCurrency: 'Transaction Currency',
    flowOfFundsTransactionCurrencyAmount: 'Transaction Amount',
    flowOfFundsTransactionDate: 'Transaction Date',
    flowOfFundsTransactionDesc: 'Transaction Description',
    flowOfFundsTransactionTime: 'Transaction Time',
    fullTextFilterKey: 'Full Text',
    _uiPropHighlightColor: 'Highlight',
  };

  stickyColumns: ('select' | keyof FlowOfFundsSourceData)[] = [
    'select',
    'flowOfFundsPostingDate',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionTime',
  ];

  selectFiltersValues: (keyof FlowOfFundsSourceData)[] = [
    'flowOfFundsAccountCurrency',
    'flowOfFundsAmlId',
    'flowOfFundsCasePartyKey',
    'flowOfFundsConductorPartyKey',
    'flowOfFundsCreditedAccount',
    'flowOfFundsCreditedTransit',
    'flowOfFundsDebitedAccount',
    'flowOfFundsDebitedTransit',
    'flowOfFundsSource',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsDebitAmount',
    'flowOfFundsCreditAmount',
  ];

  dateFiltersValues: (keyof FlowOfFundsSourceData)[] = [
    'flowOfFundsPostingDate',
    'flowOfFundsTransactionDate',
  ];
  dateFiltersValuesIgnore: (keyof FlowOfFundsSourceData)[] = [
    'flowOfFundsTransactionTime',
  ];
  displayedColumnsTime: (keyof FlowOfFundsSourceData)[] = [
    'flowOfFundsTransactionTime',
  ];

  sortingAccessorDateTimeTuples: (keyof FlowOfFundsSourceData)[][] = [
    ['flowOfFundsTransactionDate', 'flowOfFundsTransactionTime'],
  ];

  dataSourceTrackBy: TrackByFunction<FlowOfFundsSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  @Input({ required: true })
  masterSelection?: SelectionModel<TSelection>;

  @Input({ required: true })
  fofSourceData!: FlowOfFundsSourceData[];

  @Input({ required: true })
  selectionCount!: number;

  @ViewChild(BaseTableComponent, { static: true })
  baseTable?: BaseTableComponent<object, '', '', never, never>;

  hasValue() {
    return this.selectionCount > 0;
  }

  isAllSelected() {
    if (!this.baseTable || !this.masterSelection) return false;

    return (
      this.baseTable.dataSource.filteredData as unknown as TSelection[]
    ).every((row) => !!this.masterSelection?.isSelected(row));
  }

  toggleAllRows(): void {
    if (!this.baseTable || !this.masterSelection) return;

    if (this.isAllSelected()) {
      this.masterSelection.deselect(
        ...(this.baseTable.dataSource.filteredData as unknown as TSelection[]),
      );
    } else {
      this.masterSelection.select(
        ...(this.baseTable.dataSource.filteredData as unknown as TSelection[]),
      );
    }
  }

  caseRecordId = '';
  constructor() {
    inject(CaseRecordStore)
      .state$.pipe(
        map(({ caseRecordId }) => caseRecordId),
        take(1),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-takeuntil
      .subscribe((caseRecordId) => {
        this.caseRecordId = caseRecordId;
      });
  }

  private highlightsService = inject(LocalHighlightsService);
  @Output() readonly highlightChange = new EventEmitter<void>();

  filterFormHighlightSideEffect = (
    highlights: { txnId: string; newColor: string }[],
  ) => {
    this.highlightsService
      .saveHighlights(this.caseRecordId, highlights)
      .pipe(take(1))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-takeuntil
      .subscribe(() => {
        this.highlightChange.emit();
      });
  };
}
