import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE } from '../aml/case-record.selections.data.fixture';
import { CircularComponent } from './circular/circular.component';
import { CaseRecordStore } from '../aml/case-record.store';
import { map, shareReplay } from 'rxjs';
import { MonthlyTxnVolumeComponent } from './monthly-txn-volume/monthly-txn-volume.component';
import { TxnMethodBreakdownComponent } from './txn-method-breakdown/txn-method-breakdown.component';

@Component({
  selector: 'app-analytics',
  imports: [
    CommonModule,
    CircularComponent,
    MonthlyTxnVolumeComponent,
    TxnMethodBreakdownComponent,
  ],
  template: `
    <div class="row g-2">
      <div class="col-6">
        <app-circular
          [transactionData]="(selections$ | async) || []"
          [accountNumbersSelection]="(accountNumbersSelection$ | async) || []"
          [partyKeysSelection]="(partyKeysSelection$ | async) || []">
        </app-circular>
      </div>
      <div class="col-6">
        <div class="row row-cols-1 g-2">
          <app-monthly-txn-volume
            class="col"
            [transactionData]="(selections$ | async) || []">
          </app-monthly-txn-volume>
          <app-txn-method-breakdown
            class="col"
            [transactionData]="(selections$ | async) || []">
          </app-txn-method-breakdown>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  private caseRecord = inject(CaseRecordStore);
  data = SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE;

  caseRecord$ = this.caseRecord.state$.pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

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
}
