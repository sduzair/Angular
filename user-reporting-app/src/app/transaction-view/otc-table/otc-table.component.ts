import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  TrackByFunction,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { map, take } from 'rxjs';
import { CaseRecordStore } from '../../aml/case-record.store';
import { IFilterForm } from '../../base-table/abstract-base-table';
import { BaseTableComponent } from '../../base-table/base-table.component';
import { OTCSourceData } from '../../transaction-search/transaction-search.service';
import { LocalHighlightsService } from '../local-highlights.service';
import { TableSelectionType } from '../transaction-view.component';

@Component({
  selector: 'app-otc-table',
  imports: [BaseTableComponent, CommonModule, MatTableModule, MatCheckbox],
  template: `
    <app-base-table
      #baseTable
      [data]="this.otcSourceData"
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
      [highlightedRecords]="highlightedRecords"
      [filterFormHighlightSelectFilterKey]="'_uiPropHighlightColor'"
      [filterFormHighlightSideEffect]="filterFormHighlightSideEffect"
      [sortingAccessorDateTimeTuples]="sortingAccessorDateTimeTuples"
      [sortedBy]="'transactionDate'">
      <!-- Selection Model -->
      <ng-container
        matColumnDef="select"
        [sticky]="baseTable.isStickyColumn('select')">
        <th
          mat-header-cell
          *matHeaderCellDef
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
          [class.sticky-cell]="baseTable.isStickyColumn('select')">
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtcTableComponent<
  TSelection extends {
    [K in keyof TableSelectionType]: string;
  },
> {
  dataColumnsValues: (keyof OTCSourceData)[] = [
    'postingDate',
    'transactionDate',
    'transactionTime',
    'accountCurrency',
    'accountNumber',
    'acctCurrAmount',
    'acctHoldersAll',
    'actualCurrencyCD',
    'branchTransit',
    'caseAccountNumber',
    'caseTransitNumber',
    'cdtAcctShortName',
    'crdrCode',
    'creditAmount',
    'creditedAccount',
    'creditedTransit',
    'creditorId',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'dbtAcctShortName',
    'debitAmount',
    'debitedAccount',
    'debitedTransit',
    'aggregatedCheques',
    'chequeBreakdown',
    'processingDate',
    'conductor',
    'caseEcif',
    'flowOfFundsAccountCurrency',
    'flowOfFundsAmlId',
    'flowOfFundsCasePartyKey',
    'flowOfFundsConductorPartyKey',
    'flowOfFundsCreditAmount',
    'flowOfFundsCreditedAccount',
    'flowOfFundsCreditedTransit',
    'flowOfFundsDebitAmount',
    'flowOfFundsDebitedAccount',
    'flowOfFundsDebitedTransit',
    'flowOfFundsPostingDate',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionDesc',
    'flowOfFundsTransactionTime',
    'channelCd',
    'origCurrAmount',
    'origcurrCashAmount',
    'origCurrencyCD',
    'sourceTransactionId',
    'strCaAccount',
    'strCaAccountCurrency',
    'strCaAccountHolderCifId',
    'strCaAccountStatus',
    'strCaAmount',
    'strCaBeneficiaryInd',
    'strCaBranch',
    'strCaCurrency',
    'strCaDispositionType',
    'strCaFiNumber',
    'strCaInvolvedInInd',
    'strReportingEntity',
    'strReportingEntityOpp',
    'strSaAmount',
    'strSaConductorInd',
    'strSaCurrency',
    'strSaDirection',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaOboInd',
    'strTransactionStatus',
    'transactionCurrencyAmount',
    'transactionCurrency',
    'transactionDescription',
    'transactionExecutionLocalTimestamp',
    'cardNumber',
    'amlId',
    'transactionId',
    'sequenceNumberDescr',
    'flowOfFundsSource',
    'flowOfFundsSourceTransactionId',
    'flowOfFundsAmlTransactionId',
  ];

  dataColumnsIgnoreValues: (keyof OTCSourceData)[] = [
    'crdrCode',
    'branchTransit',
    'strCaAccount',
    'strCaAccountCurrency',
    'strCaAccountHolderCifId',
    'strCaAccountStatus',
    'strCaAmount',
    'strCaBeneficiaryInd',
    'strCaBranch',
    'strCaCurrency',
    'strCaDispositionType',
    'strCaFiNumber',
    'strCaInvolvedInInd',
    'strReportingEntity',
    'strReportingEntityOpp',
    'strSaAmount',
    'strSaConductorInd',
    'strSaCurrency',
    'strSaDirection',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaOboInd',
    'strTransactionStatus',
    'origCurrAmount',
    'origcurrCashAmount',
    'origCurrencyCD',
    'sourceTransactionId',
    'transactionId',
    'flowOfFundsAccountCurrency',
    'flowOfFundsAmlId',
    'flowOfFundsCasePartyKey',
    'flowOfFundsConductorPartyKey',
    'flowOfFundsCreditAmount',
    'flowOfFundsCreditedAccount',
    'flowOfFundsCreditedTransit',
    'flowOfFundsDebitAmount',
    'flowOfFundsDebitedAccount',
    'flowOfFundsDebitedTransit',
    'flowOfFundsPostingDate',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionDesc',
    'flowOfFundsTransactionTime',
    'creditorId',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'caseTransitNumber',
    'caseAccountNumber',
    'accountCurrency',
    'accountNumber',
    'acctCurrAmount',
    'acctHoldersAll',
    'actualCurrencyCD',
    'customer2AccountCurrencyCode',
    'customer2AccountHolderCifId',
    'customer2AccountStatus',
    'executionLocalDateTime',
    'holdingBranchKey',
    'oppAccountNumber',
    'oppProdType',
    'oppTransitNumber',
    'rowUpdateDate',
    'splittableColumnValue',
    'splittingDelimiter',
    'systemJournalId',
    'tellerId',
    'transactionExecutionLocalTimestamp',
    'transactionCurrencyAmount',
    'transactionCurrency',
  ];

  displayedColumns = ['select' as const];

  displayColumnHeaderMap: Partial<
    Record<
      | Extract<keyof OTCSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  > = {
    accountCurrency: 'Acct Ccy',
    accountNumber: 'Acct No',
    acctCurrAmount: 'Acct Amt',
    acctHoldersAll: 'Acct Holders',
    actualCurrencyCD: 'Actual Ccy',
    aggregatedCheques: 'Agg Cheques',
    amlId: 'AML ID',
    branchTransit: 'Br/Transit',
    cardNumber: 'Card No',
    caseAccountNumber: 'Case Acct No',
    caseEcif: 'Case ECIF',
    caseTransitNumber: 'Case Transit',
    cdtAcctShortName: 'CDT Acct Name',
    channelCd: 'Channel',
    chequeBreakdown: 'Cheque Details',
    conductor: 'Conductor',
    crdrCode: 'CR/DR',
    creditAmount: 'Credit Amt',
    creditedAccount: 'Credit Acct',
    creditedTransit: 'Credit Transit',
    creditorId: 'Creditor ID',
    customer1AccountHolderCifId: 'Cust 1 CIF',
    customer1AccountStatus: 'Cust 1 Status',
    customer2AccountCurrencyCode: 'Cust 2 Ccy',
    customer2AccountHolderCifId: 'Cust 2 CIF',
    customer2AccountStatus: 'Cust 2 Status',
    dbtAcctShortName: 'DBT Acct Name',
    debitAmount: 'Debit Amt',
    debitedAccount: 'Debit Acct',
    debitedTransit: 'Debit Transit',
    executionLocalDateTime: 'Exec Local Time',
    flowOfFundsAmlTransactionId: 'Flow of Funds ID',
    flowOfFundsSource: 'Source',
    flowOfFundsSourceTransactionId: 'Src Txn ID',
    holdingBranchKey: 'Hold Branch',
    oppAccountNumber: 'Opp Acct No',
    oppProdType: 'Opp Prod Type',
    oppTransitNumber: 'Opp Transit',
    origCurrAmount: 'Orig Amt',
    origcurrCashAmount: 'Orig Cash Amt',
    origCurrencyCD: 'Orig Ccy',
    postingDate: 'Posted Date',
    processingDate: 'Proc Date',
    rowUpdateDate: 'Updated',
    sequenceNumberDescr: 'Seq No',
    sourceTransactionId: 'Src Txn ID',
    splittableColumnValue: 'Split Value',
    splittingDelimiter: 'Split Delim',
    systemJournalId: 'Journal ID',
    tellerId: 'Teller ID',
    transactionCurrency: 'Txn Ccy',
    transactionCurrencyAmount: 'Txn Amt',
    transactionDate: 'Txn Date',
    transactionDescription: 'Txn Desc',
    transactionExecutionLocalTimestamp: 'Exec Timestamp',
    transactionId: 'Txn ID',
    transactionTime: 'Txn Time',
    fullTextFilterKey: 'Full Text',
    _uiPropHighlightColor: 'Highlight',
  } satisfies Partial<
    Record<
      | Extract<keyof OTCSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  >;

  stickyColumns: ('select' | keyof OTCSourceData)[] = [
    'select',
    'postingDate',
    'transactionDate',
    'transactionTime',
  ];

  selectFiltersValues: (keyof OTCSourceData)[] = [
    'accountCurrency',
    'accountNumber',
    'actualCurrencyCD',
    'amlId',
    'branchTransit',
    'cardNumber',
    'caseAccountNumber',
    'caseEcif',
    'caseTransitNumber',
    'cdtAcctShortName',
    'channelCd',
    'conductor',
    'crdrCode',
    'creditedAccount',
    'creditedTransit',
    'creditorId',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'dbtAcctShortName',
    'debitedAccount',
    'debitedTransit',
    // 'flowOfFundsAmlTransactionId',
    'flowOfFundsSource',
    // 'flowOfFundsSourceTransactionId',
    'flowOfFundsTransactionCurrency',
    'origCurrencyCD',
    // 'sequenceNumberDescr',
    // 'sourceTransactionId',
    'strCaDispositionType',
    'strReportingEntity',
    'strSaDirection',
    'strSaFundsType',
    'strTransactionStatus',
    'transactionCurrency',
    'transactionId',
    'creditAmount',
    'debitAmount',
  ];

  dateFiltersValues: (keyof OTCSourceData)[] = [
    'postingDate',
    'transactionDate',
    'processingDate',
    'flowOfFundsPostingDate',
    'flowOfFundsTransactionDate',
  ];

  dateFiltersValuesIgnore: (keyof OTCSourceData)[] = [
    'transactionTime',
    'flowOfFundsTransactionTime',
  ];

  displayedColumnsTime: (keyof OTCSourceData)[] = [
    'transactionTime',
    'flowOfFundsTransactionTime',
  ];

  dataSourceTrackBy: TrackByFunction<OTCSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  sortingAccessorDateTimeTuples: (keyof OTCSourceData)[][] = [
    ['transactionDate', 'transactionTime'],
    ['flowOfFundsTransactionDate', 'flowOfFundsTransactionTime'],
  ];

  @Input({ required: true })
  masterSelection?: SelectionModel<TSelection>;

  @Input({ required: true })
  otcSourceData!: OTCSourceData[];

  @Input({ required: true })
  selectionCount!: number;

  @Input({ required: true })
  highlightedRecords!: WritableSignal<Map<string, string>>;

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

  filterFormHighlightSideEffect = (
    highlights: { txnId: string; newColor: string }[],
  ) => {
    this.highlightsService
      .saveHighlights(this.caseRecordId, highlights)
      .pipe(take(1))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-takeuntil
      .subscribe();
  };
}
