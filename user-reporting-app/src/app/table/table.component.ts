import { CommonModule, DatePipe } from "@angular/common";
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  type OnInit,
  TrackByFunction,
  ViewChild,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import {
  ChangeLog,
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "../change-log.service";
import { CrossTabEditService } from "../cross-tab-edit.service";
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  interval,
  map,
  scan,
  Subject,
  switchMap,
  take,
  takeUntil,
  takeWhile,
  tap,
  throwError,
} from "rxjs";
import {
  type SessionStateLocal,
  EditTabChangeLogsRes,
  SessionDataService,
} from "../session-data.service";
import { AuthService } from "../fingerprinting.service";
import { RecordService } from "../record.service";
import { SelectionModel } from "@angular/cdk/collections";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatSelectModule } from "@angular/material/select";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { ActivatedRoute } from "@angular/router";
import { removePageFromOpenTabs } from "../single-tab.guard";
import { PadZeroPipe } from "./pad-zero.pipe";
import { MatChipsModule } from "@angular/material/chips";
import { ClickOutsideTableDirective } from "./click-outside-table.directive";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ImportManualTxnsComponent } from "./import-manual-txns/import-manual-txns.component";
import {
  AbstractBaseTable,
  TableRecordUiProps,
} from "../base-table/abstract-base-table";
import { TableSelectionCompareWithAmlTxnId } from "../transaction-view/transaction-view.component";

@Component({
  selector: "app-table",
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    DatePipe,
    MatFormFieldModule,
    MatIconModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatCheckboxModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatInputModule,
    PadZeroPipe,
    MatChipsModule,
    ClickOutsideTableDirective,
    MatProgressSpinnerModule,
    MatSelectModule,
    ImportManualTxnsComponent,
  ],
  template: "",
  // template: `
  //   <div class="table-system">
  //     <mat-toolbar>
  //       <mat-toolbar-row>
  //         <h1>Reporting UI</h1>
  //         <mat-chip
  //           *ngIf="lastUpdated"
  //           selected="true"
  //           class="last-updated-chip"
  //         >
  //           <ng-container
  //             *ngIf="sessionDataService.saving$ | async; else updateIcon"
  //           >
  //             <mat-progress-spinner
  //               diameter="20"
  //               mode="indeterminate"
  //               class="last-updated-chip-spinner"
  //             ></mat-progress-spinner>
  //           </ng-container>
  //           <ng-template #updateIcon>
  //             <mat-icon class="mat-accent last-updated-chip-spinner"
  //               >update</mat-icon
  //             >
  //           </ng-template>
  //           Last Updated: {{ lastUpdated | date : "short" }}
  //         </mat-chip>
  //       </mat-toolbar-row>
  //       <mat-toolbar-row>
  //         <!-- Active Filter Chips -->
  //         <mat-chip-set aria-label="Active filters" class="filter-chips">
  //           <mat-chip
  //             *ngFor="
  //               let filter of filterFormActiveFilters$ | async;
  //               trackBy: filterFormTrackBy
  //             "
  //             removable="true"
  //             highlighted="true"
  //             disableRipple="true"
  //             (removed)="filterFormRemoveFilter(filter.sanitizedKey)"
  //           >
  //             {{ filter.header }}:
  //             <ng-container
  //               *ngIf="
  //                 filterFormHighlightSelectFilterKey === filter.sanitizedKey;
  //                 else showValue
  //               "
  //             >
  //               <span
  //                 class="color-box-in-chip"
  //                 [ngStyle]="{ 'background-color': filter.value }"
  //               ></span>
  //             </ng-container>
  //             <ng-template #showValue>
  //               {{ filter.value }}
  //             </ng-template>
  //             <button matChipRemove>
  //               <mat-icon>cancel</mat-icon>
  //             </button>
  //           </mat-chip>
  //         </mat-chip-set>
  //         @defer {
  //         <app-import-manual-txns />
  //         }
  //         <mat-chip-set class="color-pallette">
  //           <mat-chip
  //             *ngFor="
  //               let option of Object.entries(filterFormHighlightMap);
  //               trackBy: filterFormHighlightMapTrackBy
  //             "
  //             [style.backgroundColor]="option[0]"
  //             (click)="filterFormHighlightSelectedColor = option[0]"
  //             [highlighted]="filterFormHighlightSelectedColor === option[0]"
  //           >
  //             <span class="invisible-text">1</span>
  //           </mat-chip>
  //           <mat-chip
  //             (click)="filterFormHighlightSelectedColor = null"
  //             [highlighted]="filterFormHighlightSelectedColor === null"
  //           >
  //             <mat-icon>cancel</mat-icon>
  //           </mat-chip>
  //         </mat-chip-set>

  //         <button
  //           (click)="openBulkEditFormTab()"
  //           *ngIf="!this.selection.isEmpty()"
  //           mat-flat-button
  //           [disabled]="this.isSingleOrBulkEditTabOpen$ | async"
  //         >
  //           <mat-icon>edit</mat-icon>
  //           Bulk Edit ({{ this.selection.selected.length }})
  //         </button>
  //         <button mat-raised-button (click)="drawer.toggle()">
  //           <mat-icon>filter_list</mat-icon>
  //           Filter
  //         </button>
  //       </mat-toolbar-row>
  //     </mat-toolbar>
  //     <mat-drawer-container class="table-filter-container" hasBackdrop="false">
  //       <mat-drawer position="end" #drawer>
  //         <form [formGroup]="filterFormFormGroup" class="filter-header">
  //           <mat-toolbar>
  //             <mat-toolbar-row>
  //               <button mat-raised-button color="primary" type="submit">
  //                 Apply
  //               </button>
  //               <button
  //                 mat-button
  //                 color="warn"
  //                 type="button"
  //                 (click)="filterFormFormGroup.reset()"
  //                 [disabled]="filterFormFormGroup.pristine"
  //               >
  //                 Reset Filters
  //               </button>
  //               <div class="flex-fill"></div>
  //               <button mat-icon-button (click)="drawer.toggle()">
  //                 <mat-icon>close</mat-icon>
  //               </button>
  //             </mat-toolbar-row>
  //           </mat-toolbar>
  //           <ng-container
  //             *ngFor="
  //               let key of filterFormFilterKeys;
  //               trackBy: filterFormTrackBy
  //             "
  //           >
  //             <!-- Text Filter -->
  //             <mat-form-field *ngIf="filterFormIsTextFilterKey(key)">
  //               <mat-label
  //                 >Filter {{ this.displayedColumnsTransform(key) }}</mat-label
  //               >
  //               <input
  //                 matInput
  //                 [formControlName]="this.filterFormFilterFormKeySanitize(key)"
  //               />
  //               <button
  //                 matSuffix
  //                 mat-icon-button
  //                 *ngIf="
  //                   filterFormFormGroup.get(
  //                     this.filterFormFilterFormKeySanitize(key)
  //                   )?.value
  //                 "
  //                 (click)="
  //                   this.filterFormFormGroup
  //                     .get(this.filterFormFilterFormKeySanitize(key))
  //                     ?.reset()
  //                 "
  //               >
  //                 <mat-icon>clear</mat-icon>
  //               </button>
  //             </mat-form-field>

  //             <!-- Date Filter  -->
  //             <div *ngIf="this.dateFiltersIsDateFilterKey(key)">
  //               <mat-form-field>
  //                 <mat-label>{{
  //                   this.displayedColumnsTransform(key)
  //                 }}</mat-label>
  //                 <input
  //                   matInput
  //                   [formControlName]="
  //                     this.filterFormFilterFormKeySanitize(key)
  //                   "
  //                   [matDatepicker]="picker"
  //                 />
  //                 <mat-datepicker-toggle
  //                   matSuffix
  //                   [for]="picker"
  //                 ></mat-datepicker-toggle>
  //                 <mat-datepicker #picker></mat-datepicker>
  //               </mat-form-field>
  //             </div>

  //             <!-- Column Filter  -->
  //             <div
  //               *ngIf="
  //                 this.selectFiltersIsSelectFilterKey(key) &&
  //                 this.selectFiltersParseFilterKey(key) !== 'highlightColor'
  //               "
  //             >
  //               <mat-form-field>
  //                 <mat-label>{{
  //                   this.displayedColumnsTransform(key)
  //                 }}</mat-label>
  //                 <mat-select
  //                   matNativeControl
  //                   [formControlName]="
  //                     this.filterFormFilterFormKeySanitize(key)
  //                   "
  //                 >
  //                   <mat-option
  //                     *ngFor="
  //                       let option of selectFiltersOptionsSelectionsFiltered$[
  //                         key
  //                       ] | async;
  //                       trackBy: selectFiltersTrackByOption
  //                     "
  //                     [value]="option"
  //                   >
  //                     {{ option }}
  //                   </mat-option>
  //                 </mat-select>
  //               </mat-form-field>
  //             </div>

  //             <div *ngIf="key === this.filterFormHighlightSelectFilterKey">
  //               <mat-form-field>
  //                 <mat-label>{{
  //                   this.displayedColumnsTransform(key)
  //                 }}</mat-label>
  //                 <mat-select
  //                   [formControlName]="this.filterFormHighlightSelectFilterKey"
  //                 >
  //                   <mat-option
  //                     *ngFor="
  //                       let option of Object.entries(filterFormHighlightMap);
  //                       trackBy: filterFormHighlightMapTrackBy
  //                     "
  //                     [value]="option"
  //                   >
  //                     <span
  //                       class="color-box"
  //                       [ngStyle]="{ 'background-color': option[0] }"
  //                     ></span>
  //                     {{ option[1] }}
  //                   </mat-option>
  //                 </mat-select>
  //               </mat-form-field>
  //             </div>
  //           </ng-container>
  //         </form>
  //       </mat-drawer>

  //       <mat-drawer-content>
  //         <div
  //           class="table-container"
  //           (appClickOutsideTable)="
  //             filterFormHighlightSelectedColor = undefined
  //           "
  //         >
  //           <table
  //             mat-table
  //             [dataSource]="dataSource"
  //             [trackBy]="dataSourceTrackBy"
  //             matSort
  //           >
  //             <!-- Action Column -->
  //             <ng-container matColumnDef="actions">
  //               <th mat-header-cell *matHeaderCellDef>
  //                 <div [class.sticky-cell]="true">Actions</div>
  //               </th>
  //               <td
  //                 mat-cell
  //                 *matCellDef="let row"
  //                 [ngStyle]="{
  //                   backgroundColor: row.highlightColor || ''
  //                 }"
  //               >
  //                 <div [class.sticky-cell]="true">
  //                   <button
  //                     [disabled]="this.isSingleOrBulkEditTabOpen$ | async"
  //                     mat-icon-button
  //                     (click)="openEditFormTab(row)"
  //                   >
  //                     <mat-icon>edit</mat-icon>
  //                   </button>
  //                   <button
  //                     [disabled]="this.isSingleOrBulkEditTabOpen$ | async"
  //                     mat-icon-button
  //                     (click)="openAuditFormTab(row)"
  //                   >
  //                     <mat-icon>history</mat-icon>
  //                   </button>
  //                 </div>
  //               </td>
  //             </ng-container>
  //             <!-- Selection Model -->
  //             <ng-container matColumnDef="select">
  //               <th mat-header-cell *matHeaderCellDef>
  //                 <mat-checkbox
  //                   (change)="$event ? toggleAllRows() : null"
  //                   [checked]="selection.hasValue() && isAllSelected()"
  //                   [indeterminate]="selection.hasValue() && !isAllSelected()"
  //                   [disabled]="this.isSingleOrBulkEditTabOpen$ | async"
  //                 >
  //                 </mat-checkbox>
  //               </th>
  //               <td mat-cell *matCellDef="let row">
  //                 <mat-checkbox
  //                   (click)="$event.stopPropagation()"
  //                   (change)="$event ? selection.toggle(row) : null"
  //                   [checked]="selection.isSelected(row)"
  //                   [disabled]="this.isSingleOrBulkEditTabOpen$ | async"
  //                 >
  //                 </mat-checkbox>
  //               </td>
  //             </ng-container>
  //             <!-- Column Definitions  -->
  //             <ng-container
  //               *ngFor="let column of dataColumnsDisplayValues"
  //               [matColumnDef]="column"
  //             >
  //               <th
  //                 mat-header-cell
  //                 *matHeaderCellDef
  //                 [mat-sort-header]="column"
  //               >
  //                 <div [class.sticky-cell]="isStickyColumn(column)">
  //                   {{
  //                     column !== "_hiddenValidation"
  //                       ? this.displayedColumnsTransform(column)
  //                       : ""
  //                   }}
  //                 </div>
  //               </th>
  //               <td mat-cell *matCellDef="let row">
  //                 <div [class.sticky-cell]="isStickyColumn(column)">
  //                   <ng-container *ngIf="column === '_hiddenValidation'">
  //                     <ng-container *ngFor="let ch of row._hiddenValidation">
  //                       <span
  //                         [style.background-color]="getColorForValidation(ch)"
  //                         >{{ ch[0].toUpperCase() }}</span
  //                       >
  //                     </ng-container>
  //                   </ng-container>
  //                   <ng-container
  //                     *ngIf="this.dateFiltersValuesTime.includes(column)"
  //                   >
  //                     {{
  //                       this.dataColumnsGetUnsafeValueByPath(row, column)
  //                         | appPadZero : 5
  //                     }}
  //                   </ng-container>
  //                   <ng-container
  //                     *ngIf="this.dateFiltersValues.includes(column)"
  //                   >
  //                     {{
  //                       this.dataColumnsGetUnsafeValueByPath(row, column)
  //                         | date : "MM/dd/yyyy"
  //                     }}
  //                   </ng-container>
  //                   <ng-container
  //                     *ngIf="
  //                       !this.dateFiltersValues.includes(column) &&
  //                       !this.dateFiltersValuesIgnore.includes(column) &&
  //                       column !== '_hiddenValidation'
  //                     "
  //                   >
  //                     {{ this.dataColumnsGetUnsafeValueByPath(row, column) }}
  //                   </ng-container>
  //                 </div>
  //               </td>
  //             </ng-container>

  //             <tr
  //               mat-header-row
  //               *matHeaderRowDef="this.displayedColumnsValues"
  //             ></tr>
  //             <tr
  //               mat-row
  //               *matRowDef="let row; columns: this.displayedColumnsValues"
  //               [class.recentOpenHighlight]="
  //                 this.recentOpenRows.includes(row._mongoid)
  //               "
  //               (click)="filterFormAssignSelectedColorToRow(row, $event)"
  //               [style.cursor]="
  //                 filterFormHighlightSelectedColor !== undefined
  //                   ? 'pointer'
  //                   : 'default'
  //               "
  //             ></tr>
  //           </table>
  //         </div>
  //       </mat-drawer-content>
  //     </mat-drawer-container>
  //     <mat-paginator
  //       [pageSizeOptions]="pageSizeOptions"
  //       [pageSize]="pageSize"
  //       showFirstLastButtons
  //       aria-label="Select page of periodic elements"
  //     >
  //     </mat-paginator>
  //   </div>
  // `,
  styleUrls: ["./table.component.scss"],
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent<
    TData extends WithVersion<StrTxnDisplay> & TableRecordUiProps,
    TDataColumn extends StrTxnDisplayColumnKey,
    TDisplayColumn extends StrTxnDisplayColumnKeyWithActions,
    TFilterKeys extends string,
    TSelection = { [K in keyof TData]: string },
  >
  // extends AbstractBaseTable<
  //   TData,
  //   TDataColumn,
  //   TDisplayColumn,
  //   TFilterKeys,
  //   TSelection
  // >
  // implements OnInit, AfterViewInit, OnDestroy
{
/*   override dataSourceTrackBy: TrackByFunction<
    WithVersion<StrTxnDisplay> & TableRecordUiProps
  > = (_, txn) => {
    return txn._mongoid;
  };
  override filterFormAssignSelectedColorToRow(
    row: WithVersion<StrTxnDisplay> & TableRecordUiProps,
    event: MouseEvent,
  ): void {
    if (typeof this.filterFormHighlightSelectedColor === "undefined") return;

    let beforeRows: StrTxn[] = [];
    if (event.ctrlKey) {
      beforeRows = this.dataSource.filteredData;
    } else {
      beforeRows = [row];
    }
    // Apply selectedColor to rows
    const payload: EditTabChangeLogsRes[] = beforeRows
      .map((row) => {
        // make optimistic highlight
        const oldTxnHighlight: Pick<StrTxn, "highlightColor"> = {
          highlightColor: row.highlightColor,
        };
        const newTxnHighlight: Pick<StrTxn, "highlightColor"> = {
          highlightColor: this.filterFormHighlightSelectedColor,
        };
        row.highlightColor = this.filterFormHighlightSelectedColor;
        const changes: ChangeLogWithoutVersion[] = [];
        this.changeLogService.compareProperties(
          oldTxnHighlight,
          newTxnHighlight,
          changes,
        );
        return changes.length > 0
          ? { strTxnId: row._mongoid, changeLogs: changes }
          : null;
      })
      .filter(
        (editTabChangeLog): editTabChangeLog is EditTabChangeLogsRes =>
          !!editTabChangeLog,
      );
    this.sessionDataService.updateHighlights({
      type: "BULK_EDIT_RESULT",
      payload,
    });
    return;
  }

  selection = new SelectionModel<WithVersion<StrTxnDisplay>>(
    true,
    [],
    true,
    this.selectionComparator,
  );
  selectionComparator(
    o1: WithVersion<StrTxnDisplay>,
    o2: WithVersion<StrTxnDisplay>,
  ): boolean {
    return o1._mongoid === o2._mongoid;
  }
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows;
  }
  toggleAllRows() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.filteredData.forEach((row) =>
          this.selection.select(row),
        );
  }
  dataColumnsValues: StrTxnDisplayColumnKey[] = [
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
  displayedColumnsValues = [
    "actions" as const,
    "select" as const,
    ...this.dataColumnsDisplayValues,
  ];
  displayedColumnsColumnHeaderMap = {
    highlightColor: "Highlight",
    wasTxnAttempted: "Was the transaction attempted?",
    wasTxnAttemptedReason: "Reason transaction was not completed",
    methodOfTxn: "Method of Txn",
    purposeOfTxn: "Purpose of Txn",
    reportingEntityLocationNo: "Reporting Entity",
    dateOfTxn: "Date of Txn",
    timeOfTxn: "Time of Txn",
    dateOfPosting: "Date of Post",
    timeOfPosting: "Time of Post",
    "startingActions.0.directionOfSA": "Direction",
    "startingActions.0.typeOfFunds": "Type of Funds",
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
    "completingActions.0.detailsOfDispo": "Details of Disposition",
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
    _hiddenValidation: "Validation Errors",
    _hiddenTxnType: "Type of Txn",
    _hiddenAmlId: "AML Id",
  } as const satisfies Partial<Record<StrTxnDisplayColumnKey, string>>;

  stickyColumns: StrTxnDisplayColumnKeyWithActions[] = [
    "actions",
    "_mongoid",
    "_hiddenValidation",
  ];

  selectFiltersValues = [
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
  ] as StrTxnDisplayColumnKey[];
  dateFiltersValues = [
    "dateOfTxn",
    "dateOfPosting",
  ] as StrTxnDisplayColumnKey[];

  dateFiltersValuesIgnore = [
    "timeOfTxn",
    "timeOfPosting",
    "startingActions.0.accountOpen",
    "startingActions.0.accountClose",
    "completingActions.0.accountOpen",
    "completingActions.0.accountClose",
  ] as StrTxnDisplayColumnKey[];

  dateFiltersValuesTime = [
    "timeOfTxn",
    "timeOfPosting",
  ] as StrTxnDisplayColumnKey[];

  filterFormFilterKeys = this.filterFormFilterKeysCreate();
  filterFormFormGroup = this.filterFormGroupCreate();

  dataSource = new MatTableDataSource<WithVersion<StrTxnDisplay>>();

  recentOpenRows: string[] = [];

  constructor(
    private changeLogService: ChangeLogService<StrTxnDisplay>,
    private crossTabEditService: CrossTabEditService,
    private authService: AuthService,
    protected sessionDataService: SessionDataService,
    private recordService: RecordService,
    private route: ActivatedRoute,
  ) {
    super();
  }

  private destroy$ = new Subject<void>();

  @HostListener("window:beforeunload", ["$event"])
  ngOnDestroy = ((_$event: Event) => {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.editFormTab) this.editFormTab.close();
    if (this.bulkEditFormTab) this.bulkEditFormTab.close();

    removePageFromOpenTabs(this.route.snapshot);
  }) as () => void;

  ngOnInit() {
    this.dataSource.filterPredicate = this.filterFormFilterPredicateCreate();
    this.setupTableDataSource();

    this.sessionDataService.conflict$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.editFormTab?.close();
        this.bulkEditFormTab?.close();
      });

    this.filterFormFormGroup.valueChanges.subscribe((val) => {
      if (this.filterFormFormGroup.invalid) return;
      this.dataSource.filter = JSON.stringify(val);
      this.selection.clear();
    });
  }

  lastUpdated?: string;
  setupTableDataSource() {
    this.authService.userAuthId$
      .pipe(
        switchMap((userAuthId) =>
          this.sessionDataService.fetchSession("64a7f8c9e3a5b1d2f3c4e5a6").pipe(
            catchError((error) => {
              if (error.status === 404) {
                return this.sessionDataService.initialize(userAuthId);
              }
              return throwError(() => error);
            }),
          ),
        ),
        switchMap(() =>
          combineLatest([
            this.recordService.getStrTxns().pipe(map(this.addDisplayProps)),
            this.sessionDataService.sessionState$,
          ]),
        ),
        tap(([_, { lastUpdated }]) => {
          this.lastUpdated = lastUpdated;
        }),
        // tap(([strTxns, sessionState]) => {
        //   console.log(strTxns, sessionState);
        // }),
        scan((acc, [strTxns, sessionState]) => {
          const {
            data: { strTxnChangeLogs },
            editTabPartialChangeLogsResponse,
          } = sessionState;

          // apply edit tab res change logs and return
          if (editTabPartialChangeLogsResponse != null) {
            console.assert(acc.length > 0);
            return acc
              .map<
                Parameters<typeof TableComponent.prototype.addValidationInfo>[0]
              >((strTxn) => {
                const { strTxnId, changeLogs: partialChangeLogs = [] } =
                  editTabPartialChangeLogsResponse.find(
                    (res) => res.strTxnId === strTxn._mongoid,
                  ) || {};

                const { changeLogs: completeChangeLogs = [] } =
                  strTxnChangeLogs?.find(
                    (editedUser) => editedUser.strTxnId === strTxn._mongoid,
                  ) || {};

                if (!strTxnId) {
                  return { patchedStrTxn: strTxn, completeChangeLogs };
                }

                return {
                  patchedStrTxn: this.changeLogService.applyChanges(
                    strTxn,
                    partialChangeLogs,
                  ),
                  completeChangeLogs,
                };
              })
              .map(TableComponent.prototype.addValidationInfo);
          }

          return strTxns
            .map<
              Parameters<typeof TableComponent.prototype.addValidationInfo>[0]
            >((strTxn) => {
              const { changeLogs = [] } =
                strTxnChangeLogs?.find(
                  (editedUser) => editedUser.strTxnId === strTxn._mongoid,
                ) || {};
              return {
                patchedStrTxn: this.changeLogService.applyChanges(
                  strTxn,
                  changeLogs,
                ),
                completeChangeLogs: changeLogs,
              };
            })
            .map(this.addValidationInfo);
        }, [] as WithVersion<StrTxnDisplay>[]),
        tap((strTxns) => this.selectFiltersComputeUniqueFilterOptions(strTxns)),
        takeUntil(this.destroy$),
      )
      .subscribe((strTxns) => {
        this.dataSource.data = strTxns;
      });

    // init page size setup
    this.recordService
      .getStrTxns()
      .pipe(
        take(1),
        tap((txns) => this.updatePageSizeOptions(txns.length)),
      )
      .subscribe();
  }

  editFormTab: WindowProxy | null = null;
  openEditFormTab(record: WithVersion<StrTxn>) {
    this.recentOpenRows = [record._mongoid];
    this.editFormTab = this.crossTabEditService.openEditFormTab({
      editType: "EDIT_REQUEST",
      strTxn: record,
    });
    this.monitorEditTabOpenStatus({ tabWindow: this.editFormTab! });
  }

  bulkEditFormTab: WindowProxy | null = null;
  openBulkEditFormTab() {
    this.recentOpenRows = this.selection.selected.map(
      (strTxn) => strTxn._mongoid,
    );
    this.bulkEditFormTab = this.crossTabEditService.openEditFormTab({
      editType: "BULK_EDIT_REQUEST",
      strTxns: this.selection.selected,
    });
    this.monitorEditTabOpenStatus({
      tabWindow: this.bulkEditFormTab!,
    });
  }

  openAuditFormTab(record: WithVersion<StrTxn>) {
    this.recentOpenRows = [record._mongoid];
    combineLatest([
      this.recordService.getStrTxns(),
      this.sessionDataService.sessionState$,
    ])
      .pipe(
        take(1),
        map(([txns, sessionStateLocal]) => {
          const auditTxnv0 = txns.find(
            (txn) => txn._mongoid === record._mongoid,
          )!;
          const auditTxnChangeLogs =
            sessionStateLocal.data.strTxnChangeLogs!.find(
              (txnLogs) => txnLogs.strTxnId === record._mongoid,
            )?.changeLogs || [];

          return [auditTxnv0, auditTxnChangeLogs] as const;
        }),
        tap(([auditTxnv0, auditTxnChangeLogs]) => {
          const auditTxnv0WithVersion: WithVersion<StrTxn> = {
            ...auditTxnv0,
            _version: 0,
          };
          this.editFormTab = this.crossTabEditService.openEditFormTab({
            editType: "AUDIT_REQUEST",
            auditTxnv0WithVersion,
            auditTxnChangeLogs,
          });
          this.monitorEditTabOpenStatus({ tabWindow: this.editFormTab! });
        }),
      )
      .subscribe();
  }

  isSingleOrBulkEditTabOpen$ = new BehaviorSubject(false);
  monitorEditTabOpenStatus({ tabWindow }: { tabWindow: WindowProxy }) {
    this.isSingleOrBulkEditTabOpen$.next(true);
    interval(500)
      .pipe(
        takeWhile(() => !!tabWindow && !tabWindow.closed),
        takeUntil(this.destroy$),
      )
      .subscribe({
        complete: () => {
          this.isSingleOrBulkEditTabOpen$.next(false);
        },
      });
  }
  missingConductors(sa: StartingAction) {
    if (!sa.wasCondInfoObtained) return false;

    if (sa.conductors.length === 0) return true;
    if (sa.conductors.some((cond) => !cond.linkToSub)) return true;

    return false;
  }

  missingCibcInfo(action: StartingAction | CompletingAction) {
    if (action.fiuNo !== "010") return false;

    if (
      !action.branch ||
      !action.account ||
      !action.accountType ||
      (action.accountType === "Other" && !action.accountTypeOther) ||
      !action.accountCurrency ||
      !action.accountStatus ||
      !action.accountOpen ||
      (action.accountStatus === "Closed" && !action.accountClose)
    )
      return true;

    return false;
  }

  addDisplayProps(txns: StrTxn[]): WithVersion<StrTxnDisplay>[] {
    return txns.map((txn) => ({
      ...txn,
      _hiddenTxnType: txn.reportingEntityTxnRefNo.split("-")[0],
      _hiddenAmlId: "41179074",
      _version: 0,
    }));
  }

  addValidationInfo({
    patchedStrTxn,
    completeChangeLogs,
  }: {
    patchedStrTxn: WithVersion<StrTxnDisplay>;
    completeChangeLogs: ChangeLog[];
  }) {
    const errors: _hiddenValidationType[] = [];
    if (
      patchedStrTxn._version &&
      patchedStrTxn._version > 0 &&
      !completeChangeLogs.every((log) => log.path === "highlightColor")
    )
      errors.push("Edited Txn");
    if (patchedStrTxn.startingActions.some(this.missingConductors))
      errors.push("Conductor Missing");
    if (
      patchedStrTxn.startingActions.some(this.missingCibcInfo) ||
      patchedStrTxn.completingActions.some(this.missingCibcInfo)
    )
      errors.push("Bank Info Missing");

    patchedStrTxn._hiddenValidation = errors;
    return patchedStrTxn;
  }

  getColorForValidation(error: _hiddenValidationType): string {
    const colors: Record<_hiddenValidationType, string> = {
      "Conductor Missing": "#dc3545",
      "Bank Info Missing": "#ba005c",
      "Edited Txn": "#0d6efd",
    };
    if (!error) return "#007bff"; // fallback color
    return colors[error];
  } */
}

type _hiddenValidationType =
  | "Edited Txn"
  | "Conductor Missing"
  | "Bank Info Missing";

export interface StrTxn {
  _mongoid: string;
  wasTxnAttempted: boolean;
  wasTxnAttemptedReason: string;
  dateOfTxn: string;
  timeOfTxn: string;
  hasPostingDate: boolean;
  dateOfPosting: string;
  timeOfPosting: string;
  methodOfTxn: string;
  methodOfTxnOther: string;
  reportingEntityTxnRefNo: string;
  purposeOfTxn: string;
  reportingEntityLocationNo: string;
  startingActions: StartingAction[];
  completingActions: CompletingAction[];
  highlightColor?: string | null;
}

// todo incorporate some of these in data source
export type StrTxnDisplay = StrTxn & {
  _hiddenValidation?: _hiddenValidationType[];
  _hiddenTxnType: string;
  _hiddenAmlId: string;
} & TableSelectionCompareWithAmlTxnId;

export interface CompletingAction {
  _id: string;
  detailsOfDispo: string;
  detailsOfDispoOther: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  valueInCad: number;
  fiuNo: string;
  branch: string;
  account: string;
  accountType: string;
  accountTypeOther: string;
  accountCurrency: string;
  accountOpen: string;
  accountClose: string;
  accountStatus: string;
  hasAccountHolders: boolean;
  accountHolders?: AccountHolder[];
  wasAnyOtherSubInvolved: boolean;
  involvedIn?: InvolvedIn[];
  wasBenInfoObtained: boolean;
  beneficiaries?: Beneficiary[];
}

export interface Beneficiary {
  _id: string;
  linkToSub: string;
  clientNo: number;
  email: string;
  url: null;
}

export interface InvolvedIn {
  _id: string;
  linkToSub: string;
  accountNumber: string;
  policyNumber: string;
  identifyingNumber: string;
}

export interface AccountHolder {
  _id: string;
  linkToSub: string;
}

export interface StartingAction {
  _id: string;
  directionOfSA: string;
  typeOfFunds: string;
  typeOfFundsOther: string;
  amount: number;
  currency: string;
  fiuNo: string;
  branch: string;
  account: string;
  accountType: string;
  accountTypeOther: string;
  accountOpen: string;
  accountClose: string;
  accountStatus: string;
  howFundsObtained: string;
  accountCurrency: string;
  hasAccountHolders: boolean;
  accountHolders?: AccountHolder[];
  wasSofInfoObtained: boolean;
  sourceOfFunds: SourceOfFunds[];
  wasCondInfoObtained: boolean;
  conductors: Conductor[];
}

export interface Conductor {
  _id: string;
  linkToSub: string;
  clientNo: string;
  email: string;
  url: string;
  wasConductedOnBehalf: boolean;
  onBehalfOf: OnBehalfOf[];
}

export interface SourceOfFunds {
  _id: string;
  linkToSub: string;
  accountNumber: string;
  policyNumber: string;
  identifyingNumber: string;
}

export interface OnBehalfOf {
  linkToSub: string;
  clientNo: string;
  email: string;
  url: string;
  relationToCond: string;
  relationToCondOther: string;
}

type DateKeys<T> = {
  [K in keyof T]: K extends `${string}Date${string}` ? K : never;
}[keyof T];

type WithDateRange<T> = T & {
  [K in DateKeys<T> as `${K & string}Start`]: string;
} & {
  [K in DateKeys<T> as `${K & string}End`]: string;
};

type FilterKeysType = keyof WithDateRange<StrTxnDisplay>;

export type StrTxnDisplayColumnKey =
  | keyof StrTxnDisplay
  | keyof AddPrefixToObject<StartingAction, "startingActions.0.">
  | keyof AddPrefixToObject<StartingAction, "startingActions.0.">
  | keyof AddPrefixToObject<
      StartingAction["conductors"][number],
      "startingActions.0.conductors.0."
    >
  | (string & {});

type StrTxnDisplayColumnKeyWithActions =
  | StrTxnDisplayColumnKey
  | "actions"
  | "select";

export type AddPrefixToObject<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${K}` : never]: T[K];
};

export interface SessionDataReqBody {
  userId: string;
  data: SessionStateLocal;
}

// export type ColumnHeaderLabels =
//   (typeof TableComponent.prototype.displayedColumnsColumnHeaderMap)[keyof typeof TableComponent.prototype.displayedColumnsColumnHeaderMap];
