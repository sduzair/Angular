import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE } from '../aml/case-record.selections.data.fixture';
import { CircularComponent } from './circular/circular.component';

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, CircularComponent],
  template: `
    <div style="padding: 20px;">
      <h1>Financial Analysis</h1>
      <app-circular [transactionData]="data"></app-circular>
    </div>
  `,
  styleUrl: './analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  data = SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE;
}
