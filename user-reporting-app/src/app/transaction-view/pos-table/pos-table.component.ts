import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TrackByFunction,
  ViewChild,
  WritableSignal,
  inject,
} from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { map, take } from 'rxjs';
import { CaseRecordStore } from '../../aml/case-record.store';
import { IFilterForm } from '../../base-table/abstract-base-table';
import { BaseTableComponent } from '../../base-table/base-table.component';
import { POSSourceData } from '../../transaction-search/transaction-search.service';
import { LocalHighlightsService } from '../local-highlights.service';
import { TableSelectionType } from '../transaction-view.component';

@Component({
  selector: 'app-pos-table',
  imports: [BaseTableComponent, CommonModule, MatTableModule, MatCheckbox],
  template: `
    <app-base-table
      #baseTable
      [data]="this.posSourceData"
      [dataColumnsValues]="dataColumnsValues"
      [dataColumnsIgnoreValues]="dataColumnsIgnoreValues"
      [displayedColumns]="displayedColumns"
      [displayColumnHeaderMap]="displayColumnHeaderMap"
      [stickyColumns]="stickyColumns"
      [columnWidthsMap]="columnWidthsMap"
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
export class PosTableComponent<
  TSelection extends {
    [K in keyof TableSelectionType]: string;
  },
> {
  dataColumnsValues: (keyof POSSourceData)[] = [
    'postingDate',
    'transactionDate',
    'transactionTime',
    'accountCurrencyAmount',
    'accountCurrencyCD',
    'accountNumber',
    'acctHoldersAll',
    'caseAcccountNumber',
    'caseEcif',
    'caseTransitNumber',
    'strTransactionStatus',
    'transactionMemoLine2',
    'transactionMemoLine3',
    'terminalOwnerName',
    'transactionCurrencyAmount',
    'crDrCode',
    'cnpRefundIndicator',
    'cryptolndicator',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'flowOfFundsAccountCurrency',
    'flowOfFundsAmlId',
    'flowOfFundsCaseEcif',
    'flowOfFundsConductorEcif',
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
    '_hiddenIsGambling',
    '_hiddenIsService',
    'holdingBranchKey',
    'lineOfBusiness',
    'merchantCity',
    'merchantCountry',
    'merchantName',
    'merchantPostalCode',
    'merchantProvince',
    'merchantSICCode',
    'merchantStreetAddress',
    'msgTypeCode',
    'origCurrencyAmount',
    'originCurrencyCD',
    'processingDate',
    'rulesCadEquivalentAmt',
    'sequenceNumber',
    'strCaAccount',
    'strCaAccountCurrency',
    'strCaAccountHolderCifId',
    'strCaAccountStatus',
    'strCaAmount',
    'strCaBeneficiaryInd',
    'strCaBranch',
    'strCaCurrency',
    'strCaDispositionType',
    'strCaDispositionTypeOther',
    'strCaFiNumber',
    'strCaInvolvedInCifId',
    'strCaInvolvedInInd',
    'strCadEquivalentAmount',
    'strReportingEntity',
    'strSaAccount',
    'strSaAccountCurrency',
    'strSaAccountHoldersCifId',
    'strSaAccountStatus',
    'strSaAmount',
    'strSaBranch',
    'strSaConductorInd',
    'strSaCurrency',
    'strSaDirection',
    'strSaFiNumber',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaFundsTypeOther',
    'strSaOboInd',
    'strSaPurposeOfTransaction',
    'transactionExecutionLocalTimestamp',
    'transactionld',
    'additionalDescription',
    'cardNumber',
    'conductor',
    'amlId',
    'flowOfFundsSource',
    'flowOfFundsSourceId',
    'flowOfFundsAmlTransactionId',
  ];

  dataColumnsIgnoreValues: (keyof POSSourceData)[] = [
    'crDrCode',
    'holdingBranchKey',
    'strCaAccount',
    'strCaAccountCurrency',
    'strCaAccountHolderCifId',
    'strCaAccountStatus',
    'strCaAmount',
    'strCaBeneficiaryInd',
    'strCaBranch',
    'strCaCurrency',
    'strCaDispositionType',
    'strCaDispositionTypeOther',
    'strCaFiNumber',
    'strCaInvolvedInCifId',
    'strCaInvolvedInInd',
    'strCadEquivalentAmount',
    'strReportingEntity',
    'strSaAccount',
    'strSaAccountCurrency',
    'strSaAccountHoldersCifId',
    'strSaAccountStatus',
    'strSaAmount',
    'strSaBranch',
    'strSaConductorInd',
    'strSaCurrency',
    'strSaDirection',
    'strSaFiNumber',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaFundsTypeOther',
    'strSaOboInd',
    'strSaPurposeOfTransaction',
    'strTransactionStatus',
    'origCurrencyAmount',
    'originCurrencyCD',
    'transactionld',
    'flowOfFundsAccountCurrency',
    'flowOfFundsAmlId',
    'flowOfFundsCaseEcif',
    'flowOfFundsConductorEcif',
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
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'caseTransitNumber',
    'caseAcccountNumber',
    'caseEcif',
    'accountCurrencyAmount',
    'accountCurrencyCD',
    'accountNumber',
    'acctHoldersAll',
    'executionLocalDataTime',
    'rowUpdateData',
    'splittableColumnVaIue',
    'splittingDe1imiter',
    'cardAcceptorTerminalId',
    'creditorld',
    'fxTranExchangeRate',
    'indicatorTags',
    'merchantNumber',
    'octBankCountry',
    'octBankIdentifier',
    'octBankName',
    'octIntermediaryBankAddress',
    'octIntermediaryBankCity',
    'octIntermediaryBankPostalCode',
    'octIntermediaryBankProvince',
    'octSenderAcountNumber',
    'octSenderCity',
    'octSenderCountry',
    'octSenderName',
    'octSenderPostalCode',
    'octSenderProvinceNane',
    'octSenderStreetAddress',
    'puposeOfPayment',
    'thirdPartyCifld',
    'visaCredit',
    '_hiddenIsGambling',
    '_hiddenIsService',
    'lineOfBusiness',
    'transactionExecutionLocalTimestamp',
  ];

  displayedColumns = ['select' as const];

  displayColumnHeaderMap: Partial<
    Record<
      | Extract<keyof POSSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  > = {
    accountCurrencyAmount: 'Acct Amt',
    accountCurrencyCD: 'Acct Ccy',
    accountNumber: 'Acct No',
    acctHoldersAll: 'Acct Holders',
    additionalDescription: "Add'l Desc",
    amlId: 'AML ID',
    cardNumber: 'Card No',
    caseAcccountNumber: 'Case Acct No',
    caseEcif: 'Case ECIF',
    caseTransitNumber: 'Case Transit',
    cnpRefundIndicator: 'CNP Refund',
    conductor: 'Conductor',
    crDrCode: 'CR/DR',
    cryptolndicator: 'Crypto Ind',
    customer1AccountHolderCifId: 'Cust CIF',
    customer1AccountStatus: 'Cust Status',
    flowOfFundsAmlTransactionId: 'Flow of Funds ID',
    flowOfFundsSource: 'Source',
    flowOfFundsSourceId: 'Src Txn ID',
    // _hiddenIsGambling: 'Gambling',
    // _hiddenIsService: 'Service',
    holdingBranchKey: 'Hold Branch',
    lineOfBusiness: 'Line of Bus',
    merchantCity: 'Merchant City',
    merchantCountry: 'Merchant Country',
    merchantName: 'Merchant Name',
    merchantPostalCode: 'Merchant Postal',
    merchantProvince: 'Merchant Prov',
    merchantSICCode: 'Merchant SIC',
    merchantStreetAddress: 'Merchant Address',
    msgTypeCode: 'Msg Type',
    origCurrencyAmount: 'Orig Amt',
    originCurrencyCD: 'Orig Ccy',
    postingDate: 'Posted Date',
    processingDate: 'Proc Date',
    rulesCadEquivalentAmt: 'CAD Equiv',
    sequenceNumber: 'Seq No',
    strCaDispositionType: 'CA Dispo Type',
    strCaDispositionTypeOther: 'CA Dispo Other',
    strReportingEntity: 'Reporting Entity',
    strSaDirection: 'SA Direction',
    strSaFundsType: 'SA Funds Type',
    strTransactionStatus: 'Txn Status',
    terminalOwnerName: 'Terminal Owner',
    transactionCurrencyAmount: 'Txn Amt',
    transactionDate: 'Txn Date',
    transactionExecutionLocalTimestamp: 'Exec Timestamp',
    transactionld: 'Txn ID',
    transactionMemoLine2: 'Memo Line 2',
    transactionMemoLine3: 'Memo Line 3',
    transactionTime: 'Txn Time',
    fullTextFilterKey: 'Full Text',
    _uiPropHighlightColor: 'Highlight',
  } satisfies Partial<
    Record<
      | Extract<keyof POSSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  >;

  columnWidthsMap: Partial<
    Record<Extract<keyof POSSourceData, string> | 'select', string>
  > = {
    flowOfFundsAmlTransactionId: '300px',
  };

  stickyColumns: ('select' | keyof POSSourceData)[] = [
    'select',
    'postingDate',
    'transactionDate',
    'transactionTime',
  ];

  selectFiltersValues: (keyof POSSourceData)[] = [
    'accountCurrencyCD',
    'accountNumber',
    'amlId',
    'cardNumber',
    'caseAcccountNumber',
    'caseEcif',
    'caseTransitNumber',
    'cnpRefundIndicator',
    'conductor',
    'crDrCode',
    'cryptolndicator',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    // 'flowOfFundsAmlTransactionId',
    'flowOfFundsSource',
    // 'flowOfFundsSourceId',
    'flowOfFundsTransactionCurrency',
    // '_hiddenIsGambling',
    // '_hiddenIsService',
    'lineOfBusiness',
    'merchantCity',
    'merchantCountry',
    'merchantName',
    'merchantSICCode',
    'msgTypeCode',
    'originCurrencyCD',
    'sequenceNumber',
    'strCaDispositionType',
    'strReportingEntity',
    'strSaDirection',
    'strSaFundsType',
    'strTransactionStatus',
    'terminalOwnerName',
    'transactionld',
    'transactionMemoLine2',
    'transactionMemoLine3',
    'transactionCurrencyAmount',
    'rulesCadEquivalentAmt',
    'transactionExecutionLocalTimestamp',
    'additionalDescription',
  ];

  dateFiltersValues: (keyof POSSourceData)[] = [
    'postingDate',
    'transactionDate',
    'processingDate',
    'flowOfFundsPostingDate',
    'flowOfFundsTransactionDate',
  ];

  dateFiltersValuesIgnore: (keyof POSSourceData)[] = [
    'transactionTime',
    'flowOfFundsTransactionTime',
  ];

  displayedColumnsTime: (keyof POSSourceData)[] = [
    'transactionTime',
    'flowOfFundsTransactionTime',
  ];

  dataSourceTrackBy: TrackByFunction<POSSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  sortingAccessorDateTimeTuples: (keyof POSSourceData)[][] = [
    ['transactionDate', 'transactionTime'],
    ['flowOfFundsTransactionDate', 'flowOfFundsTransactionTime'],
  ];

  @Input({ required: true })
  masterSelection?: SelectionModel<TSelection>;

  @Input({ required: true })
  posSourceData!: POSSourceData[];

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
