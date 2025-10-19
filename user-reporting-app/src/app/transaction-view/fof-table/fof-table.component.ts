import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TrackByFunction,
} from "@angular/core";
import { BaseTableComponent } from "../../base-table/base-table.component";
import { SelectionModel } from "@angular/cdk/collections";
import { FlowOfFundsSourceData } from "../../transaction-search/aml-transaction-search.service";
import { TableSelectionCompareWithAmlTxnId } from "../transaction-view.component";
import { IFilterForm } from "../../base-table/abstract-base-table";

@Component({
  selector: "app-fof-table",
  imports: [BaseTableComponent],
  template: `
    <app-base-table
      [data]="this.fofSourceData"
      [dataColumnsValues]="dataColumnsValues"
      [dataColumnsIgnoreValues]="dataColumnsIgnoreValues"
      [displayedColumnsColumnHeaderMap]="displayedColumnsColumnHeaderMap"
      [stickyColumns]="stickyColumns"
      [selectFiltersValues]="selectFiltersValues"
      [dateFiltersValues]="dateFiltersValues"
      [dateFiltersValuesIgnore]="dateFiltersValuesIgnore"
      [displayedColumnsTime]="displayedColumnsTime"
      [dataSourceTrackBy]="dataSourceTrackBy"
      [selection]="selection"
      [hasMasterToggle]="false"
    />
  `,
  styleUrl: "./fof-table.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FofTableComponent<
  TSelection extends { [K in keyof TableSelectionCompareWithAmlTxnId]: string },
> {
  dataColumnsValues: (keyof FlowOfFundsSourceData)[] = [
    "flowOfFundsPostingDate",
    "flowOfFundsTransactionDate",
    "flowOfFundsTransactionTime",
    "flowOfFundsTransactionDesc",
    "flowOfFundsTransactionCurrencyAmount",
    "flowOfFundsTransactionCurrency",
    "flowOfFundsSource",
    "flowOfFundsDebitAmount",
    "flowOfFundsDebitedAccount",
    "flowOfFundsDebitedTransit",
    "flowOfFundsCreditAmount",
    "flowOfFundsCreditedAccount",
    "flowOfFundsCreditedTransit",
    "flowOfFundsAccountCurrency",
    "flowOfFundsConductorPartyKey",
    "flowOfFundsCasePartyKey",
    "flowOfFundsAmlId",
    "flowofFundsSourceTransactionId",
    "flowOfFundsAmlTransactionId",
  ];
  dataColumnsIgnoreValues: (keyof FlowOfFundsSourceData)[] = [];

  displayedColumnsColumnHeaderMap: Partial<
    Record<
      | Extract<keyof FlowOfFundsSourceData, string>
      | IFilterForm["filterFormFullTextFilterKey"]
      | (string & {}),
      string
    >
  > = {
    flowOfFundsAccountCurrency: "Account Currency",
    flowOfFundsAmlId: "Aml Id",
    flowOfFundsAmlTransactionId: "Aml Transaction Id",
    flowOfFundsCasePartyKey: "Case Party Key",
    flowOfFundsConductorPartyKey: "Conductor Party Key",
    flowOfFundsCreditAmount: "Credit Amount",
    flowOfFundsCreditedAccount: "Credited Account",
    flowOfFundsCreditedTransit: "Credited Transit",
    flowOfFundsDebitAmount: "Debit Amount",
    flowOfFundsDebitedAccount: "Debited Account",
    flowOfFundsDebitedTransit: "Debited Transit",
    flowOfFundsPostingDate: "Posting Date",
    flowOfFundsSource: "Source",
    flowofFundsSourceTransactionId: "Source Transaction Id",
    flowOfFundsTransactionCurrency: "Transaction Currency",
    flowOfFundsTransactionCurrencyAmount: "Transaction Amount",
    flowOfFundsTransactionDate: "Transaction Date",
    flowOfFundsTransactionDesc: "Transaction Description",
    flowOfFundsTransactionTime: "Transaction Time",
    fullTextFilterKey: "Full Text",
    _uiPropHighlightColor: "Highlight",
  };

  stickyColumns: ("select" | keyof FlowOfFundsSourceData)[] = ["select"];

  selectFiltersValues: (keyof FlowOfFundsSourceData)[] = [
    "flowOfFundsAccountCurrency",
    "flowOfFundsAmlId",
    "flowOfFundsCasePartyKey",
    "flowOfFundsConductorPartyKey",
    "flowOfFundsCreditedAccount",
    "flowOfFundsCreditedTransit",
    "flowOfFundsDebitedAccount",
    "flowOfFundsDebitedTransit",
    "flowOfFundsSource",
    "flowOfFundsTransactionCurrency",
    "flowOfFundsTransactionCurrencyAmount",
    "flowOfFundsDebitAmount",
    "flowOfFundsCreditAmount",
  ];

  dateFiltersValues: (keyof FlowOfFundsSourceData)[] = [
    "flowOfFundsPostingDate",
    "flowOfFundsTransactionDate",
  ];
  dateFiltersValuesIgnore: (keyof FlowOfFundsSourceData)[] = [
    "flowOfFundsTransactionTime",
  ];
  displayedColumnsTime: (keyof FlowOfFundsSourceData)[] = [
    "flowOfFundsTransactionTime",
  ];

  dataSourceTrackBy: TrackByFunction<FlowOfFundsSourceData> = (_, record) => {
    return record.flowOfFundsAmlTransactionId;
  };

  @Input({ required: true })
  selection!: SelectionModel<TSelection>;

  @Input({ required: true })
  fofSourceData!: FlowOfFundsSourceData[];
}
