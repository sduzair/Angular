import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  TrackByFunction,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, ResolveFn, Router } from '@angular/router';
import { combineLatestWith, map, Observable, tap } from 'rxjs';
import {
  CaseRecordStore,
  StrTransactionWithChangeLogs,
} from '../../aml/case-record.store';
import { BaseTableComponent } from '../../base-table/base-table.component';
import {
  InvalidFormOptionsErrorKeys,
  InvalidTxnDateTimeErrorKeys,
} from '../edit-form/edit-form.component';
import { CamelToTitlePipe } from './camel-to-title.pipe';

@Component({
  selector: 'app-reporting-ui-table',
  imports: [
    BaseTableComponent,
    CommonModule,
    MatTableModule,
    MatCheckbox,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatDialogModule,
    MatChipsModule,
    CamelToTitlePipe,
  ],
  template: `
    <app-base-table
      #baseTable
      [data]="(selectionsComputed$ | async) ?? []"
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
      [selectionKey]="'flowOfFundsAmlTransactionId'"
      [highlightedRecords]="highlightedRecords"
      [filterFormHighlightSelectFilterKey]="'highlightColor'"
      [filterFormHighlightSideEffect]="filterFormHighlightSideEffect"
      [sortingAccessorDateTimeTuples]="sortingAccessorDateTimeTuples"
      [hasMasterToggle]="true">
      <button
        type="button"
        mat-raised-button
        ngProjectAs="table-toolbar-ele"
        (click)="openManualUploadStepper()">
        <mat-icon>file_upload</mat-icon>
        Manual Upload
      </button>
      <!-- Selection Model -->
      <ng-container
        matColumnDef="select"
        [sticky]="baseTable.isStickyColumn('select')">
        <th
          mat-header-cell
          *matHeaderCellDef
          [class.sticky-cell]="baseTable.isStickyColumn('select')">
          @if (baseTable.hasMasterToggle) {
            <div>
              <mat-checkbox
                (change)="$event ? baseTable.toggleAllRows() : null"
                [checked]="
                  baseTable.selection.hasValue() && baseTable.isAllSelected()
                "
                [indeterminate]="
                  baseTable.selection.hasValue() && !baseTable.isAllSelected()
                ">
              </mat-checkbox>
            </div>
          }
        </th>
        <td
          mat-cell
          *matCellDef="let row; let i = index"
          [class.sticky-cell]="baseTable.isStickyColumn('select')">
          <div>
            <mat-checkbox
              (click)="baseTable.onCheckBoxClickMultiToggle($event, row, i)"
              (change)="$event ? baseTable.toggleRow(row) : null"
              [checked]="baseTable.selection.isSelected(row)"
              [disabled]="isEditDisabled(row, qSavingEdits())">
            </mat-checkbox>
          </div>
        </td>
      </ng-container>
      <!-- Actions column -->
      <ng-container
        matColumnDef="actions"
        [sticky]="baseTable.isStickyColumn('actions')">
        <th
          mat-header-cell
          *matHeaderCellDef
          [class.sticky-cell]="baseTable.isStickyColumn('actions')">
          <div>
            <button
              type="button"
              [disabled]="isActionHeaderDisabled$ | async"
              mat-icon-button
              (click)="navigateToBulkEdit()"
              [matBadge]="baseTable.selection.selected.length"
              [matBadgeHidden]="!baseTable.selection.hasValue()">
              <mat-icon>edit</mat-icon>
            </button>
            <button type="button" mat-icon-button class="invisible">
              <mat-icon
                class="text-primary"
                [class.text-opacity-50]="isActionHeaderDisabled$ | async">
                history
              </mat-icon>
            </button>
            <button
              type="button"
              [disabled]="isActionHeaderDisabled$ | async"
              mat-icon-button
              (click)="resetSelectedTxns()"
              [matBadge]="baseTable.selection.selected.length"
              [matBadgeHidden]="!baseTable.selection.hasValue()">
              <mat-icon
                class="text-danger"
                [class.text-opacity-50]="isActionHeaderDisabled$ | async">
                restart_alt
              </mat-icon>
            </button>
            <button
              type="button"
              [disabled]="isActionHeaderDisabled$ | async"
              mat-icon-button
              (click)="removeSelectedTxns()"
              [matBadge]="baseTable.selection.selected.length"
              [matBadgeHidden]="!baseTable.selection.hasValue()">
              <mat-icon
                class="text-danger"
                [class.text-opacity-50]="isActionHeaderDisabled$ | async">
                delete_outline
              </mat-icon>
            </button>
          </div>
        </th>
        <td
          mat-cell
          *matCellDef="let row"
          [class.sticky-cell]="baseTable.isStickyColumn('actions')">
          <div>
            <button
              type="button"
              mat-icon-button
              (click)="navigateToEditForm(row)"
              [disabled]="isEditDisabled(row, qSavingEdits())">
              <mat-icon>edit</mat-icon>
            </button>
            <button
              type="button"
              mat-icon-button
              (click)="navigateToAuditForm(row)"
              [disabled]="isEditDisabled(row, qSavingEdits())">
              <mat-icon class="text-primary">history</mat-icon>
            </button>
            <button
              type="button"
              mat-icon-button
              (click)="resetTxn(row)"
              [disabled]="isEditDisabled(row, qSavingEdits())">
              <mat-icon class="text-danger">restart_alt</mat-icon>
            </button>
            <button
              type="button"
              mat-icon-button
              (click)="removeTxn(row)"
              [disabled]="isEditDisabled(row, qSavingEdits())">
              <mat-icon class="text-danger">delete_outline</mat-icon>
            </button>
          </div>
        </td>
      </ng-container>
      <!-- Validation Info column -->
      <ng-container
        matColumnDef="_hiddenValidation"
        [sticky]="baseTable.isStickyColumn('_hiddenValidation')">
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
            @for (ch of row._hiddenValidation; track $index) {
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
  styleUrl: './reporting-ui-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportingUiTableComponent implements AfterViewInit {
  protected caseRecordStore = inject(CaseRecordStore);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  selectionsComputed$ = this.caseRecordStore.selectionsComputed$.pipe(
    tap((txns) => {
      const initHighlightsMap = new Map(
        txns.map((txn) => [
          txn.flowOfFundsAmlTransactionId,
          txn.highlightColor ?? '',
        ]),
      );
      this.highlightedRecords.update(() => new Map(initHighlightsMap));
    }),
  );

  qSavingEdits = toSignal(this.caseRecordStore.qActiveSaveIds$, {
    initialValue: [],
  });

  async openManualUploadStepper() {
    const {
      ManualUploadStepperComponent,
      ADD_SELECTIONS_MANUAL_STEPPER_WIDTH_DEFAULT,
    } =
      await import('../manual-upload-stepper/manual-upload-stepper.component');
    this.dialog.open(ManualUploadStepperComponent, {
      width: ADD_SELECTIONS_MANUAL_STEPPER_WIDTH_DEFAULT,
      panelClass: 'upload-stepper-dialog',
    });
  }

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
    'flowOfFundsTransactionDesc',
    'flowOfFundsSource',
    'methodOfTxn',
    'reportingEntityLocationNo',

    'startingActions.0.directionOfSA',
    'startingActions.0.typeOfFunds',
    'startingActions.0.amount',
    'startingActions.0.currency',

    'startingActions.0.fiuNo',
    'startingActions.0.branch',
    'startingActions.0.account',
    'startingActions.0.accountType',
    'startingActions.0.accountCurrency',
    'startingActions.0.accountStatus',
    'startingActions.0.accountOpen',
    'startingActions.0.accountClose',

    'startingActions.0.conductors.0._hiddenPartyKey',
    'startingActions.0.conductors.0._hiddenGivenName',
    'startingActions.0.conductors.0._hiddenSurname',
    'startingActions.0.conductors.0._hiddenOtherOrInitial',
    'startingActions.0.conductors.0._hiddenNameOfEntity',

    'completingActions.0.detailsOfDispo',
    'completingActions.0.amount',
    'completingActions.0.currency',

    'completingActions.0.fiuNo',
    'completingActions.0.branch',
    'completingActions.0.account',
    'completingActions.0.accountType',
    'completingActions.0.accountCurrency',
    'completingActions.0.accountStatus',
    'completingActions.0.accountOpen',
    'completingActions.0.accountClose',

    'completingActions.0.beneficiaries.0._hiddenPartyKey',
    'completingActions.0.beneficiaries.0._hiddenGivenName',
    'completingActions.0.beneficiaries.0._hiddenSurname',
    'completingActions.0.beneficiaries.0._hiddenOtherOrInitial',
    'completingActions.0.beneficiaries.0._hiddenNameOfEntity',
    'flowOfFundsAmlId',
    'reportingEntityTxnRefNo',
  ];

  dataColumnsIgnoreValues = ['highlightColor'];
  dataColumnsProjected = ['_hiddenValidation'];

  displayedColumns: ('select' | 'actions' | StrTransactionDataColumnKey)[] = [
    'select' as const,
    'actions' as const,
  ];

  get displayColumnHeaderMap() {
    return ReportingUiTableComponent.displayColumnHeaderMap;
  }

  static displayColumnHeaderMap = {
    highlightColor: 'Highlight' as const,
    wasTxnAttempted: 'Was the transaction attempted?' as const,
    wasTxnAttemptedReason: 'Reason transaction was not completed' as const,
    methodOfTxn: 'Method of Txn' as const,
    methodOfTxnOther: 'Method of Txn Other' as const,

    purposeOfTxn: 'Purpose of Txn' as const,
    reportingEntityLocationNo: 'Reporting Entity' as const,
    dateOfTxn: 'Txn Date' as const,
    timeOfTxn: 'Txn Time' as const,
    dateOfPosting: 'Post Date' as const,
    timeOfPosting: 'Post Time' as const,
    flowOfFundsTransactionDesc: 'Transaction Description' as const,
    'startingActions.0.directionOfSA': 'Direction' as const,
    'startingActions.0.typeOfFunds': 'Funds Type' as const,
    'startingActions.0.typeOfFundsOther': 'Funds Type Other' as const,
    'startingActions.0.amount': 'Debit Amount' as const,
    'startingActions.0.currency': 'Debit Currency' as const,

    'startingActions.0.fiuNo': 'Debit FIU' as const,
    'startingActions.0.branch': 'Debit Branch' as const,
    'startingActions.0.account': 'Debit Account' as const,
    'startingActions.0.accountType': 'Debit Account Type' as const,
    'startingActions.0.accountTypeOther': 'Debit Account Type Other' as const,
    'startingActions.0.accountCurrency': 'Debit Account Currency' as const,
    'startingActions.0.accountStatus': 'Debit Account Status' as const,
    'startingActions.0.howFundsObtained': 'How Funds Were Obtained?' as const,
    'startingActions.0.accountOpen': 'Debit Account Open' as const,
    'startingActions.0.accountClose': 'Debit Account Close' as const,

    'startingActions.0.conductors.0._hiddenPartyKey':
      'Conductor Party Key' as const,
    'startingActions.0.conductors.0._hiddenGivenName':
      'Conductor Given Name' as const,
    'startingActions.0.conductors.0._hiddenSurname':
      'Conductor Surname' as const,
    'startingActions.0.conductors.0._hiddenOtherOrInitial':
      'Conductor Other Name' as const,
    'startingActions.0.conductors.0._hiddenNameOfEntity':
      'Conductor Entity Name' as const,

    'completingActions.0.detailsOfDispo': 'Disposition Details' as const,
    'completingActions.0.detailsOfDispoOther':
      'Disposition Details Other' as const,
    'completingActions.0.amount': 'Credit Amount' as const,
    'completingActions.0.currency': 'Credit Currency' as const,

    'completingActions.0.fiuNo': 'Credit FIU' as const,
    'completingActions.0.branch': 'Credit Branch' as const,
    'completingActions.0.account': 'Credit Account' as const,
    'completingActions.0.accountType': 'Credit Account Type' as const,
    'completingActions.0.accountTypeOther':
      'Credit Account Type Other' as const,
    'completingActions.0.accountCurrency': 'Credit Account Currency' as const,
    'completingActions.0.accountStatus': 'Credit Account Status' as const,
    'completingActions.0.accountOpen': 'Credit Account Open' as const,
    'completingActions.0.accountClose': 'Credit Account Close' as const,

    'completingActions.0.beneficiaries.0._hiddenPartyKey':
      'Beneficiary Party Key' as const,
    'completingActions.0.beneficiaries.0._hiddenGivenName':
      'Beneficiary Given Name' as const,
    'completingActions.0.beneficiaries.0._hiddenSurname':
      'Beneficiary Surname' as const,
    'completingActions.0.beneficiaries.0._hiddenOtherOrInitial':
      'Beneficiary Other Name' as const,
    'completingActions.0.beneficiaries.0._hiddenNameOfEntity':
      'Beneficiary Entity Name' as const,
    'completingActions.0.wasAnyOtherSubInvolved':
      'Was there any other person or entity involved in the completing action?' as const,
    reportingEntityTxnRefNo: 'Transaction Reference No' as const,
    _hiddenValidation: 'Validation Info' as const,
    flowOfFundsSource: 'Source' as const,
    flowOfFundsAmlId: 'AML Id' as const,
    fullTextFilterKey: 'Full Text' as const,
  } satisfies Partial<
    Record<'fullTextFilterKey' | StrTransactionDataColumnKey, unknown>
  >;

  stickyColumns: (StrTransactionDataColumnKey | 'actions' | 'select')[] = [
    'actions',
    'select',
    '_hiddenValidation',
  ];

  selectFiltersValues: StrTransactionDataColumnKey[] = [
    'highlightColor',
    '_hiddenValidation',
    'methodOfTxn',
    'reportingEntityLocationNo',

    'startingActions.0.directionOfSA',
    'startingActions.0.typeOfFunds',
    'startingActions.0.amount',
    'startingActions.0.currency',

    'startingActions.0.fiuNo',
    'startingActions.0.branch',
    'startingActions.0.account',
    'startingActions.0.accountType',
    'startingActions.0.accountCurrency',
    'startingActions.0.accountStatus',

    'startingActions.0.conductors.0._hiddenPartyKey',
    'startingActions.0.conductors.0._hiddenGivenName',
    'startingActions.0.conductors.0._hiddenSurname',
    'startingActions.0.conductors.0._hiddenOtherOrInitial',
    'startingActions.0.conductors.0._hiddenNameOfEntity',

    'completingActions.0.detailsOfDispo',
    'completingActions.0.amount',
    'completingActions.0.currency',

    'completingActions.0.fiuNo',
    'completingActions.0.branch',
    'completingActions.0.account',
    'completingActions.0.accountType',
    'completingActions.0.accountCurrency',
    'completingActions.0.accountStatus',

    'completingActions.0.beneficiaries.0._hiddenPartyKey',
    'completingActions.0.beneficiaries.0._hiddenGivenName',
    'completingActions.0.beneficiaries.0._hiddenSurname',
    'completingActions.0.beneficiaries.0._hiddenOtherOrInitial',
    'completingActions.0.beneficiaries.0._hiddenNameOfEntity',
    'flowOfFundsSource',
    'flowOfFundsAmlId',
  ];

  dateFiltersValues: StrTransactionDataColumnKey[] = [
    'dateOfTxn',
    'dateOfPosting',
    'startingActions.0.accountOpen',
    'startingActions.0.accountClose',
    'completingActions.0.accountOpen',
    'completingActions.0.accountClose',
  ];

  dateFiltersValuesIgnore: StrTransactionDataColumnKey[] = [
    'timeOfTxn',
    'timeOfPosting',
    'startingActions.0.accountClose',
    'completingActions.0.accountClose',
  ];

  displayedColumnsTime: StrTransactionDataColumnKey[] = [
    'timeOfTxn',
    'timeOfPosting',
  ];

  sortingAccessorDateTimeTuples: StrTransactionDataColumnKey[][] = [
    ['dateOfTxn', 'timeOfTxn'],
    ['dateOfPosting', 'timeOfPosting'],
  ];

  highlightedRecords = signal<Map<string, string>>(new Map());

  filterFormHighlightSideEffect = (
    highlights: { txnId: string; newColor: string }[],
  ) => {
    this.caseRecordStore.qSaveHighlightEdits(highlights);
  };

  isEditDisabled(row: StrTransactionWithChangeLogs, savingIds: string[]) {
    return savingIds.includes(row.flowOfFundsAmlTransactionId);
  }

  static getColorForValidationChip(error: _hiddenValidationType): string {
    if (!error) return '#007bff'; // fallback color
    return validationColors[error];
  }

  static getFontColorForValidationChip(error: _hiddenValidationType): string {
    const backgroundColor =
      ReportingUiTableComponent.getColorForValidationChip(error);
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);

    // Calculate perceived brightness using YIQ formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return white for dark backgrounds, black for light backgrounds
    return brightness > 125 ? '#000000' : '#ffffff';
  }

  navigateToEditForm(record: StrTransactionWithChangeLogs) {
    this.baseTable.recentlyOpenRows.update(() => [
      record.flowOfFundsAmlTransactionId,
    ]);
    this.router.navigate([`edit-form/${record.flowOfFundsAmlTransactionId}`], {
      relativeTo: this.route,
    });
  }

  @ViewChild('baseTable', { static: true }) baseTable!: BaseTableComponent<
    StrTransactionWithChangeLogs,
    string,
    'select' | 'actions' | StrTransactionDataColumnKey,
    never,
    'highlightColor',
    { flowOfFundsAmlTransactionId: never }
  >;

  navigateToBulkEdit() {
    const selectedTransactionsForBulkEdit =
      this.baseTable.selection.selected.map(
        (strTxn) => strTxn.flowOfFundsAmlTransactionId,
      );

    this.baseTable.recentlyOpenRows.update(
      () => selectedTransactionsForBulkEdit,
    );

    this.router.navigate(['edit-form/bulk-edit'], {
      relativeTo: this.route,
      state: {
        selectedTransactionsForBulkEdit,
      },
    });
  }

  navigateToAuditForm(record: StrTransactionWithChangeLogs) {
    this.baseTable.recentlyOpenRows.update(() => [
      record.flowOfFundsAmlTransactionId,
    ]);

    this.router.navigate([`audit/${record.flowOfFundsAmlTransactionId}`], {
      relativeTo: this.route,
    });
  }

  resetSelectedTxns() {
    const selectedIds = this.baseTable.selection.selected.map(
      (strTxn) => strTxn.flowOfFundsAmlTransactionId,
    );
    this.caseRecordStore.qResetSelections(selectedIds);
  }

  resetTxn(record: StrTransactionWithChangeLogs) {
    this.caseRecordStore.qResetSelections([record.flowOfFundsAmlTransactionId]);
  }

  removeSelectedTxns() {
    const selectedIds = this.baseTable.selection.selected.map(
      (strTxn) => strTxn.flowOfFundsAmlTransactionId,
    );
    this.baseTable.selection.clear();
    this.caseRecordStore.qRemoveSelections(selectedIds);
  }

  removeTxn(record: StrTransactionWithChangeLogs) {
    this.caseRecordStore.qRemoveSelections([
      record.flowOfFundsAmlTransactionId,
    ]);
  }

  // template helpers

  protected isActionHeaderDisabled$?: Observable<boolean>;
  ngAfterViewInit(): void {
    this.isActionHeaderDisabled$ = this.baseTable.hasSelections$.pipe(
      combineLatestWith(this.caseRecordStore.qIsSaving$),
      map(([hasSelections, isSaving]) => !hasSelections || isSaving),
    );
  }

  getColorForValidationChip(error: _hiddenValidationType): string {
    return ReportingUiTableComponent.getColorForValidationChip(error);
  }
  getFontColorForValidationChip(error: _hiddenValidationType): string {
    return ReportingUiTableComponent.getFontColorForValidationChip(error);
  }
}

export const selectionsComputedResolver: ResolveFn<
  Observable<StrTransactionWithChangeLogs[]>
> = async () => {
  return inject(CaseRecordStore).selectionsComputed$;
};

const validationColors: Record<_hiddenValidationType, string> = {
  conductorMissing: '#dc3545',
  bankInfoMissing: '#ba005c',
  edited: '#0d6efd',
  invalidMethodOfTxn: '#0d6efd',
  invalidTypeOfFunds: '#0d6efd',
  invalidAccountType: '#0d6efd',
  invalidAmountCurrency: '#dc3545',
  invalidAccountCurrency: '#dc3545',
  invalidAccountStatus: '#dc3545',
  invalidDirectionOfSA: '#dc3545',
  invalidDetailsOfDisposition: '#0d6efd',
  invalidDate: '#dc3545',
  invalidTime: '#dc3545',
  invalidPartyKey: '#dc3545',
  invalidFiu: '#dc3545',
  missingCheque: '#0d6efd',
  missingBasicInfo: '#dc3545',
};

export const validationKeys = Object.keys(validationColors).filter(
  (k) => k !== 'edited',
) as _hiddenValidationType[];

export type _hiddenValidationType =
  | 'edited'
  | 'conductorMissing'
  | 'bankInfoMissing'
  | 'invalidPartyKey'
  | 'invalidFiu'
  | 'missingCheque'
  | 'missingBasicInfo'
  | InvalidFormOptionsErrorKeys
  | InvalidTxnDateTimeErrorKeys;

export type StrTransaction = {
  id?: string;
  sourceId: string;
  wasTxnAttempted: boolean | null;
  wasTxnAttemptedReason: string | null;
  dateOfTxn: string | null;
  timeOfTxn: string | null;
  hasPostingDate: boolean | null;
  dateOfPosting: string | null;
  timeOfPosting: string | null;
  methodOfTxn: string | null;
  methodOfTxnOther: string | null;
  reportingEntityTxnRefNo: string | null;
  purposeOfTxn: string | null;
  reportingEntityLocationNo: string | null;
  _hiddenFullName?: string | null;
  _hiddenFirstName?: string | null;
  startingActions: StartingAction[];
  _hiddenSaAmount?: number;
  completingActions: CompletingAction[];
  highlightColor?: string | null;
} & StrTxnFlowOfFunds;

export interface StrTxnFlowOfFunds {
  flowOfFundsAccountCurrency: string | null;
  flowOfFundsAmlId: number;
  flowOfFundsAmlTransactionId: string;
  flowOfFundsCasePartyKey: number | null;
  flowOfFundsConductorPartyKey: number | null;
  flowOfFundsCreditAmount: number | null;
  flowOfFundsCreditedAccount: string | null;
  flowOfFundsCreditedTransit: string | null;
  flowOfFundsDebitAmount: number | null;
  flowOfFundsDebitedAccount: string | null;
  flowOfFundsDebitedTransit: string | null;
  flowOfFundsPostingDate: string | null;
  flowOfFundsSource: string;
  flowOfFundsSourceTransactionId: string | null;
  flowOfFundsTransactionCurrency: string | null;
  flowOfFundsTransactionCurrencyAmount: number | null;
  flowOfFundsTransactionDate: string | null;
  flowOfFundsTransactionDesc: string;
  flowOfFundsTransactionTime: string | null;
}

export interface StartingAction {
  _id?: string;
  directionOfSA: string | null;
  typeOfFunds: string | null;
  typeOfFundsOther: string | null;
  amount: number | null;
  currency: string | null;
  fiuNo: string | null;
  branch: string | null;
  account: string | null;
  accountType: string | null;
  accountTypeOther: string | null;
  accountOpen: string | null;
  accountClose: string | null;
  accountStatus: string | null;
  howFundsObtained: string | null;
  accountCurrency: string | null;
  hasAccountHolders: boolean | null;
  accountHolders?: AccountHolder[];
  wasSofInfoObtained: boolean | null;
  sourceOfFunds?: SourceOfFunds[];
  wasCondInfoObtained: boolean | null;
  conductors?: Conductor[];
}
export interface AccountHolder {
  linkToSub: string;
  _id?: string;
  _hiddenPartyKey: string | null;
  _hiddenSurname: string | null;
  _hiddenGivenName: string | null;
  _hiddenOtherOrInitial: string | null;
  _hiddenNameOfEntity: string | null;
}

export type Conductor = {
  linkToSub: string;
  _id?: string;
  _hiddenPartyKey: string | null;
  _hiddenSurname: string | null;
  _hiddenGivenName: string | null;
  _hiddenOtherOrInitial: string | null;
  _hiddenNameOfEntity: string | null;
  wasConductedOnBehalf: boolean | null;
  onBehalfOf?: OnBehalfOf[] | null;
} & ConductorNpdData;

export interface ConductorNpdData {
  npdTypeOfDevice?: string | null;
  npdTypeOfDeviceOther?: string | null;
  npdDeviceIdNo?: string | null;
  npdUsername?: string | null;
  npdIp?: string | null;
  npdDateTimeSession?: string | null;
  npdTimeZone?: string | null;
}

export interface SourceOfFunds {
  linkToSub: string;
  _id?: string;
  _hiddenPartyKey: string | null;
  _hiddenSurname: string | null;
  _hiddenGivenName: string | null;
  _hiddenOtherOrInitial: string | null;
  _hiddenNameOfEntity: string | null;
  accountNumber: string | null;
  identifyingNumber: string | null;
}

export interface OnBehalfOf {
  linkToSub: string;
  _id?: string;
  _hiddenPartyKey: string | null;
  _hiddenSurname: string | null;
  _hiddenGivenName: string | null;
  _hiddenOtherOrInitial: string | null;
  _hiddenNameOfEntity: string | null;
}

export interface CompletingAction {
  _id?: string;
  detailsOfDispo: string | null;
  detailsOfDispoOther: string | null;
  amount: number | null;
  currency: string | null;
  exchangeRate: number | null;
  valueInCad: number | null;
  fiuNo: string | null;
  branch: string | null;
  account: string | null;
  accountType: string | null;
  accountTypeOther: string | null;
  accountCurrency: string | null;
  accountOpen: string | null;
  accountClose: string | null;
  accountStatus: string | null;
  hasAccountHolders: boolean | null;
  accountHolders?: AccountHolder[];
  wasAnyOtherSubInvolved: boolean | null;
  involvedIn?: InvolvedIn[];
  wasBenInfoObtained: boolean | null;
  beneficiaries?: Beneficiary[];
}

export interface InvolvedIn {
  linkToSub: string;
  _id?: string;
  _hiddenPartyKey: string | null;
  _hiddenSurname: string | null;
  _hiddenGivenName: string | null;
  _hiddenOtherOrInitial: string | null;
  _hiddenNameOfEntity: string | null;
  accountNumber: string | null;
  identifyingNumber: string | null;
}

export interface Beneficiary {
  linkToSub: string;
  _id?: string;
  _hiddenPartyKey: string | null;
  _hiddenSurname: string | null;
  _hiddenGivenName: string | null;
  _hiddenOtherOrInitial: string | null;
  _hiddenNameOfEntity: string | null;
}

export type StrTransactionDataColumnKey =
  | keyof StrTransaction
  | keyof AddPrefixToObject<StartingAction, 'startingActions.0.'>
  | keyof AddPrefixToObject<CompletingAction, 'completingActions.0.'>
  | keyof AddPrefixToObject<
      NonNullable<StartingAction['conductors']>[number],
      'startingActions.0.conductors.0.'
    >
  | keyof AddPrefixToObject<
      NonNullable<CompletingAction['beneficiaries']>[number],
      'completingActions.0.beneficiaries.0.'
    >
  | (string & {});

export type AddPrefixToObject<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${K}` : never]: T[K];
};

export type WithETag<T = object> = T & {
  /**
   * The last session in which the txn was edited not necessarily current session version.
   */
  eTag?: number;
};
