import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TrackByFunction,
} from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { IFilterForm } from '../../base-table/abstract-base-table';
import { BaseTableComponent } from '../../base-table/base-table.component';
import { FlowOfFundsSourceData } from '../../transaction-search/aml-transaction-search.service';
import { TableSelectionCompareWithAmlTransactionId } from '../transaction-view.component';

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
      [displayedColumnsColumnHeaderMap]="displayedColumnsColumnHeaderMap"
      [stickyColumns]="stickyColumns"
      [selectFiltersValues]="selectFiltersValues"
      [dateFiltersValues]="dateFiltersValues"
      [dateFiltersValuesIgnore]="dateFiltersValuesIgnore"
      [displayedColumnsTime]="displayedColumnsTime"
      [dataSourceTrackBy]="dataSourceTrackBy"
      [selection]="selection"
      [selectionKey]="'flowOfFundsAmlTransactionId'"
      [hasMasterToggle]="false"
      [filterFormHighlightSelectFilterKey]="'_uiPropHighlightColor'">
      <!-- Selection Model -->
      <ng-container matColumnDef="select">
        <th
          mat-header-cell
          *matHeaderCellDef
          class="px-2"
          [class.sticky-cell]="baseTable.isStickyColumn('select')">
          @if (baseTable.hasMasterToggle) {
            <div>
              <mat-checkbox
                (change)="$event ? baseTable.toggleAllRows() : null"
                [checked]="selection.hasValue() && baseTable.isAllSelected()"
                [indeterminate]="
                  selection.hasValue() && !baseTable.isAllSelected()
                ">
              </mat-checkbox>
            </div>
          }
        </th>
        <td
          mat-cell
          *matCellDef="let row; let i = index"
          [class.sticky-cell]="baseTable.isStickyColumn('select')"
          [ngStyle]="{
            backgroundColor:
              row[baseTable.filterFormHighlightSelectFilterKey] || '',
          }">
          <div>
            <mat-checkbox
              (click)="baseTable.onCheckBoxClickMultiToggle($event, row, i)"
              (change)="$event ? baseTable.toggleRow(row) : null"
              [checked]="selection.isSelected(row)">
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
    [K in keyof TableSelectionCompareWithAmlTransactionId]: string;
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

  displayedColumnsColumnHeaderMap: Partial<
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

  stickyColumns: ('select' | keyof FlowOfFundsSourceData)[] = ['select'];

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

  dataSourceTrackBy: TrackByFunction<FlowOfFundsSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  @Input({ required: true })
  selection!: SelectionModel<TSelection>;

  @Input({ required: true })
  fofSourceData!: FlowOfFundsSourceData[];
}
