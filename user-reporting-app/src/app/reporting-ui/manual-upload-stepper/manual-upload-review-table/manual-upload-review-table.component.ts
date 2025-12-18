import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TrackByFunction,
} from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { StrTransactionWithChangeLogs } from '../../../aml/case-record.store';
import { BaseTableComponent } from '../../../base-table/base-table.component';
import { CamelToTitlePipe } from '../../reporting-ui-table/camel-to-title.pipe';
import {
  ReportingUiTableComponent,
  StrTransaction,
  StrTransactionDataColumnKey,
  _hiddenValidationType,
} from '../../reporting-ui-table/reporting-ui-table.component';

@Component({
  selector: 'app-manual-upload-review-table',
  imports: [
    BaseTableComponent,
    MatTableModule,
    MatChipsModule,
    CamelToTitlePipe,
  ],
  template: `
    <app-base-table
      #baseTable
      [data]="manualStrTransactionData"
      [dataColumnsValues]="dataColumnsValues"
      [dataColumnsIgnoreValues]="dataColumnsIgnoreValues"
      [dataColumnsProjected]="dataColumnsProjected"
      [displayedColumns]="displayedColumns"
      [displayColumnHeaderMap]="displayColumnHeaderMap"
      [stickyColumns]="stickyColumns"
      [selectFiltersValues]="selectFiltersValues"
      [dateFiltersValues]="dateFiltersValues"
      [dateFiltersValuesIgnore]="dateFiltersValuesIgnore"
      [displayedColumnsTime]="displayedColumnsTime"
      [dataSourceTrackBy]="dataSourceTrackBy"
      [sortingAccessorDateTimeTuples]="sortingAccessorDateTimeTuples"
      [sortedBy]="'dateOfTxn'"
      [showToolbar]="false"
      class="manual-upload-review-table">
      <!-- Validation Info column -->
      <ng-container matColumnDef="_hiddenValidation">
        <th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header="_hiddenValidation"
          [class.sticky-cell]="baseTable.isStickyColumn('_hiddenValidation')">
          <div></div>
        </th>
        <td
          mat-cell
          *matCellDef="let row"
          [class.sticky-cell]="baseTable.isStickyColumn('_hiddenValidation')">
          <mat-chip-set>
            @for (ch of row._hiddenValidation; track ch) {
              <mat-chip
                [style.--mat-chip-elevated-container-color]="
                  getColorForValidationChip(ch)
                "
                [style.--mat-chip-label-text-color]="
                  getFontColorForValidationChip(ch)
                ">
                {{ ch | camelToTitle }}
              </mat-chip>
            }
          </mat-chip-set>
        </td>
      </ng-container>
    </app-base-table>
  `,
  styleUrl: './manual-upload-review-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualUploadReviewTableComponent {
  @Input({ required: true })
  manualStrTransactionData = [] as StrTransaction[];
  dataSourceTrackBy: TrackByFunction<StrTransactionWithChangeLogs> = (
    _,
    txn,
  ) => {
    return txn.flowOfFundsAmlTransactionId;
  };
  dataColumnsValues: StrTransactionDataColumnKey[] = [
    'highlightColor',
    '_hiddenValidation',
    'dateOfTxn',
    'timeOfTxn',
    'dateOfPosting',
    'timeOfPosting',
    '_hiddenTxnType',
    'methodOfTxn',
    'methodOfTxnOther',

    'reportingEntityLocationNo',

    'startingActions.0.directionOfSA',
    'startingActions.0.typeOfFunds',
    'startingActions.0.typeOfFundsOther',
    'startingActions.0.amount',
    'startingActions.0.currency',

    'startingActions.0.fiuNo',
    'startingActions.0.branch',
    'startingActions.0.account',
    'startingActions.0.accountType',
    'startingActions.0.accountTypeOther',
    'startingActions.0.accountCurrency',
    'startingActions.0.accountStatus',
    'startingActions.0.accountOpen',
    'startingActions.0.accountClose',

    'startingActions.0.conductors.0.partyKey',
    'startingActions.0.conductors.0.givenName',
    'startingActions.0.conductors.0.surname',
    'startingActions.0.conductors.0.otherOrInitial',
    'startingActions.0.conductors.0.nameOfEntity',

    'completingActions.0.detailsOfDispo',
    'completingActions.0.detailsOfDispoOther',
    'completingActions.0.amount',
    'completingActions.0.currency',

    'completingActions.0.fiuNo',
    'completingActions.0.branch',
    'completingActions.0.account',
    'completingActions.0.accountType',
    'completingActions.0.accountTypeOther',
    'completingActions.0.accountCurrency',
    'completingActions.0.accountStatus',
    'completingActions.0.accountOpen',
    'completingActions.0.accountClose',

    'completingActions.0.beneficiaries.0.partyKey',
    'completingActions.0.beneficiaries.0.givenName',
    'completingActions.0.beneficiaries.0.surname',
    'completingActions.0.beneficiaries.0.otherOrInitial',
    'completingActions.0.beneficiaries.0.nameOfEntity',
    '_hiddenAmlId',
    'reportingEntityTxnRefNo',
  ];

  dataColumnsIgnoreValues = ['highlightColor'];
  dataColumnsProjected = ['_hiddenValidation'];

  displayedColumns: ('select' | 'actions' | StrTransactionDataColumnKey)[] = [];

  displayColumnHeaderMap: Partial<
    Record<'fullTextFilterKey' | StrTransactionDataColumnKey, string>
  > = ReportingUiTableComponent.displayColumnHeaderMap;

  stickyColumns: (StrTransactionDataColumnKey | 'actions' | 'select')[] = [
    // "actions",
    // "select",
    '_mongoid',
    '_hiddenValidation',
  ];

  selectFiltersValues: StrTransactionDataColumnKey[] = [];

  dateFiltersValues: StrTransactionDataColumnKey[] = [];

  dateFiltersValuesIgnore: StrTransactionDataColumnKey[] = [];

  displayedColumnsTime: StrTransactionDataColumnKey[] = [
    'timeOfTxn',
    'timeOfPosting',
  ];

  sortingAccessorDateTimeTuples: StrTransactionDataColumnKey[][] = [
    ['dateOfTxn', 'timeOfTxn'],
    ['dateOfPosting', 'timeOfPosting'],
  ];

  protected getColorForValidationChip(error: _hiddenValidationType): string {
    return ReportingUiTableComponent.getColorForValidationChip(error);
  }

  protected getFontColorForValidationChip(error: _hiddenValidationType) {
    return ReportingUiTableComponent.getFontColorForValidationChip(error);
  }
}
