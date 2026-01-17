import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ErrorHandler,
  inject,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatToolbar } from '@angular/material/toolbar';
import {
  catchError,
  combineLatest,
  filter,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
  take,
} from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import { TransactionDateDirective } from '../reporting-ui/edit-form/transaction-date.directive';
import { StrTransaction } from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { TransactionSearchService } from '../transaction-search/transaction-search.service';
import { CircularComponent } from './circular/circular.component';
import { MonthlyTxnVolumeComponent } from './monthly-txn-volume/monthly-txn-volume.component';
import { TxnMethodBreakdownComponent } from './txn-method-breakdown/txn-method-breakdown.component';

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
  ],
  template: `
    <div class="row g-2">
      <mat-toolbar class="col-12 mt-1">
        <div class="d-flex w-100 align-items-center gap-3">
          <!-- Risk Metrics Display -->
          @if (riskMetrics$ | async; as metrics) {
            <div
              class="d-flex align-items-center gap-2 overflow-x-auto fs-5 risk-display">
              <!-- <mat-icon
                [class.text-danger]="metrics.riskLevel === 'HIGH'"
                [class.text-warning]="metrics.riskLevel === 'MEDIUM'"
                [class.text-success]="metrics.riskLevel === 'LOW'">
                {{
                  metrics.riskLevel === 'HIGH'
                    ? 'warning'
                    : metrics.riskLevel === 'MEDIUM'
                      ? 'info'
                      : 'check_circle'
                }}
              </mat-icon>
              <span
                class="small fw-bold"
                [class.text-danger]="metrics.riskLevel === 'HIGH'"
                [class.text-warning]="metrics.riskLevel === 'MEDIUM'">
                {{ metrics.riskLevel }}
              </span>

              <span class="vr"></span> -->

              <div class="d-flex gap-3 small">
                <div>
                  <span class="text-muted">Flow:</span>
                  <strong
                    [class.text-danger]="metrics.flowThroughRatio > 0.85"
                    [class.text-warning]="
                      metrics.flowThroughRatio > 0.7 &&
                      metrics.flowThroughRatio <= 0.85
                    ">
                    {{ metrics.flowThroughRatio | number: '1.2-2' }}
                  </strong>
                </div>

                <span class="vr"></span>

                <div>
                  <span class="text-muted">Velocity:</span>
                  <strong [class.text-danger]="metrics.velocityRatio > 50000">
                    {{
                      metrics.velocityRatio
                        | currency: 'CAD' : 'symbol' : '1.0-0'
                    }}/d
                  </strong>
                </div>

                <span class="vr"></span>

                <div>
                  <span class="text-muted">Structure:</span>
                  <strong
                    [class.text-danger]="metrics.structuralActivityRatio > 0.7"
                    [class.text-warning]="
                      metrics.structuralActivityRatio > 0.5 &&
                      metrics.structuralActivityRatio <= 0.7
                    ">
                    {{ metrics.structuralActivityRatio | number: '1.2-2' }}
                  </strong>
                </div>

                <span class="vr"></span>

                <div>
                  <span class="text-muted">In:</span>
                  <strong class="text-success">
                    {{
                      metrics.totalInflow | currency: 'CAD' : 'symbol' : '1.0-0'
                    }}
                  </strong>
                </div>

                <div>
                  <span class="text-muted">Out:</span>
                  <strong class="text-danger">
                    {{
                      metrics.totalOutflow
                        | currency: 'CAD' : 'symbol' : '1.0-0'
                    }}
                  </strong>
                </div>
              </div>

              <!-- @if (metrics.riskFlags.length > 0) {
                <span class="vr"></span>
                <mat-chip-set class="d-flex">
                  @for (flag of metrics.riskFlags; track flag) {
                    <mat-chip class="small" highlighted>{{ flag }}</mat-chip>
                  }
                </mat-chip-set>
              } -->
            </div>
          }

          <div class="flex-grow-1"></div>

          <!-- Account Filter -->
          <form [formGroup]="filterForm">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Account</mat-label>
              <mat-select
                formControlName="account"
                (selectionChange)="setSelectedAccountFromSelect($event.value)">
                @for (
                  account of accountsSelection$ | async;
                  track account.account
                ) {
                  @if (account.transit) {
                    <mat-option [value]="account.account">
                      {{ account.transit }}-{{ account.account }} ({{
                        account.currency
                      }})
                    </mat-option>
                  } @else {
                    <mat-option [value]="account.account">
                      {{ account.account }} ({{ account.currency }})
                    </mat-option>
                  }
                }
              </mat-select>
            </mat-form-field>
          </form>
        </div>
      </mat-toolbar>

      <div class="col-6">
        <app-circular
          [filteredSelections]="
            (filteredSelectionsByAccountAndPeriod$ | async) || []
          "
          [accountNumbersSelection]="(accountsSelection$ | async) || []"
          [partyKeysSelection]="(partyKeysSelection$ | async) || []">
        </app-circular>
      </div>
      <div class="col-6">
        <div class="row row-cols-1 g-2">
          <app-monthly-txn-volume
            class="col"
            [filteredSelections]="(filteredSelectionsByAccount$ | async) || []"
            (zoomChange)="onZoomChange($event)">
          </app-monthly-txn-volume>
          <app-txn-method-breakdown
            class="col"
            [filteredSelections]="
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
  private errorHandler = inject(ErrorHandler);
  private searchService = inject(TransactionSearchService);
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
    this.accountsSelection$
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

  accountsSelection$ = this.caseRecord$.pipe(
    map(({ searchParams: { accountNumbersSelection } }) => {
      return accountNumbersSelection;
    }),
    switchMap((accountNumbersSelection) => {
      return forkJoin(
        accountNumbersSelection.map((item) =>
          this.searchService.getAccountInfo(item.account),
        ),
      ).pipe(
        catchError((error) => {
          this.errorHandler.handleError(error);
          return of();
        }),
      );
    }),
    map((responses) =>
      responses.map(
        ({ account, accountCurrency: currency, branch: transit }) => ({
          account,
          currency,
          transit,
        }),
      ),
    ),
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

  // Calculate risk metrics from filtered transactions
  riskMetrics$ = combineLatest([
    this.filteredSelectionsByAccountAndPeriod$,
    this.filterForm.controls.account.valueChanges,
  ]).pipe(
    map(([transactions, selectedAccount]) => {
      if (!transactions.length || !selectedAccount) {
        return {
          totalInflow: 0,
          totalOutflow: 0,
          transactionCount: 0,
          timeSpanDays: 0,
          flowThroughRatio: 0,
          velocityRatio: 0,
          structuralActivityRatio: 0,
          riskLevel: 'LOW',
          riskFlags: [],
        };
      }

      const REPORTING_THRESHOLD = 10000; // CAD $10,000 threshold

      let totalInflow = 0;
      let totalOutflow = 0;
      let belowThresholdCount = 0;
      const dates: Date[] = [];

      // Separate inflows and outflows based on account position
      transactions.forEach((txn) => {
        const amount =
          txn.flowOfFundsCreditAmount || txn.flowOfFundsDebitAmount || 0;

        // Determine if this is an inflow or outflow for the selected account
        if (txn.flowOfFundsCreditedAccount === selectedAccount) {
          // Money coming INTO the selected account (credit)
          totalInflow += txn.flowOfFundsCreditAmount || 0;
        } else if (txn.flowOfFundsDebitedAccount === selectedAccount) {
          // Money going OUT of the selected account (debit)
          totalOutflow += txn.flowOfFundsDebitAmount || 0;
        }

        // Check if below threshold (for structuring detection)
        if (amount < REPORTING_THRESHOLD * 0.9) {
          belowThresholdCount++;
        }

        // Collect dates for time span calculation
        const dateStr = txn.dateOfTxn || txn.flowOfFundsTransactionDate;
        if (dateStr) {
          dates.push(TransactionDateDirective.parse(dateStr));
        }
      });

      // Calculate time span in days
      const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
      const timeSpanDays =
        sortedDates.length > 1
          ? Math.ceil(
              (sortedDates[sortedDates.length - 1].getTime() -
                sortedDates[0].getTime()) /
                (1000 * 60 * 60 * 24),
            ) || 1
          : 1;

      // 1. Flow-Through Ratio (layering detection)
      const maxFlow = Math.max(totalInflow, totalOutflow);
      const minFlow = Math.min(totalInflow, totalOutflow);
      const flowThroughRatio = maxFlow > 0 ? minFlow / maxFlow : 0;

      // 2. Velocity Ratio (funds movement per day)
      const velocityRatio = totalOutflow / timeSpanDays;

      // 3. Structural Activity Ratio (threshold avoidance)
      const structuralActivityRatio =
        transactions.length > 0 ? belowThresholdCount / transactions.length : 0;

      // Risk Assessment
      const riskFlags: string[] = [];
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

      if (flowThroughRatio > 0.85) {
        riskFlags.push('Potential layering activity');
        riskLevel = 'HIGH';
      }

      if (velocityRatio > 50000) {
        riskFlags.push('High transaction velocity');
        riskLevel = 'HIGH';
      }

      if (structuralActivityRatio > 0.7) {
        riskFlags.push('Potential structuring/threshold avoidance');
        riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
      }

      if (flowThroughRatio > 0.7 && flowThroughRatio <= 0.85) {
        riskFlags.push('Moderate flow-through activity');
        riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
      }

      return {
        totalInflow,
        totalOutflow,
        transactionCount: transactions.length,
        timeSpanDays,
        flowThroughRatio,
        velocityRatio,
        structuralActivityRatio,
        riskLevel,
        riskFlags,
      } as RiskMetrics;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

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

interface RiskMetrics {
  totalInflow: number;
  totalOutflow: number;
  transactionCount: number;
  timeSpanDays: number;
  flowThroughRatio: number;
  velocityRatio: number;
  structuralActivityRatio: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFlags: string[];
}
