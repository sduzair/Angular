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
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import {
  catchError,
  combineLatest,
  debounceTime,
  filter,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import { formatCurrencyLocal } from '../reporting-ui/edit-form/common-validation';
import { TransactionDateDirective } from '../reporting-ui/edit-form/transaction-date.directive';
import { StrTransaction } from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { TransactionSearchService } from '../transaction-search/transaction-search.service';
import {
  getTxnType,
  hasManualTransaction,
  TRANSACTION_TYPE_ENUM,
} from './account-transaction-totals.service';
import { CircularComponent } from './circular/circular.component';
import { MonthlyTxnVolumeComponent } from './monthly-txn-volume/monthly-txn-volume.component';
import { TxnTypeBreakdownComponent } from './txn-type-breakdown/txn-type-breakdown.component';

@Component({
  selector: 'app-analytics',
  imports: [
    CommonModule,
    CircularComponent,
    MonthlyTxnVolumeComponent,
    TxnTypeBreakdownComponent,
    MatToolbar,
    MatFormField,
    MatSelect,
    MatLabel,
    MatOption,
    ReactiveFormsModule,
    MatChipsModule,
    MatTooltip,
    MatButtonModule,
    MatIcon,
  ],
  template: `
    <div class="row g-2">
      <mat-toolbar class="col-12 mt-1">
        <div class="d-flex w-100 align-items-center gap-3">
          <!-- Risk Metrics Display -->
          @if (riskMetrics$ | async; as metrics) {
            @if (currentAccount$ | async; as currentAccount) {
              <div
                class="d-flex align-items-center gap-2 overflow-x-auto overflow-y-hidden fs-5 risk-display">
                <div class="d-flex gap-3 small">
                  <div>
                    <span class="text-muted">Flow:</span>
                    <strong
                      [class.text-danger]="
                        metrics.flowThroughRatio > FLOW_THROUGH_HIGH
                      "
                      [class.text-warning]="
                        metrics.flowThroughRatio > FLOW_THROUGH_MEDIUM &&
                        metrics.flowThroughRatio <= FLOW_THROUGH_HIGH
                      ">
                      {{ metrics.flowThroughRatio | number: '1.2-2' }}
                    </strong>
                  </div>

                  <span class="vr"></span>

                  <div>
                    <span class="text-muted">Velocity:</span>
                    <strong [class.text-danger]="metrics.velocityRatio > 50000">
                      {{
                        formatCurrency(
                          metrics.velocityRatio,
                          currentAccount.currency
                        )
                      }}/d
                    </strong>
                  </div>

                  <!-- Structuring per currency -->
                  @if (Object.keys(metrics.structuringByCurrency).length > 0) {
                    <span class="vr"></span>

                    @for (
                      currencyKey of Object.keys(metrics.structuringByCurrency);
                      track currencyKey
                    ) {
                      @let currData =
                        metrics.structuringByCurrency[currencyKey];
                      <div class="d-flex align-items-center gap-1">
                        <span class="text-muted"
                          >Structure ({{ currData.currency }}):</span
                        >
                        <strong
                          [class.text-danger]="
                            currData.ratio > STRUCTURING_RATIO_HIGH
                          "
                          [class.text-warning]="
                            currData.ratio > STRUCTURING_RATIO_MEDIUM &&
                            currData.ratio <= STRUCTURING_RATIO_HIGH
                          ">
                          {{ currData.ratio | number: '1.2-2' }}
                        </strong>
                        <button
                          type="button"
                          mat-icon-button
                          aria-label="Threshold info"
                          [matTooltip]="
                            currData.belowThreshold +
                            '/' +
                            currData.totalDeposits +
                            ' deposits below ' +
                            formatCurrency(
                              STRUCTURING_THRESHOLD,
                              currData.currency
                            )
                          "
                          matTooltipPosition="below">
                          <mat-icon color="info">info_outline</mat-icon>
                        </button>
                      </div>
                      @if (!$last) {
                        <span class="vr"></span>
                      }
                    }
                  }

                  <span class="vr"></span>

                  <div>
                    <span class="text-muted">In:</span>
                    <strong class="text-success">
                      {{
                        formatCurrency(
                          metrics.totalInflow,
                          currentAccount.currency
                        )
                      }}
                    </strong>
                  </div>

                  <div>
                    <span class="text-muted">Out:</span>
                    <strong class="text-danger">
                      {{
                        formatCurrency(
                          metrics.totalOutflow,
                          currentAccount.currency
                        )
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
          }

          <div class="flex-grow-1"></div>

          <!-- Account Filter -->
          <form [formGroup]="filterForm">
            <mat-form-field
              class="account-select"
              appearance="outline"
              subscriptSizing="dynamic">
              <mat-label>Account</mat-label>
              <mat-select formControlName="account">
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
          [transactions]="(filteredSelectionsByAccountAndPeriod$ | async) || []"
          [accountNumbersSelection]="(accountsSelection$ | async) || []"
          [partyKeysSelection]="(partyKeysSelection$ | async) || []"
          [entities]="(entities$ | async) || []">
        </app-circular>
      </div>
      <div class="col-6">
        <div class="row row-cols-1 g-2">
          <app-monthly-txn-volume
            class="col"
            [transactions]="(filteredSelectionsByAccount$ | async) || []"
            [account]="currentAccount$ | async"
            (zoomChange)="onZoomChange($event)">
          </app-monthly-txn-volume>
          <app-txn-type-breakdown
            class="col"
            [transactions]="
              (filteredSelectionsByAccountAndPeriod$ | async) || []
            "
            [account]="currentAccount$ | async">
          </app-txn-type-breakdown>
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

  selections$ = this.caseRecord.selectionsComputed$.pipe(
    map(({ result: computedSelections }) =>
      computedSelections.some(hasManualTransaction) ? [] : computedSelections,
    ),
  );

  partyKeysSelection$ = this.caseRecord$.pipe(
    map(({ searchParams: { partyKeysSelection } }) => {
      return partyKeysSelection;
    }),
  );

  entities$ = this.caseRecord$.pipe(map(({ entities }) => entities));

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

  currentAccount$ = this.filterForm.controls.account.valueChanges.pipe(
    switchMap((account) =>
      this.accountsSelection$.pipe(
        map((sel) => sel.find((a) => a.account === account)!),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  filteredSelectionsByAccount$ = combineLatest([
    this.selections$,
    this.filterForm.controls.account.valueChanges.pipe(
      tap(() =>
        this.filterForm.patchValue(
          {
            periodStart: '',
            periodEnd: '',
          },
          { emitEvent: true },
        ),
      ),
    ),
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
    debounceTime(0),
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
          structuringByCurrency: {},
          riskFlags: [],
        } satisfies RiskMetrics;
      }

      // Add other thresholds as needed
      let totalInflow = 0;
      let totalOutflow = 0;

      // Track structuring per currency
      const structuringByCurrency: Record<
        string,
        {
          totalDeposits: number;
          belowThreshold: number;
          currency: string;
          ratio: number;
        }
      > = {};

      const dates: Date[] = [];

      transactions.forEach((txn) => {
        // Determine if this is an inflow or outflow for the selected account
        const isInFlow = txn.flowOfFundsCreditedAccount === selectedAccount;
        const isOutFlow = txn.flowOfFundsDebitedAccount === selectedAccount;

        if (isInFlow) {
          // Money coming INTO the selected account (credit)
          const creditAmount = txn.flowOfFundsCreditAmount || 0;
          totalInflow += creditAmount;

          txn.startingActions.forEach((sa) => {
            const saType = getTxnType({
              typeOfFunds: sa.typeOfFunds,
              detailsOfDispo: txn.completingActions[0].detailsOfDispo,
              detailsOfDispoOther: txn.completingActions[0].detailsOfDispoOther,
            });

            if (
              saType !== TRANSACTION_TYPE_ENUM.ABM &&
              saType !== TRANSACTION_TYPE_ENUM.Cheque
            )
              return;

            console.assert(!!sa.currency, 'Assert currency exists');
            const currency = sa.currency!;
            const amount = sa.amount || 0;

            // Initialize currency tracking if not exists
            if (!structuringByCurrency[currency]) {
              structuringByCurrency[currency] = {
                totalDeposits: 0,
                belowThreshold: 0,
                currency,
                ratio: 0,
              };
            }

            structuringByCurrency[currency].totalDeposits++;

            // Check if below threshold
            if (amount < STRUCTURING_THRESHOLD) {
              structuringByCurrency[currency].belowThreshold++;
            }
          });
        }

        if (isOutFlow) {
          // Money going OUT of the selected account (debit)
          totalOutflow += txn.flowOfFundsDebitAmount || 0;
        }

        // Collect dates for time span calculation
        const dateStr = txn.dateOfTxn || txn.flowOfFundsTransactionDate;
        if (dateStr) {
          dates.push(TransactionDateDirective.parse(dateStr));
        }
      });

      // Calculate ratios per currency
      Object.values(structuringByCurrency).forEach((currencyData) => {
        if (currencyData.totalDeposits > 0) {
          // eslint-disable-next-line no-param-reassign
          currencyData.ratio =
            currencyData.belowThreshold / currencyData.totalDeposits;
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

      // Risk Assessment
      const riskFlags: string[] = [];

      if (flowThroughRatio > FLOW_THROUGH_HIGH) {
        riskFlags.push('Potential layering activity');
      }

      if (velocityRatio > VELOCITY_HIGH_THRESHOLD) {
        riskFlags.push('High transaction velocity');
      }

      // Check structuring per currency
      Object.values(structuringByCurrency).forEach((currencyData) => {
        if (
          currencyData.ratio > STRUCTURING_RATIO_HIGH &&
          currencyData.totalDeposits >= STRUCTURING_MIN_DEPOSITS
        ) {
          riskFlags.push(
            `Potential structuring in ${currencyData.currency} ` +
              `(${currencyData.belowThreshold}/${currencyData.totalDeposits} ` +
              `deposits below ${STRUCTURING_THRESHOLD})`,
          );
        }
      });

      if (
        flowThroughRatio > FLOW_THROUGH_MEDIUM &&
        flowThroughRatio <= FLOW_THROUGH_HIGH
      ) {
        riskFlags.push('Moderate flow-through activity');
      }

      return {
        totalInflow,
        totalOutflow,
        transactionCount: transactions.length,
        timeSpanDays,
        flowThroughRatio,
        velocityRatio,
        structuringByCurrency,
        riskFlags,
      } satisfies RiskMetrics;
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

  // Currency formatting helper for template
  formatCurrency(value: number, currency: string): string {
    return formatCurrencyLocal({
      value,
      currencyCode: currency,
      digitsInfo: '1.0-0',
    });
  }

  formatCurrencyWithDecimals(value: number, currency: string): string {
    return formatCurrencyLocal({
      value,
      currencyCode: currency,
      digitsInfo: '1.2-2',
    });
  }

  // Expose module-level constants to template
  protected readonly Object = Object;
  protected readonly STRUCTURING_THRESHOLD = STRUCTURING_THRESHOLD;
  protected readonly FLOW_THROUGH_HIGH = FLOW_THROUGH_HIGH;
  protected readonly FLOW_THROUGH_MEDIUM = FLOW_THROUGH_MEDIUM;
  protected readonly VELOCITY_HIGH_THRESHOLD = VELOCITY_HIGH_THRESHOLD;
  protected readonly STRUCTURING_RATIO_HIGH = STRUCTURING_RATIO_HIGH;
  protected readonly STRUCTURING_RATIO_MEDIUM = STRUCTURING_RATIO_MEDIUM;
}

interface RiskMetrics {
  totalInflow: number;
  totalOutflow: number;
  transactionCount: number;
  timeSpanDays: number;
  flowThroughRatio: number;
  velocityRatio: number;
  structuringByCurrency: Record<
    string,
    {
      totalDeposits: number;
      belowThreshold: number;
      currency: string;
      ratio: number;
    }
  >;
  riskFlags: string[];
}

// Risk Assessment Thresholds
const STRUCTURING_THRESHOLD = 10000; // CAD $10,000 - FINTRAC Large Cash Transaction Report threshold

// Flow-Through Ratio Thresholds (Layering Detection)
const FLOW_THROUGH_HIGH = 0.85;
const FLOW_THROUGH_MEDIUM = 0.7;

// Velocity Threshold (Daily Fund Movement)
const VELOCITY_HIGH_THRESHOLD = 50000;

// Structuring Detection Thresholds
const STRUCTURING_RATIO_HIGH = 0.7;
const STRUCTURING_RATIO_MEDIUM = 0.5;
const STRUCTURING_MIN_DEPOSITS = 3; // Minimum deposits to flag structuring
