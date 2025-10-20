import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { StrTxnEdited } from "../../../session-data.service";
import { CommonModule, CurrencyPipe } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatDivider } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";

@Component({
  selector: "app-transaction-details-panel",
  imports: [
    CommonModule,
    MatDivider,
    CurrencyPipe,
    MatButtonModule,
    MatExpansionModule,
  ],
  template: `
    <mat-expansion-panel class="container mx-auto">
      <mat-expansion-panel-header class="container row row-cols-auto">
        <mat-panel-description class="row">
          <div class="col-auto d-flex flex-column">
            <span class="label text-uppercase">Transaction Description:</span>
            <span class="value text-break">{{
              singleStrTransaction.flowOfFundsTransactionDesc
            }}</span>
          </div>

          <div class="col"></div>

          <div class="col-auto d-flex flex-column">
            <span class="label text-uppercase">Transaction Date:</span>
            <span class="value text-break">{{
              singleStrTransaction.flowOfFundsTransactionDate
            }}</span>
          </div>

          <div class="col-auto d-flex flex-column">
            <span class="label text-uppercase">Transaction Time:</span>
            <span class="value text-break">{{
              singleStrTransaction.flowOfFundsTransactionTime
            }}</span>
          </div>

          <div class="col-auto d-flex flex-column">
            <span class="label text-uppercase">Posting Date:</span>
            <span class="value text-break">{{
              singleStrTransaction.flowOfFundsPostingDate
            }}</span>
          </div>
        </mat-panel-description>
      </mat-expansion-panel-header>

      <!-- Transfer Details -->
      <!-- <div class="row">
        <h3 class="mb-0">Transfer Details</h3>
      </div>
       -->
      <mat-divider class="my-2"></mat-divider>

      <div class="row">
        <div
          class="col-auto d-flex flex-column"
          *ngIf="singleStrTransaction.flowOfFundsCreditAmount"
        >
          <span class="label text-uppercase">Credit Amount:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsCreditAmount
              | currency : singleStrTransaction.flowOfFundsAccountCurrency!
          }}</span>
        </div>

        <div
          class="col-auto d-flex flex-column"
          *ngIf="singleStrTransaction.flowOfFundsDebitAmount"
        >
          <span class="label text-uppercase">Debit Amount:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsDebitAmount
              | currency : singleStrTransaction.flowOfFundsAccountCurrency!
          }}</span>
        </div>

        <!-- <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">Transaction Currency:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsTransactionCurrency
          }}</span>
        </div>

        <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">Transaction Currency Amount:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsTransactionCurrencyAmount
          }}</span>
        </div> -->

        <div class="col"></div>

        <div
          class="col-auto d-flex flex-column"
          *ngIf="singleStrTransaction.flowOfFundsCreditedTransit"
        >
          <span class="label text-uppercase">Credited Transit:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsCreditedTransit
          }}</span>
        </div>

        <div
          class="col-auto d-flex flex-column"
          *ngIf="singleStrTransaction.flowOfFundsCreditedAccount"
        >
          <span class="label text-uppercase">Credited Account:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsCreditedAccount
          }}</span>
        </div>

        <div
          class="col-auto d-flex flex-column"
          *ngIf="singleStrTransaction.flowOfFundsDebitedTransit"
        >
          <span class="label text-uppercase">Debited Transit:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsDebitedTransit
          }}</span>
        </div>

        <div
          class="col-auto d-flex flex-column"
          *ngIf="singleStrTransaction.flowOfFundsDebitedAccount"
        >
          <span class="label text-uppercase">Debited Account:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsDebitedAccount
          }}</span>
        </div>

        <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">Source:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsSource
          }}</span>
        </div>

        <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">Source Transaction ID:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsSourceTransactionId
          }}</span>
        </div>
      </div>

      <!-- Transaction Identifiers -->
      <!-- <div class="row">
        <h3 class="mb-0">Transaction Identifiers</h3>
      </div>
       -->
      <mat-divider class="my-2"></mat-divider>

      <div class="row">
        <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">AML Transaction ID:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsAmlTransactionId
          }}</span>
        </div>

        <div class="col"></div>

        <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">Case Party Key:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsCasePartyKey
          }}</span>
        </div>

        <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">Conductor Party Key:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsConductorPartyKey
          }}</span>
        </div>

        <div class="col-auto d-flex flex-column">
          <span class="label text-uppercase">AML ID:</span>
          <span class="value text-break">{{
            singleStrTransaction.flowOfFundsAmlId
          }}</span>
        </div>
      </div>
    </mat-expansion-panel>
  `,
  styleUrl: "./transaction-details-panel.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDetailsPanelComponent {
  @Input({ required: true })
  singleStrTransaction!: StrTxnEdited;
}
