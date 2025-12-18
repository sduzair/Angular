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
import { EmtSourceData } from '../../transaction-search/transaction-search.service';
import { TableSelectionType } from '../transaction-view.component';

@Component({
  selector: 'app-emt-table',
  imports: [BaseTableComponent, CommonModule, MatTableModule, MatCheckbox],
  template: `
    <app-base-table
      #baseTable
      [data]="this.emtSourceData"
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
  styleUrl: './emt-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmtTableComponent<
  TSelection extends {
    [K in keyof TableSelectionType]: string;
  },
> {
  dataColumnsValues: (keyof EmtSourceData)[] = [
    'depositedTimeDate',
    'depositedTimeTime',
    'depositedTime',
    'initiatedTime',
    'amount',
    'cur',
    'recipientAccountName',
    'recipientAccountNumber',
    'recipientCertapayAccount',
    'recipientEmail',
    'recipientFi',
    'recipientFiNumber',
    'recipientIpAddress',
    'recipientMobile',
    'recipientName',
    'recipientPhoneNumber',
    '_hiddenSenderAccountNameGiven',
    '_hiddenSenderAccountNameSurname',
    'senderAccountName',
    '_hiddenSenderAccountNumberTransit',
    '_hiddenSenderAccountNumberAccount',
    'senderAccountNumber',
    'senderCertapayAccount',
    'senderEmail',
    'senderFi',
    'senderFiNumber',
    'senderIpAddress',
    'senderName',
    'senderPhone',
    'senderTypeConductorEcifFlag',
    'tranType',
    'transferDetails',
    'conductorEcif',
    'contactEmail',
    'contactHandleUsed',
    '_hiddenGivenName',
    '_hiddenOtherName',
    '_hiddenSurname',
    'contactIdentifier',
    'contactMobile',
    'contactName',
    'etFwdFlag',
    'f2RDepDate',
    'f2RIndicator',
    'f2rDeptime',
    'fiRefCode',
    'id',
    'jointAccountFlag',
    'originalFiRefCode',
    'amlId',
    'caseEcif',
    'flowOfFundsAmlTransactionId',
    '_mongoid',
  ];

  dataColumnsIgnoreValues: (keyof EmtSourceData)[] = [
    'conductorEcif',
    '_hiddenGivenName',
    '_hiddenOtherName',
    '_hiddenSurname',
    'id',
    '_hiddenSenderAccountNameGiven',
    '_hiddenSenderAccountNameSurname',
    '_hiddenSenderAccountNumberTransit',
    '_hiddenSenderAccountNumberAccount',
    '_mongoid',
    'depositedTime',
    'flowOfFundsAmlTransactionId',
  ];

  displayedColumns = ['select' as const];

  displayColumnHeaderMap: Partial<
    Record<
      | Extract<keyof EmtSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  > = {
    depositedTimeDate: 'Deposited Date',
    depositedTimeTime: 'Deposited Time',
    initiatedTime: 'Initiated Time',
    amount: 'Amount',
    cur: 'Currency',
    recipientAccountName: 'Recipient Account',
    recipientAccountNumber: 'Recipient Account #',
    recipientCertapayAccount: 'Recipient Certapay',
    recipientEmail: 'Recipient Email',
    recipientFi: 'Recipient FI',
    recipientFiNumber: 'Recipient FI #',
    recipientIpAddress: 'Recipient IP',
    recipientMobile: 'Recipient Mobile',
    recipientName: 'Recipient Name',
    recipientPhoneNumber: 'Recipient Phone',
    senderAccountName: 'Sender Account',
    senderAccountNumber: 'Sender Account #',
    senderCertapayAccount: 'Sender Certapay',
    senderEmail: 'Sender Email',
    senderFi: 'Sender FI',
    senderFiNumber: 'Sender FI #',
    senderIpAddress: 'Sender IP',
    senderName: 'Sender Name',
    senderPhone: 'Sender Phone',
    senderTypeConductorEcifFlag: 'Conductor ECIF Flag',
    tranType: 'Transaction Type',
    transferDetails: 'Transfer Details',
    contactEmail: 'Contact Email',
    contactHandleUsed: 'Contact Handle',
    contactIdentifier: 'Contact ID',
    contactMobile: 'Contact Mobile',
    contactName: 'Contact Name',
    etFwdFlag: 'ET Forward Flag',
    f2RDepDate: 'F2R Deposit Date',
    f2RIndicator: 'F2R Indicator',
    f2rDeptime: 'F2R Deposit Time',
    fiRefCode: 'FI Reference Code',
    jointAccountFlag: 'Joint Account',
    originalFiRefCode: 'Original FI Ref',
    amlId: 'AML ID',
    caseEcif: 'Case ECIF',
    flowOfFundsAmlTransactionId: 'Flow of Funds ID',
    fullTextFilterKey: 'Full Text',
    _uiPropHighlightColor: 'Highlight',
  };

  stickyColumns: ('select' | keyof EmtSourceData)[] = ['select'];

  selectFiltersValues: (keyof EmtSourceData)[] = [
    'amlId',
    'amount',
    'caseEcif',
    'contactEmail',
    'contactHandleUsed',
    'contactIdentifier',
    'contactMobile',
    'contactName',
    'cur',
    'etFwdFlag',
    'originalFiRefCode',
    'recipientAccountName',
    'recipientAccountNumber',
    'recipientCertapayAccount',
    'recipientEmail',
    'recipientFi',
    'recipientFiNumber',
    'recipientIpAddress',
    'recipientMobile',
    'recipientName',
    'recipientPhoneNumber',
    'senderAccountName',
    'senderAccountNumber',
    'senderCertapayAccount',
    'senderEmail',
    'senderFi',
    'senderFiNumber',
    'senderIpAddress',
    'senderName',
    'senderPhone',
    'senderTypeConductorEcifFlag',
    'tranType',
  ];

  dateFiltersValues: (keyof EmtSourceData)[] = [
    'depositedTimeDate',
    'f2RDepDate',
  ];

  dateFiltersValuesIgnore: (keyof EmtSourceData)[] = [
    'depositedTimeTime',
    'f2rDeptime',
    'initiatedTime',
  ];

  displayedColumnsTime: (keyof EmtSourceData)[] = [
    'depositedTimeTime',
    'f2rDeptime',
  ];

  dataSourceTrackBy: TrackByFunction<EmtSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  @Input({ required: true })
  selection!: SelectionModel<TSelection>;

  @Input({ required: true })
  emtSourceData!: EmtSourceData[];
}
