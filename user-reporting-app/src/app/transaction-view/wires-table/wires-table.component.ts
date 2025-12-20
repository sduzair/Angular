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
import { WireSourceData } from '../../transaction-search/transaction-search.service';
import { TableSelectionType } from '../transaction-view.component';

@Component({
  selector: 'app-wires-table',
  imports: [BaseTableComponent, CommonModule, MatTableModule, MatCheckbox],
  template: `
    <app-base-table
      #baseTable
      [data]="this.wiresSourceData"
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
      [filterFormHighlightSelectFilterKey]="'_uiPropHighlightColor'"
      [sortingAccessorDateTimeTuples]="sortingAccessorDateTimeTuples"
      [sortedBy]="'transactionDate'">
      <!-- Selection Model -->
      <ng-container
        matColumnDef="select"
        [sticky]="baseTable.isStickyColumn('select')">
        <th
          mat-header-cell
          *matHeaderCellDef
          class="px-0"
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
              [checked]="selection.isSelected(row)">
            </mat-checkbox>
          </div>
        </td>
      </ng-container>
    </app-base-table>
  `,
  styleUrl: './wires-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WiresTableComponent<
  TSelection extends {
    [K in keyof TableSelectionType]: string;
  },
> {
  dataColumnsValues: (keyof WireSourceData)[] = [
    'postingDate',
    'transactionDate',
    'transactionTime',
    'awiBic',
    'bcAccount1d',
    'bcName',
    'clientToClientTransferIndicator',
    'msgTag32',
    'msgTag33',
    'msgTag50',
    'msgTag53',
    'msgTag54',
    'msgTag56',
    'msgTag59',
    'msgTag70',
    'swiftTag20SendersReference',
    'swiftTag52OrderingInstitution',
    'swiftTag57AccountWithInstitution',
    'ocAccountId',
    'ocName',
    'oiBic',
    'operationType',
    'origCurrAmount',
    'origCurrencyCd',
    'payeeAddress',
    'payerAddress',
    'processingDate',
    'selfTransfer',
    'settledAmt',
    'sourceClientId',
    'sourceTransaction1d',
    'uniqueReferenceNo',
    'wireRole',
    'amlld',
    'caseEcif',
    'flowOfFundsAmlTransactionId',
  ];

  dataColumnsIgnoreValues: (keyof WireSourceData)[] = [
    'transactionld',
    'crdrCode',
    'creditorld',
    'transit',
    'txnCode',
    'txnOrigFeed',
    'txnStatus',
    'thirdPartyC1fId',
    'rulesCadEquivalentAmt',
    'rowUpdateDate',
    'deviceType',
    'holdingBranchKey',
    'ipAddress',
    'loanNumber',
    'matchLevelReceiver',
    'mnatchLevelSender',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'customer2AccountHolderCifId',
    'customer2AccountStatus',
    'currencyConversionRate',
    'custld',
    'createDatetime',
    'conductorKey',
    'caseAccountNumber',
    'caseTransitNumber',
    'channelCd',
    'cardNumber',
    'branchTransitAccount',
    'amlTransactionId',
    'account',
    'accountCurrencyAmount',
    'accountCurrencyCd',
    'accountNumber',
    'acctHoldersAll',
    '_hiddenDate',
    '_hiddenTime',
    '_hiddenAccount',
    '_hiddenTransit',
    '_hiddenAmount',
    '_hiddenCurrency',
    '_hiddenReceiverName',
    '_hiddenReceiverAddress',
    '_hiddenSenderName',
    '_hiddenSenderStreet',
    '_hiddenSenderCity',
    '_hiddenSenderPostalCode',
    '_hiddenSenderCountry',
    '_hiddenSenderAccount',
    '_hiddenSenderOrderingInsName',
    '_hiddenSenderOrderingInsStreet',
    '_hiddenSenderOrderingInsCity',
  ];

  displayedColumns = ['select' as const];

  displayColumnHeaderMap: Partial<
    Record<
      | Extract<keyof WireSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  > = {
    account: 'Account',
    accountCurrencyAmount: 'Acct Amt',
    accountCurrencyCd: 'Acct Ccy',
    accountNumber: 'Acct No',
    acctHoldersAll: 'Acct Holders',
    amlld: 'AML ID',
    amlTransactionId: 'AML Txn ID',
    awiBic: 'AWI BIC',
    bcAccount1d: 'BC Acct ID',
    bcName: 'BC Name',
    branchTransitAccount: 'Br/Transit/Acct',
    cardNumber: 'Card No',
    caseAccountNumber: 'Case Acct No',
    caseTransitNumber: 'Case Transit',
    channelCd: 'Channel',
    clientToClientTransferIndicator: 'C2C Transfer',
    conductorKey: 'Conductor Key',
    crdrCode: 'CR/DR',
    createDatetime: 'Created',
    creditorld: 'Creditor ID',
    currencyConversionRate: 'FX Rate',
    custld: 'Cust ID',
    customer1AccountHolderCifId: 'Cust 1 CIF',
    customer1AccountStatus: 'Cust 1 Status',
    customer2AccountHolderCifId: 'Cust 2 CIF',
    customer2AccountStatus: 'Cust 2 Status',
    deviceType: 'Device',
    holdingBranchKey: 'Hold Branch',
    ipAddress: 'IP Address',
    loanNumber: 'Loan No',
    matchLevelReceiver: 'Match Lvl (Rec)',
    mnatchLevelSender: 'Match Lvl (Snd)',
    msgTag32: 'Tag 32',
    msgTag33: 'Tag 33',
    msgTag50: 'Tag 50',
    msgTag53: 'Tag 53',
    msgTag54: 'Tag 54',
    msgTag56: 'Tag 56',
    msgTag59: 'Tag 59',
    msgTag70: 'Tag 70',
    ocAccountId: 'OC Acct ID',
    ocName: 'OC Name',
    oiBic: 'OI BIC',
    operationType: 'Op Type',
    origCurrAmount: 'Orig Amt',
    origCurrencyCd: 'Orig Ccy',
    payeeAddress: 'Payee Addr',
    payerAddress: 'Payer Addr',
    postingDate: 'Posted Date',
    processingDate: 'Proc Date',
    rowUpdateDate: 'Updated',
    rulesCadEquivalentAmt: 'CAD Equiv',
    selfTransfer: 'Self Tfr',
    settledAmt: 'Settled Amt',
    sourceClientId: 'Src Client ID',
    sourceTransaction1d: 'Src Txn ID',
    swiftTag20SendersReference: 'Tag 20 (Ref)',
    swiftTag52OrderingInstitution: 'Tag 52 (Ord Inst)',
    swiftTag57AccountWithInstitution: 'Tag 57 (Acct w/ Inst)',
    thirdPartyC1fId: '3rd Party CIF',
    transactionDate: 'Txn Date',
    transactionld: 'Txn ID',
    transactionTime: 'Txn Time',
    transit: 'Transit',
    txnCode: 'Txn Code',
    txnOrigFeed: 'Txn Feed',
    txnStatus: 'Status',
    uniqueReferenceNo: 'Unique Ref',
    wireRole: 'Wire Role',
    amlId: 'AML ID',
    caseEcif: 'Case ECIF',
    flowOfFundsAmlTransactionId: 'Flow of Funds ID',
    fullTextFilterKey: 'Full Text',
    _uiPropHighlightColor: 'Highlight',
  } satisfies Partial<
    Record<
      | Extract<keyof WireSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  >;

  stickyColumns: ('select' | keyof WireSourceData)[] = [
    'select',
    'postingDate',
    'transactionDate',
    'transactionTime',
  ];

  selectFiltersValues: (keyof WireSourceData)[] = [
    'awiBic',
    'bcAccount1d',
    'bcName',
    'clientToClientTransferIndicator',
    'ocAccountId',
    'ocName',
    'oiBic',
    'operationType',
    'origCurrAmount',
    'origCurrencyCd',
    'payeeAddress',
    'payerAddress',
    'selfTransfer',
    'settledAmt',
    'sourceClientId',
    'sourceTransaction1d',
    'swiftTag20SendersReference',
    'swiftTag52OrderingInstitution',
    'swiftTag57AccountWithInstitution',
    'transactionld',
    'uniqueReferenceNo',
    'wireRole',
    'amlld',
    'caseEcif',
  ];

  dateFiltersValues: (keyof WireSourceData)[] = [
    'postingDate',
    'transactionDate',
    'processingDate',
  ];

  dateFiltersValuesIgnore: (keyof WireSourceData)[] = [];

  displayedColumnsTime: (keyof WireSourceData)[] = ['transactionTime'];

  dataSourceTrackBy: TrackByFunction<WireSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  sortingAccessorDateTimeTuples: (keyof WireSourceData)[][] = [
    ['transactionDate', 'transactionTime'],
  ];

  @Input({ required: true })
  selection!: SelectionModel<TSelection>;

  @Input({ required: true })
  wiresSourceData!: WireSourceData[];
}
