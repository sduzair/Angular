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
import { OlbSourceData } from '../../transaction-search/aml-transaction-search.service';
import { TableSelectionCompareWithAmlTransactionId } from '../transaction-view.component';

@Component({
  selector: 'app-olb-table',
  imports: [BaseTableComponent, CommonModule, MatTableModule, MatCheckbox],
  template: `
    <app-base-table
      #baseTable
      [data]="this.olbSourceData"
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
  styleUrl: './olb-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OlbTableComponent<
  TSelection extends {
    [K in keyof TableSelectionCompareWithAmlTransactionId]: string;
  },
> {
  dataColumnsValues: (keyof OlbSourceData)[] = [
    'postingDate',
    'transactionDate',
    'transactionTime',
    'transactionCurrencyAmount',
    'transactionCurrency',
    'transactionDescription',
    'transactionDescriptionBase',
    'transactionId',
    'userDeviceType',
    'userSessionDateTime',
    'userSessionDateTimeStr',
    'additionalDescription',
    'accountCurrency',
    'accountNumber',
    'acctCurrAmount',
    'acctHoldersAll',
    'actualCurrencyCD',
    'amlTransactionId',
    'cardNumber',
    'caseAccountNumber',
    'caseTransitNumber',
    'channelCd',
    'conductor',
    'crdrCode',
    'creditAmount',
    'creditedTransit',
    'creditedAccount',
    'creditorId',
    'currencyConversionRate',
    'cust2AddrCityTown',
    'cust2AddrPostalZipCode',
    'cust2AddrProvStateName',
    'cust2OrgLegalName',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'customer2AccountCurrencyCode',
    'customer2AccountHolderCifId',
    'customer2AccountStatus',
    'debitAmount',
    'debitedTransit',
    'debitedAccount',
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
    'flowOfFundsSourceTransactionId',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionDesc',
    'flowOfFundsTransactionTime',
    'executionLocalDateTime',
    'holdingBranchKey',
    'ipAddress',
    'messageTypeCode',
    'operationType',
    'oppAccountNumber',
    'oppBranchKey',
    'oppOrganizationUnitCd',
    'organizationUnitCd',
    'origCurrAmount',
    'origCurrCd',
    'processingDate',
    'rowUpdateDate',
    'rulesCADEquivalentAmt',
    'sourceTransactionId',
    'amlld',
    'caseEcif',
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
    'strSaDirectionOp',
    'strSaFiNumber',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaFundsTypeOpp',
    'strSaFundsTypeOther',
    'strSaFundsTypeOtherOpp',
    'strSaOboInd',
    'strSaPostingDate',
    'strTransactionStatus',
    'thirdPartyCifId',
    '_mongoid',
    'flowOfFundsAmlTransactionId',
  ];

  dataColumnsIgnoreValues: (keyof OlbSourceData)[] = [
    'accountCurrency',
    'accountNumber',
    'acctCurrAmount',
    'acctHoldersAll',
    'actualCurrencyCD',
    'amlTransactionId',
    'caseAccountNumber',
    'caseTransitNumber',
    'channelCd',
    'conductor',
    'crdrCode',
    'creditorId',
    'currencyConversionRate',
    'cust2AddrCityTown',
    'cust2AddrPostalZipCode',
    'cust2AddrProvStateName',
    'cust2OrgLegalName',
    'customer1AccountHolderCifId',
    'customer1AccountStatus',
    'customer2AccountCurrencyCode',
    'customer2AccountHolderCifId',
    'customer2AccountStatus',
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
    'flowOfFundsSourceTransactionId',
    'flowOfFundsTransactionCurrency',
    'flowOfFundsTransactionCurrencyAmount',
    'flowOfFundsTransactionDate',
    'flowOfFundsTransactionDesc',
    'flowOfFundsTransactionTime',
    'executionLocalDateTime',
    'holdingBranchKey',
    'oppAccountNumber',
    'oppBranchKey',
    'oppOrganizationUnitCd',
    'organizationUnitCd',
    'origCurrAmount',
    'origCurrCd',
    'processingDate',
    'rowUpdateDate',
    'rulesCADEquivalentAmt',
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
    'strSaDirectionOp',
    'strSaFiNumber',
    'strSaFundingSourceInd',
    'strSaFundsType',
    'strSaFundsTypeOpp',
    'strSaFundsTypeOther',
    'strSaFundsTypeOtherOpp',
    'strSaOboInd',
    'strSaPostingDate',
    'strTransactionStatus',
    'thirdPartyCifId',
    'transactionDescriptionBase',
    'transactionId',
    '_mongoid',
    'userSessionDateTimeStr',
  ];

  displayedColumns = ['select' as const];

  displayedColumnsColumnHeaderMap: Partial<
    Record<
      | Extract<keyof OlbSourceData, string>
      | IFilterForm['filterFormFullTextFilterKey']
      | (string & {}),
      string
    >
  > = {
    postingDate: 'Posting Date',
    transactionDate: 'Transaction Date',
    transactionTime: 'Transaction Time',
    transactionCurrencyAmount: 'Transaction Currency Amount',
    transactionCurrency: 'Transaction Currency',
    transactionDescription: 'Transaction Description',
    userDeviceType: 'User Device Type',
    userSessionDateTime: 'User Session',
    additionalDescription: 'Additional Description',
    amlld: 'AML ID',
    cardNumber: 'Card Number',
    caseEcif: 'Case ECIF',
    creditAmount: 'Credit Amount',
    creditedAccount: 'Credited Account',
    creditedTransit: 'Credited Transit',
    debitAmount: 'Debit Amount',
    debitedAccount: 'Debited Account',
    debitedTransit: 'Debited Transit',
    ipAddress: 'IP Address',
    messageTypeCode: 'Message Type Code',
    operationType: 'Operation Type',
    sourceTransactionId: 'Source Transaction ID',
    flowOfFundsAmlTransactionId: 'Aml Transaction ID',
    fullTextFilterKey: 'Full Text',
    _uiPropHighlightColor: 'Highlight',
  };

  stickyColumns: ('select' | keyof OlbSourceData)[] = ['select'];

  selectFiltersValues: (keyof OlbSourceData)[] = [
    'transactionCurrencyAmount',
    'transactionCurrency',
    'transactionDescription',
    'userDeviceType',
    'userSessionDateTime',
    'userSessionDateTimeStr',
    'additionalDescription',
    'amlld',
    'cardNumber',
    'caseEcif',
    'creditAmount',
    'creditedAccount',
    'creditedTransit',
    'debitAmount',
    'debitedAccount',
    'debitedTransit',
    'sourceTransactionId',
  ];

  dateFiltersValues: (keyof OlbSourceData)[] = [
    'postingDate',
    'transactionDate',
  ];

  dateFiltersValuesIgnore: (keyof OlbSourceData)[] = ['transactionTime'];

  displayedColumnsTime: (keyof OlbSourceData)[] = ['transactionTime'];

  dataSourceTrackBy: TrackByFunction<OlbSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  @Input({ required: true })
  selection!: SelectionModel<TSelection>;

  @Input({ required: true })
  olbSourceData!: OlbSourceData[];
}
