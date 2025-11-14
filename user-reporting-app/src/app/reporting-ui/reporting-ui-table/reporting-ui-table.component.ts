import { SelectionModel } from "@angular/cdk/collections";
import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TrackByFunction,
  inject,
} from "@angular/core";
import { MatBadgeModule } from "@angular/material/badge";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { MatIconModule } from "@angular/material/icon";
import { MatTableModule } from "@angular/material/table";
import { MatToolbarModule } from "@angular/material/toolbar";
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { BehaviorSubject, Observable, map, startWith } from "rxjs";
import { SessionDataService } from "../../aml/session-data.service";
import { BaseTableComponent } from "../../base-table/base-table.component";

@Component({
  selector: "app-reporting-ui-table",
  imports: [
    BaseTableComponent,
    CommonModule,
    MatTableModule,
    MatCheckbox,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
  ],
  template: `
    <app-base-table
      #baseTable
      [data]="(strTransactionData$ | async) ?? []"
      [dataColumnsValues]="dataColumnsValues"
      [dataColumnsIgnoreValues]="dataColumnsIgnoreValues"
      [dataColumnsProjected]="dataColumnsProjected"
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
      [hasMasterToggle]="true"
      [filterFormHighlightSelectFilterKey]="'highlightColor'"
      [recentlyOpenRows$]="recentlyOpenedRows$"
      [sortingAccessorDateTimeTuples]="sortingAccessorDateTimeTuples"
      [sortedBy]="'dateOfTxn'"
    >
      <!-- Selection Model -->
      <ng-container matColumnDef="select">
        <th
          mat-header-cell
          *matHeaderCellDef
          [class.sticky-cell]="baseTable.isStickyColumn('select')"
        >
          <div *ngIf="baseTable.hasMasterToggle">
            <mat-checkbox
              (change)="$event ? baseTable.toggleAllRows() : null"
              [checked]="selection.hasValue() && baseTable.isAllSelected()"
              [indeterminate]="
                selection.hasValue() && !baseTable.isAllSelected()
              "
            >
            </mat-checkbox>
          </div>
        </th>
        <td
          mat-cell
          *matCellDef="let row; let i = index"
          [class.sticky-cell]="baseTable.isStickyColumn('select')"
        >
          <div>
            <mat-checkbox
              (click)="baseTable.onCheckBoxClickMultiToggle($event, row, i)"
              (change)="$event ? baseTable.toggleRow(row) : null"
              [checked]="selection.isSelected(row)"
            >
            </mat-checkbox>
          </div>
        </td>
      </ng-container>
      <!-- Actions column -->
      <ng-container matColumnDef="actions">
        <th
          mat-header-cell
          *matHeaderCellDef
          [class.sticky-cell]="baseTable.isStickyColumn('actions')"
        >
          <div>
            <button
              [disabled]="this.isBulkEditBtnDisabled$ | async"
              mat-icon-button
              (click)="navigateToBulkEdit()"
              [matBadge]="selection.selected.length"
              [matBadgeHidden]="!selection.hasValue()"
            >
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button class="invisible">
              <mat-icon>history</mat-icon>
            </button>
          </div>
        </th>
        <td
          mat-cell
          *matCellDef="let row"
          [ngStyle]="{
            backgroundColor:
              row[baseTable.filterFormHighlightSelectFilterKey] || ''
          }"
          [class.sticky-cell]="baseTable.isStickyColumn('actions')"
        >
          <div>
            <button
              mat-icon-button
              (click)="navigateToEditForm(row)"
              [disabled]="isEditDisabled(row) | async"
            >
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button (click)="navigateToAuditForm(row)">
              <mat-icon>history</mat-icon>
            </button>
          </div>
        </td>
      </ng-container>
      <!-- Validation Info column -->
      <ng-container matColumnDef="_hiddenValidation">
        <th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header="_hiddenValidation"
          [class.sticky-cell]="baseTable.isStickyColumn('_hiddenValidation')"
        >
          <div></div>
        </th>
        <td
          mat-cell
          *matCellDef="let row"
          [class.sticky-cell]="baseTable.isStickyColumn('_hiddenValidation')"
        >
          <div>
            <ng-container *ngFor="let ch of row._hiddenValidation">
              <span [style.background-color]="getColorForValidation(ch)">
                {{ ch[0].toUpperCase() }}
              </span>
            </ng-container>
          </div>
        </td>
      </ng-container>
    </app-base-table>
  `,
  styleUrl: "./reporting-ui-table.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportingUiTableComponent {
  @Input()
  strTransactionData$!: Observable<StrTransactionData[]>;
  @Input()
  savingEdits$!: Observable<string[]>;

  dataSourceTrackBy: TrackByFunction<StrTransactionData> = (_, txn) => {
    return txn.flowOfFundsAmlTransactionId;
  };

  sortingDataAccessor = (data: StrTransactionData, sortHeaderId: string) => {};

  // override filterFormAssignSelectedColorToRow(
  //   row: EditedTransaction,
  //   event: MouseEvent,
  // ): void {
  //   if (typeof this.filterFormHighlightSelectedColor === "undefined") return;

  //   let beforeRows: StrTxn[] = [];
  //   if (event.ctrlKey) {
  //     beforeRows = this.dataSource.filteredData;
  //   } else {
  //     beforeRows = [row];
  //   }
  //   // Apply selectedColor to rows
  //   const payload: EditTabChangeLogsRes[] = beforeRows
  //     .map((row) => {
  //       // make optimistic highlight
  //       const oldTxnHighlight: Pick<StrTxn, "highlightColor"> = {
  //         highlightColor: row.highlightColor,
  //       };
  //       const newTxnHighlight: Pick<StrTxn, "highlightColor"> = {
  //         highlightColor: this.filterFormHighlightSelectedColor,
  //       };
  //       row.highlightColor = this.filterFormHighlightSelectedColor;
  //       const changes: ChangeLogWithoutVersion[] = [];
  //       this.changeLogService.compareProperties(
  //         oldTxnHighlight,
  //         newTxnHighlight,
  //         changes,
  //       );
  //       return changes.length > 0
  //         ? { strTxnId: row.flowOfFundsAmlTransactionId, changeLogs: changes }
  //         : null;
  //     })
  //     .filter(
  //       (editTabChangeLog): editTabChangeLog is EditTabChangeLogsRes =>
  //         !!editTabChangeLog,
  //     );
  //   this.sessionDataService.updateHighlights({
  //     type: "BULK_EDIT_RESULT",
  //     payload,
  //   });
  //   return;
  // }

  selection = new SelectionModel(true, [], true, this.selectionComparator);
  selectionComparator(
    o1: { flowOfFundsAmlTransactionId: string },
    o2: { flowOfFundsAmlTransactionId: string },
  ): boolean {
    return o1.flowOfFundsAmlTransactionId === o2.flowOfFundsAmlTransactionId;
  }

  isBulkEditBtnDisabled$ = this.selection.changed.asObservable().pipe(
    map(() => this.selection.selected.length === 0),
    startWith(true),
  );

  dataColumnsValues: StrTransactionDataColumnKey[] = [
    "highlightColor",
    "_hiddenValidation",
    "dateOfTxn",
    "timeOfTxn",
    "dateOfPosting",
    "timeOfPosting",
    "_hiddenTxnType",
    "methodOfTxn",
    "reportingEntityLocationNo",
    "startingActions.0.directionOfSA",
    "startingActions.0.typeOfFunds",
    "startingActions.0.amount",
    "startingActions.0.currency",
    "startingActions.0.fiuNo",
    "startingActions.0.branch",
    "startingActions.0.account",
    "startingActions.0.accountType",
    "startingActions.0.conductors.0.email",
    "completingActions.0.detailsOfDispo",
    "completingActions.0.amount",
    "completingActions.0.currency",
    "completingActions.0.fiuNo",
    "completingActions.0.branch",
    "completingActions.0.account",
    "completingActions.0.accountType",
    "startingActions.0.accountOpen",
    "startingActions.0.accountClose",
    "startingActions.0.accountCurrency",
    "completingActions.0.accountOpen",
    "completingActions.0.accountClose",
    "completingActions.0.accountCurrency",
    "_hiddenAmlId",
    "reportingEntityTxnRefNo",
  ];

  dataColumnsIgnoreValues = ["highlightColor"];
  dataColumnsProjected = ["_hiddenValidation"];

  displayedColumns = ["select" as const, "actions" as const];

  displayedColumnsColumnHeaderMap: Partial<
    Record<"fullTextFilterKey" | StrTransactionDataColumnKey, string>
  > = {
    highlightColor: "Highlight",
    wasTxnAttempted: "Was the transaction attempted?",
    wasTxnAttemptedReason: "Reason transaction was not completed",
    methodOfTxn: "Method of Txn",
    purposeOfTxn: "Purpose of Txn",
    reportingEntityLocationNo: "Reporting Entity",
    dateOfTxn: "Txn Date",
    timeOfTxn: "Txn Time",
    dateOfPosting: "Post Date",
    timeOfPosting: "Post Time",
    "startingActions.0.directionOfSA": "Direction",
    "startingActions.0.typeOfFunds": "Funds Type",
    "startingActions.0.amount": "Debit",
    "startingActions.0.currency": "Debit Currency",
    "startingActions.0.fiuNo": "Debit FIU",
    "startingActions.0.branch": "Debit Branch",
    "startingActions.0.account": "Debit Account",
    "startingActions.0.accountType": "Debit Account Type",
    "startingActions.0.howFundsObtained": "How were the funds obtained?",
    "startingActions.0.wasSofInfoObtained":
      "Was information about the source of funds or virtual currency obtained?",
    "startingActions.0.wasCondInfoObtained":
      "Have you obtained any related conductor info?",
    "startingActions.0.conductors.0.wasConductedOnBehalf":
      "Was this transaction conducted or attempted on behalf of another person or entity?",
    "startingActions.0.conductors.0.email": "Conductor Email",
    "completingActions.0.detailsOfDispo": "Disposition Details",
    "completingActions.0.amount": "Credit Amount",
    "completingActions.0.currency": "Credit Currency",
    "completingActions.0.fiuNo": "Credit FIU",
    "completingActions.0.branch": "Credit Branch",
    "completingActions.0.account": "Credit Account",
    "completingActions.0.accountType": "Credit Account Type",
    "startingActions.0.accountOpen": "Debit Account Open",
    "startingActions.0.accountClose": "Debit Account Close",
    "startingActions.0.accountCurrency": "Debit Account Currency",
    "completingActions.0.accountOpen": "Credit Account Open",
    "completingActions.0.accountClose": "Credit Account Close",
    "completingActions.0.accountCurrency": "Credit Account Currency",
    "completingActions.0.wasAnyOtherSubInvolved":
      "Was there any other person or entity involved in the completing action?",
    reportingEntityTxnRefNo: "Transaction Reference No",
    _hiddenValidation: "Validation Info",
    _hiddenTxnType: "Txn Type",
    _hiddenAmlId: "AML Id",
    fullTextFilterKey: "Full Text",
  };

  stickyColumns: (StrTransactionDataColumnKey | "actions" | "select")[] = [
    "actions",
    "select",
    "_mongoid",
    "_hiddenValidation",
  ];

  selectFiltersValues: StrTransactionDataColumnKey[] = [
    "highlightColor",
    "_hiddenValidation",
    "methodOfTxn",
    "reportingEntityLocationNo",
    "startingActions.0.directionOfSA",
    "startingActions.0.typeOfFunds",
    "startingActions.0.fiuNo",
    "startingActions.0.accountType",
    "startingActions.0.currency",
    "startingActions.0.branch",
    "startingActions.0.account",
    "startingActions.0.accountCurrency",
    "startingActions.0.conductors.0.email",
    "completingActions.0.detailsOfDispo",
    "completingActions.0.fiuNo",
    "completingActions.0.accountType",
    "completingActions.0.currency",
    "completingActions.0.branch",
    "completingActions.0.account",
    "completingActions.0.accountCurrency",
    "_hiddenTxnType",
    "_hiddenAmlId",
  ];

  dateFiltersValues: StrTransactionDataColumnKey[] = [
    "dateOfTxn",
    "dateOfPosting",
  ];

  dateFiltersValuesIgnore: StrTransactionDataColumnKey[] = [
    "timeOfTxn",
    "timeOfPosting",
    "startingActions.0.accountOpen",
    "startingActions.0.accountClose",
    "completingActions.0.accountOpen",
    "completingActions.0.accountClose",
  ];

  displayedColumnsTime: StrTransactionDataColumnKey[] = [
    "timeOfTxn",
    "timeOfPosting",
  ];

  sortingAccessorDateTimeTuples: StrTransactionDataColumnKey[][] = [
    ["dateOfTxn", "timeOfTxn"],
    ["dateOfPosting", "timeOfPosting"],
  ];

  private recentlyOpenedRowsSubject = new BehaviorSubject([] as string[]);
  recentlyOpenedRows$ = this.recentlyOpenedRowsSubject.asObservable();

  isEditDisabled(row: StrTransactionData) {
    return this.savingEdits$.pipe(
      map((ids) => ids.includes(row.flowOfFundsAmlTransactionId)),
    );
  }

  getColorForValidation(error: _hiddenValidationType): string {
    const colors: Record<_hiddenValidationType, string> = {
      "Conductor Missing": "#dc3545",
      "Bank Info Missing": "#ba005c",
      "Edited Txn": "#0d6efd",
    };
    if (!error) return "#007bff"; // fallback color
    return colors[error];
  }

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  navigateToEditForm(record: StrTransactionData) {
    this.recentlyOpenedRowsSubject.next([record.flowOfFundsAmlTransactionId]);
    this.router.navigate(
      [`../edit-form/${record.flowOfFundsAmlTransactionId}`],
      {
        relativeTo: this.route,
      },
    );
  }

  navigateToBulkEdit() {
    const selectedTransactionsForBulkEdit = this.selection.selected.map(
      (strTxn) => strTxn.flowOfFundsAmlTransactionId,
    );
    this.recentlyOpenedRowsSubject.next(selectedTransactionsForBulkEdit);
    this.router.navigate(["../edit-form/bulk-edit"], {
      relativeTo: this.route,
      state: {
        selectedTransactionsForBulkEdit,
      },
    });
  }

  navigateToAuditForm(record: StrTransactionData) {
    this.recentlyOpenedRowsSubject.next([record.flowOfFundsAmlTransactionId]);

    // this.crossTabEditService.openEditFormTab({
    //   editType: "AUDIT_REQUEST",
    //   strTxn: record,
    // });
  }
}

export type _hiddenValidationType =
  | "Edited Txn"
  | "Conductor Missing"
  | "Bank Info Missing";

// Hidden props prefixed with '_hidden' are ignored by the change logging service.
export type StrTransactionData = StrTransaction & {
  _hiddenValidation?: _hiddenValidationType[];
  _hiddenTxnType: string;
  _hiddenAmlId: string;
  _hiddenStrTxnId: string;
};

export type StrTransaction = {
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
  startingActions: StartingAction[];
  _hiddenSaAmount?: number;
  completingActions: CompletingAction[];
  highlightColor?: string | null;
} & StrTxnFlowOfFunds;

export type StrTxnFlowOfFunds = {
  flowOfFundsAccountCurrency: string | null;
  flowOfFundsAmlId: number;
  flowOfFundsAmlTransactionId: string;
  flowOfFundsCasePartyKey: number;
  flowOfFundsConductorPartyKey: number;
  flowOfFundsCreditAmount: number | null;
  flowOfFundsCreditedAccount: string | null;
  flowOfFundsCreditedTransit: string | null;
  flowOfFundsDebitAmount: number | null;
  flowOfFundsDebitedAccount: string | null;
  flowOfFundsDebitedTransit: string | null;
  flowOfFundsPostingDate: string;
  flowOfFundsSource: string;
  flowOfFundsSourceTransactionId: string;
  flowOfFundsTransactionCurrency: string;
  flowOfFundsTransactionCurrencyAmount: number;
  flowOfFundsTransactionDate: string;
  flowOfFundsTransactionDesc: string;
  flowOfFundsTransactionTime: string;
};

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
  _id?: string;
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
}

export type Conductor = {
  _id?: string;
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
  wasConductedOnBehalf: boolean | null;
  onBehalfOf?: OnBehalfOf[] | null;
} & ConductorNpdData;

export type ConductorNpdData = {
  npdTypeOfDevice?: string | null;
  npdTypeOfDeviceOther?: string | null;
  npdDeviceIdNo?: string | null;
  npdUsername?: string | null;
  npdIp?: string | null;
  npdDateTimeSession?: string | null;
  npdTimeZone?: string | null;
};

export interface SourceOfFunds {
  _id?: string;
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
  accountNumber: string | null;
  identifyingNumber: string | null;
}

export interface OnBehalfOf {
  _id?: string;
  partyKey: string;
  surname: string;
  givenName: string;
  otherOrInitial: string;
  nameOfEntity: string;
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
  _id?: string;
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
  accountNumber: string | null;
  identifyingNumber: string | null;
}

export interface Beneficiary {
  _id?: string;
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
}

export type StrTransactionDataColumnKey =
  | keyof StrTransactionData
  | keyof AddPrefixToObject<StartingAction, "startingActions.0.">
  | keyof AddPrefixToObject<StartingAction, "startingActions.0.">
  | keyof AddPrefixToObject<
      NonNullable<StartingAction["conductors"]>[number],
      "startingActions.0.conductors.0."
    >
  | (string & {});

export type AddPrefixToObject<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${K}` : never]: T[K];
};

export const strTransactionsEditedResolver: ResolveFn<
  Observable<StrTransactionData[]>
> = async (route: ActivatedRouteSnapshot, _: RouterStateSnapshot) => {
  return inject(SessionDataService).strTransactionData$;
};

export const savingEditsResolver: ResolveFn<Observable<string[]>> = async (
  _route: ActivatedRouteSnapshot,
  _: RouterStateSnapshot,
) => {
  return inject(SessionDataService).savingEdits$;
};
