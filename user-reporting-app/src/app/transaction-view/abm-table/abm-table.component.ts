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
import { AbmSourceData } from '../../transaction-search/transaction-search.service';
import { TableSelectionType } from '../transaction-view.component';

@Component({
  selector: 'app-abm-table',
  imports: [BaseTableComponent, CommonModule, MatTableModule, MatCheckbox],
  template: `
    <app-base-table
      #baseTable
      [data]="this.abmSourceData"
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
  styleUrl: './abm-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbmTableComponent<
  TSelection extends {
    [K in keyof TableSelectionType]: string;
  },
> {
  dataColumnsValues: (keyof AbmSourceData)[] = [
    'postingDate',
    'transactionDate',
    'transactionTime',
    'transactionCurrencyAmount',
    'transactionCurrency',
    'transactionDescription',
    'thirdPartyCifId',
    'transactionExecutionLocalTimestamp',
    'transactionld',
    'accountCurrency',
    'accountNumber',
    'acctCurrAmount',
    'acctHoldersAll',
    'actualCurrencyCD',
    'amlTransactionId',
    'amountFlow',
    'atmNearestTransit',
    'atmPostalCode',
    'canadianEquivalentAmount',
    'caseAccountNumber',
    'caseTransitNumber',
    'cashAmount',
    'channelCd',
    'conductor',
    'crdrCode',
    'cardNumber',
    'creditAmount',
    'creditedAccount',
    'creditedTransit',
    'creditorId',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'customer2AccountCurrencyCode',
    'customer2AccountHolderCifId',
    'customer2AccountStatus',
    'debitAmount',
    'debitedAccount',
    'debitedTransit',
    'depositContents',
    'depositContentsDesc',
    'exchangeRateApplied',
    'terminalCity',
    'terminalCountry',
    'terminalId',
    'terminalNameLoc',
    'terminalStation',
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
    'flowOfFundsSource',
    'flowofFundsSourceTransactionId',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionDesc',
    'flowOfFundsTransactionTime',
    'executionLocalDateTime',
    'holdingBranchKey',
    'isoMessageType',
    'merchantName',
    'numberOfDeposit',
    'oppAccountNumber',
    'oppProdType',
    'oppTransitNumber',
    'origCurrAmount',
    'origcurrCashAmount',
    'origCurrencyCD',
    'processingDate',
    'rowUpdateDate',
    'sequenceNumberDescr',
    'sourceTransactionId',
    'splittableColumnValue',
    'splittingDelimiter',
    'strCaAccount',
    'strCaAccountCurrency',
    'strCaAccountHolderCifId',
    'strCaAccountStatus',
    'strCaAmount',
    'strCaBeneficiaryInd',
    'strCaBranch',
    'strCaCurrency',
    'strCaDispositionType',
    'strCaDispositionTypeOpp',
    'strCaDispositionTypeOther',
    'strCaDispositionTypeOtherOpp',
    'strCaFiNumber',
    'strCaInvolvedInCifId',
    'strCaInvolvedInInd',
    'strReportingEntity',
    'strReportingEntityOpp',
    'strSaAccount',
    'strSaAccountCurrency',
    'strSaAccountHoldersCifId',
    'strSaAccountStatus',
    'strSaAmount',
    'strSaBranch',
    'strSaConductorInd',
    'strSaCurrency',
    'strSaDirection',
    'strSaDirectionOpp',
    'strSaFiNumber',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaFundsTypeOpp',
    'strSaFundsTypeOther',
    'strSaFundsTypeOtherOpp',
    'strSaOboInd',
    'strSaPostingDate',
    'strSaPurposeOfTransaction',
    'strTransactionStatus',
    'txnType',
    'amlId',
    'caseEcif',
    '_mongoid',
    'flowOfFundsAmlTransactionId',
  ];

  dataColumnsIgnoreValues: (keyof AbmSourceData)[] = [
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
    'flowOfFundsSource',
    'flowofFundsSourceTransactionId',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionDesc',
    'flowOfFundsTransactionTime',
    '_mongoid',
    'accountCurrency',
    'accountNumber',
    'acctCurrAmount',
    'acctHoldersAll',
    'actualCurrencyCD',
    'canadianEquivalentAmount',
    'amountFlow',
    'amlTransactionId',
    'caseAccountNumber',
    'caseTransitNumber',
    'creditorId',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'customer2AccountCurrencyCode',
    'customer2AccountHolderCifId',
    'customer2AccountStatus',
    'executionLocalDateTime',
    'rowUpdateDate',
    'splittableColumnValue',
    'splittingDelimiter',
    'strCaAccount',
    'strCaAccountCurrency',
    'strCaAccountHolderCifId',
    'strCaAccountStatus',
    'strCaAmount',
    'strCaBeneficiaryInd',
    'strCaBranch',
    'strCaCurrency',
    'strCaDispositionType',
    'strCaDispositionTypeOpp',
    'strCaDispositionTypeOther',
    'strCaDispositionTypeOtherOpp',
    'strCaFiNumber',
    'strCaInvolvedInCifId',
    'strCaInvolvedInInd',
    'strReportingEntity',
    'strReportingEntityOpp',
    'strSaAccount',
    'strSaAccountCurrency',
    'strSaAccountHoldersCifId',
    'strSaAccountStatus',
    'strSaAmount',
    'strSaBranch',
    'strSaConductorInd',
    'strSaCurrency',
    'strSaDirection',
    'strSaDirectionOpp',
    'strSaFiNumber',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaFundsTypeOpp',
    'strSaFundsTypeOther',
    'strSaFundsTypeOtherOpp',
    'strSaOboInd',
    'strSaPostingDate',
    'strSaPurposeOfTransaction',
    'strTransactionStatus',
    'transactionExecutionLocalTimestamp',
    'transactionld',
    'conductor',
    'depositContentsDesc',
    'numberOfDeposit',
    'oppAccountNumber',
    'oppProdType',
    'oppTransitNumber',
    'origCurrAmount',
    'origcurrCashAmount',
    'origCurrencyCD',
    'sequenceNumberDescr',
    'thirdPartyCifId',
    'exchangeRateApplied',
    'crdrCode',
  ];

  displayedColumns = ['select' as const];

  displayColumnHeaderMap: Partial<
    Record<
      | Extract<keyof AbmSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  > = {
    accountCurrency: 'Account Currency',
    accountNumber: 'Account Number',
    acctCurrAmount: 'Account Amount',
    acctHoldersAll: 'Account Holders',
    actualCurrencyCD: 'Actual Currency',
    amlId: 'AML ID',
    amlTransactionId: 'AML Transaction ID',
    amountFlow: 'Amount Flow',
    atmNearestTransit: 'ATM Transit',
    atmPostalCode: 'ATM Postal Code',
    canadianEquivalentAmount: 'CAD Equivalent',
    cardNumber: 'Card Number',
    caseAccountNumber: 'Case Account #',
    caseEcif: 'Case ECIF',
    caseTransitNumber: 'Case Transit #',
    cashAmount: 'Cash Amount',
    channelCd: 'Channel',
    conductor: 'Conductor',
    crdrCode: 'CR/DR Code',
    creditAmount: 'Credit Amount',
    creditedAccount: 'Credited Account',
    creditedTransit: 'Credited Transit',
    creditorId: 'Creditor ID',
    customer1AccountHolderCifId: 'Cust 1 CIF ID',
    customer1AccountStatus: 'Cust 1 Status',
    customer2AccountCurrencyCode: 'Cust 2 Currency',
    customer2AccountHolderCifId: 'Cust 2 CIF ID',
    customer2AccountStatus: 'Cust 2 Status',
    debitAmount: 'Debit Amount',
    debitedAccount: 'Debited Account',
    debitedTransit: 'Debited Transit',
    depositContents: 'Deposit Contents',
    depositContentsDesc: 'Deposit Description',
    exchangeRateApplied: 'Exchange Rate',
    executionLocalDateTime: 'Execution Date/Time',
    holdingBranchKey: 'Branch Key',
    isoMessageType: 'ISO Message Type',
    merchantName: 'Merchant Name',
    numberOfDeposit: '# of Deposits',
    oppAccountNumber: 'Opp Account #',
    oppProdType: 'Opp Product Type',
    oppTransitNumber: 'Opp Transit #',
    origCurrAmount: 'Orig Amount',
    origcurrCashAmount: 'Orig Cash Amount',
    origCurrencyCD: 'Orig Currency',
    postingDate: 'Posting Date',
    processingDate: 'Processing Date',
    rowUpdateDate: 'Updated Date',
    sequenceNumberDescr: 'Sequence #',
    sourceTransactionId: 'Source Txn ID',
    splittableColumnValue: 'Splittable Value',
    splittingDelimiter: 'Split Delimiter',
    strCaAccount: 'CA Account',
    strCaAccountCurrency: 'CA Currency',
    strCaAccountHolderCifId: 'CA Holder CIF ID',
    strCaAccountStatus: 'CA Status',
    strCaAmount: 'CA Amount',
    strCaBeneficiaryInd: 'CA Beneficiary',
    strCaBranch: 'CA Branch',
    strCaCurrency: 'CA Currency',
    strCaDispositionType: 'CA Disposition',
    strCaDispositionTypeOpp: 'CA Disposition Opp',
    strCaDispositionTypeOther: 'CA Disposition Other',
    strCaDispositionTypeOtherOpp: 'CA Disp Other Opp',
    strCaFiNumber: 'CA FI Number',
    strCaInvolvedInCifId: 'CA Involved CIF ID',
    strCaInvolvedInInd: 'CA Involved',
    strReportingEntity: 'Reporting Entity',
    strReportingEntityOpp: 'Reporting Entity Opp',
    strSaAccount: 'SA Account',
    strSaAccountCurrency: 'SA Currency',
    strSaAccountHoldersCifId: 'SA Holder CIF ID',
    strSaAccountStatus: 'SA Status',
    strSaAmount: 'SA Amount',
    strSaBranch: 'SA Branch',
    strSaConductorInd: 'SA Conductor',
    strSaCurrency: 'SA Currency',
    strSaDirection: 'SA Direction',
    strSaDirectionOpp: 'SA Direction Opp',
    strSaFiNumber: 'SA FI Number',
    strSaFundingSourceInd: 'SA Funding Source',
    strSaFundsType: 'SA Funds Type',
    strSaFundsTypeOpp: 'SA Funds Type Opp',
    strSaFundsTypeOther: 'SA Funds Type Other',
    strSaFundsTypeOtherOpp: 'SA Funds Type Oth Opp',
    strSaOboInd: 'SA OBO',
    strSaPostingDate: 'SA Posting Date',
    strSaPurposeOfTransaction: 'SA Purpose',
    strTransactionStatus: 'Transaction Status',
    terminalCity: 'Terminal City',
    terminalCountry: 'Terminal Country',
    terminalId: 'Terminal ID',
    terminalNameLoc: 'Terminal Location',
    terminalStation: 'Terminal Station',
    thirdPartyCifId: 'Third Party CIF ID',
    transactionCurrency: 'Txn Currency',
    transactionCurrencyAmount: 'Txn Amount',
    transactionDate: 'Transaction Date',
    transactionDescription: 'Description',
    transactionExecutionLocalTimestamp: 'Execution Timestamp',
    transactionld: 'Transaction ID',
    transactionTime: 'Transaction Time',
    txnType: 'Transaction Type',
    flowOfFundsAmlTransactionId: 'Flow of Funds AML ID',
    fullTextFilterKey: 'Full Text',
    _uiPropHighlightColor: 'Highlight',
  };

  stickyColumns: ('select' | keyof AbmSourceData)[] = ['select'];

  selectFiltersValues: (keyof AbmSourceData)[] = [
    'oppProdType',
    'origCurrencyCD',
    'txnType',
    'amlId',
    'atmNearestTransit',
    'atmPostalCode',
    'cardNumber',
    'caseEcif',
    'channelCd',
    'crdrCode',
    'depositContents',
    'holdingBranchKey',
    'isoMessageType',
    'merchantName',
    'terminalCity',
    'terminalCountry',
    'terminalId',
    'terminalNameLoc',
    'terminalStation',
    'transactionCurrency',
    'transactionCurrencyAmount',
    'transactionDescription',
    'creditAmount',
    'creditedAccount',
    'creditedTransit',
    'debitAmount',
    'debitedAccount',
    'debitedTransit',
  ];

  dateFiltersValues: (keyof AbmSourceData)[] = [
    'postingDate',
    'transactionDate',
    'processingDate',
  ];
  dateFiltersValuesIgnore: (keyof AbmSourceData)[] = ['transactionTime'];
  displayedColumnsTime: (keyof AbmSourceData)[] = ['transactionTime'];

  dataSourceTrackBy: TrackByFunction<AbmSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  @Input({ required: true })
  selection!: SelectionModel<TSelection>;

  @Input({ required: true })
  abmSourceData!: AbmSourceData[];
}
