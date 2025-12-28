import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatToolbar } from '@angular/material/toolbar';
import { combineLatest, filter, map, shareReplay, take } from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import { CircularComponent } from './circular/circular.component';
import { MonthlyTxnVolumeComponent } from './monthly-txn-volume/monthly-txn-volume.component';
import { TxnMethodBreakdownComponent } from './txn-method-breakdown/txn-method-breakdown.component';
import { StrTransaction } from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { TransactionDateDirective } from '../reporting-ui/edit-form/transaction-date.directive';
import { MatChipsModule } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-analytics',
  imports: [
    CommonModule,
    CircularComponent,
    MonthlyTxnVolumeComponent,
    TxnMethodBreakdownComponent,
    MatToolbar,
    MatFormField,
    MatSelect,
    MatLabel,
    MatOption,
    ReactiveFormsModule,
    MatChipsModule,
    MatIcon,
  ],
  template: `
    <div class="row g-2">
      <mat-toolbar class="col-12 mt-1 justify-content-end">
        <!-- Period Display -->
        <div class="row row-cols-auto d-flex align-items-center">
          <mat-icon class="col ps-0">date_range</mat-icon>
          <span class="col small">Transaction Period:</span>
          <mat-chip-set
            class="txn-period-chips col d-flex align-items-center px-0">
            @if (filterForm.value.periodStart) {
              <mat-chip class="fs-6">
                {{ formatMonthYear(filterForm.value.periodStart) }}
              </mat-chip>
            }
            @if (filterForm.value.periodStart && filterForm.value.periodEnd) {
              <span class="mx-1 fst-italic small">to</span>
            }
            @if (filterForm.value.periodEnd) {
              <mat-chip class="fs-6">
                {{ formatMonthYear(filterForm.value.periodEnd) }}
              </mat-chip>
            }
          </mat-chip-set>
        </div>
        <div class="flex-fill"></div>
        <!-- Account Filter -->
        <form class="row" [formGroup]="filterForm">
          <mat-form-field
            class="account-select px-0"
            appearance="outline"
            subscriptSizing="dynamic">
            <mat-label>Account</mat-label>
            <mat-select
              formControlName="account"
              (selectionChange)="setSelectedAccountFromSelect($event.value)">
              @for (
                account of availableAccounts$ | async;
                track account.account
              ) {
                <mat-option [value]="account.account">
                  {{ account.transit }}-{{ account.account }} ({{
                    account.currency
                  }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </form>
      </mat-toolbar>

      <div class="col-6">
        <app-circular
          [transactionData]="
            (filteredSelectionsByAccountAndPeriod$ | async) || []
          "
          [accountNumbersSelection]="(accountNumbersSelection$ | async) || []"
          [partyKeysSelection]="(partyKeysSelection$ | async) || []">
        </app-circular>
      </div>
      <div class="col-6">
        <div class="row row-cols-1 g-2">
          <app-monthly-txn-volume
            class="col"
            [transactionData]="(filteredSelectionsByAccount$ | async) || []"
            (zoomChange)="onZoomChange($event)">
          </app-monthly-txn-volume>
          <app-txn-method-breakdown
            class="col"
            [transactionData]="
              (filteredSelectionsByAccountAndPeriod$ | async) || []
            ">
          </app-txn-method-breakdown>
        </div>
      </div>
    </div>
  `,
  styleUrl: 'analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent implements AfterViewInit {
  private caseRecord = inject(CaseRecordStore);
  private destroyRef = inject(DestroyRef);

  caseRecord$ = this.caseRecord.state$.pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  filterForm = new FormGroup({
    account: new FormControl(''),
    periodStart: new FormControl(''), // Format: "YYYY-MM"
    periodEnd: new FormControl(''), // Format: "YYYY-MM"
  });

  @ViewChild(MonthlyTxnVolumeComponent)
  monthlyChart!: MonthlyTxnVolumeComponent;
  ngAfterViewInit(): void {
    // Auto-select first account when available accounts load
    this.availableAccounts$
      .pipe(
        take(1),
        filter((accounts) => accounts.length > 0),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe((accounts) => {
        this.filterForm.patchValue({ account: accounts[0].account });
      });
  }

  selections$ = this.caseRecord$.pipe(map(({ selections }) => selections));

  partyKeysSelection$ = this.caseRecord$.pipe(
    map(({ searchParams: { partyKeysSelection } }) => {
      return partyKeysSelection;
    }),
  );

  accountNumbersSelection$ = this.caseRecord$.pipe(
    map(({ searchParams: { accountNumbersSelection } }) => {
      return accountNumbersSelection;
    }),
  );

  // Available accounts derived from case record
  availableAccounts$ = this.accountNumbersSelection$.pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  filteredSelectionsByAccount$ = combineLatest([
    this.selections$,
    this.filterForm.controls.account.valueChanges,
  ]).pipe(
    map(([transactions, selectedAccount]) => {
      if (!selectedAccount) return [];

      return transactions.filter((txn) => {
        const creditedAccount = txn.flowOfFundsCreditedAccount;
        const debitedAccount = txn.flowOfFundsDebitedAccount;

        return (
          creditedAccount === selectedAccount ||
          debitedAccount === selectedAccount
        );
      });
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  filteredSelectionsByAccountAndPeriod$ = combineLatest([
    this.filteredSelectionsByAccount$,
    this.filterForm.valueChanges,
  ]).pipe(
    map(([transactions, { periodStart, periodEnd }]) => {
      if (transactions.length === 0) return [];

      const monthMap = new Map<string, StrTransaction[]>();

      transactions.forEach((txn) => {
        const dateStr = txn.dateOfTxn || txn.flowOfFundsTransactionDate;
        if (!dateStr) return;

        const date = TransactionDateDirective.parse(dateStr);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, []);
        }
        monthMap.get(monthKey)!.push(txn);
      });

      const sortedMonths = Array.from(monthMap.keys()).sort();

      let selectedMonths = sortedMonths;

      // Initialize filter form with start and end
      if (!periodStart || !periodEnd) {
        this.filterForm.controls.periodStart.setValue(selectedMonths[0], {
          emitEvent: false,
        });
        this.filterForm.controls.periodEnd.setValue(selectedMonths.at(-1)!, {
          emitEvent: false,
        });
      }

      if (periodStart && periodEnd) {
        selectedMonths = sortedMonths.filter(
          (month) => month >= periodStart && month <= periodEnd,
        );
      }

      const filteredTransactions: StrTransaction[] = [];
      selectedMonths.forEach((monthKey) => {
        const monthTransactions = monthMap.get(monthKey) || [];
        filteredTransactions.push(...monthTransactions);
      });

      return filteredTransactions;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  setSelectedAccount(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filterForm.controls.account.setValue(select.value);
  }

  // Material select version
  setSelectedAccountFromSelect(value: string): void {
    this.filterForm.controls.account.setValue(value);
  }

  // template helper
  formatMonthYear(monthKey: string): string {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  }

  onZoomChange(event: { start: string; end: string }): void {
    this.filterForm.patchValue(
      {
        periodStart: event.start,
        periodEnd: event.end,
      },
      { emitEvent: true },
    );
  }
}
