import { CommonModule, DatePipe } from "@angular/common";
import {
  type AfterViewInit,
  Component,
  HostListener,
  inject,
  OnDestroy,
  type OnInit,
  ViewChild,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from "@angular/material/datepicker";
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
  MatFormFieldModule,
} from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { ChangeLogService, WithVersion } from "../change-log.service";
import { CrossTabEditService } from "../cross-tab-edit.service";
import {
  catchError,
  combineLatest,
  interval,
  scan,
  Subject,
  switchMap,
  takeUntil,
  takeWhile,
  throwError,
} from "rxjs";
import {
  type SessionStateLocal,
  SessionDataService,
} from "../session-data.service";
import { AuthService } from "../fingerprinting.service";
import { RecordService } from "../record.service";
import { SelectionModel } from "@angular/cdk/collections";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { ActivatedRoute } from "@angular/router";
import { removePageFromOpenTabs } from "../single-tab.guard";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import { PadZeroPipe } from "./pad-zero.pipe";
import { MatChipsModule } from "@angular/material/chips";
import { MatSnackBar } from "@angular/material/snack-bar";

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
  ],
  template: `
    <div class="table-system">
      <mat-toolbar>
        <mat-toolbar-row>
          <h1>Reporting UI</h1>
          <mat-chip
      *ngIf="lastUpdated"
      color="primary"
      selected="true"
      class="last-updated-chip"
    >
      <mat-icon>update</mat-icon>
      Last Updated: {{ lastUpdated | date: 'short' }}
    </mat-chip>
        </mat-toolbar-row>
        <mat-toolbar-row>
          <!-- Active Filter Chips -->
          <mat-chip-set aria-label="Active filters" class="filter-chips">
            <mat-chip
              *ngFor="
                let filter of filterForm.activeFilters;
                trackBy: filterForm.trackBy
              "
              removable="true"
              highlighted="true"
              disableRipple="true"
              (removed)="filterForm.removeFilter(filter.sanitizedKey)"
            >
              {{ filter.key }}: {{ filter.value }}
              <button matChipRemove>
                <mat-icon>cancel</mat-icon>
              </button>
            </mat-chip>
          </mat-chip-set>
          <button
            (click)="openBulkEditFormTab()"
            *ngIf="!this.selection.isEmpty()"
            mat-flat-button
            [disabled]="this.isSingleOrBulkEditTabOpen"
          >
            <mat-icon>edit</mat-icon>
            Bulk Edit ({{ this.selection.selected.length }})
          </button>
          <button mat-raised-button (click)="drawer.toggle()">
            <mat-icon>filter_list</mat-icon>
            Filter
          </button>
        </mat-toolbar-row>
      </mat-toolbar>
      <mat-drawer-container class="table-filter-container" hasBackdrop="false">
        <mat-drawer position="end" #drawer>
          <form [formGroup]="filterForm.formGroup" class="filter-header">
            <mat-toolbar>
              <mat-toolbar-row>
                <button mat-raised-button color="primary" type="submit">
                  Apply
                </button>
                <button
                  mat-button
                  color="warn"
                  type="button"
                  (click)="filterForm.formGroup.reset()"
                  [disabled]="filterForm.formGroup.pristine"
                >
                  Reset Filters
                </button>
                <div class="flex-fill"></div>
                <button mat-icon-button (click)="drawer.toggle()">
                  <mat-icon>close</mat-icon>
                </button>
              </mat-toolbar-row>
            </mat-toolbar>
            <ng-container *ngFor="let key of filterKeys; trackBy:filterForm.trackBy">
              <!-- Text Filter -->
              <mat-form-field *ngIf="isTextFilterKey(key)">
                <mat-label
                  >Filter {{ this.displayedColumns.transform(key) }}</mat-label
                >
                <input
                  matInput
                  [formControlName]="this.filterForm.filterFormKeySanitize(key)"
                />
                <button
                  matSuffix
                  mat-icon-button
                  *ngIf="
                    filterForm.formGroup.get(
                      this.filterForm.filterFormKeySanitize(key)
                    )?.value
                  "
                  (click)="
                    this.filterForm.formGroup
                      .get(this.filterForm.filterFormKeySanitize(key))
                      ?.reset()
                  "
                >
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <!-- Date Filter  -->
              <div *ngIf="this.dateFilters.isDateFilterKey(key)">
                <mat-form-field>
                  <mat-label>{{
                    this.displayedColumns.transform(key)
                  }}</mat-label>
                  <input
                    matInput
                    [formControlName]="
                      this.filterForm.filterFormKeySanitize(key)
                    "
                    [matDatepicker]="picker"
                  />
                  <mat-datepicker-toggle
                    matSuffix
                    [for]="picker"
                  ></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                </mat-form-field>
              </div>

              <!-- Column Filter  -->
              <div *ngIf="this.selectFilters.isSelectFilterKey(key)">
                <mat-form-field>
                  <mat-label>{{
                    this.displayedColumns.transform(key)
                  }}</mat-label>
                  <select
                    matNativeControl
                    [formControlName]="
                      this.filterForm.filterFormKeySanitize(key)
                    "
                  >
                    <option
                      *ngFor="
                        let option of getUniqueColumnValuesForSelectFilter(key)
                      "
                      [value]="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                </mat-form-field>
              </div>
            </ng-container>
          </form>
        </mat-drawer>

        <mat-drawer-content>
          <div class="table-container">
            <table mat-table [dataSource]="dataSource" matSort>
              <!-- Action Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>
                  <div [class.sticky-cell]="true">Actions</div>
                </th>
                <td mat-cell *matCellDef="let row">
                  <div [class.sticky-cell]="true">
                    <button
                      [disabled]="this.isSingleOrBulkEditTabOpen"
                      mat-icon-button
                      (click)="openEditFormTab(row)"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>
              <!-- Selection Model -->
              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef>
                  <mat-checkbox
                    (change)="$event ? toggleAllRows() : null"
                    [checked]="selection.hasValue() && isAllSelected()"
                    [indeterminate]="selection.hasValue() && !isAllSelected()"
                    [disabled]="this.isSingleOrBulkEditTabOpen"
                  >
                  </mat-checkbox>
                </th>
                <td mat-cell *matCellDef="let row">
                  <mat-checkbox
                    (click)="$event.stopPropagation()"
                    (change)="$event ? selection.toggle(row) : null"
                    [checked]="selection.isSelected(row)"
                    [disabled]="this.isSingleOrBulkEditTabOpen"
                  >
                  </mat-checkbox>
                </td>
              </ng-container>
              <!-- Column Definitions  -->
              <ng-container
                *ngFor="let column of dataColumns.values"
                [matColumnDef]="column"
              >
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  [mat-sort-header]="column"
                >
                  <div [class.sticky-cell]="isStickyColumn(column)">
                    {{
                      column !== "_hiddenValidation"
                        ? this.displayedColumns.transform(column)
                        : ""
                    }}
                  </div>
                </th>
                <td mat-cell *matCellDef="let row">
                  <div [class.sticky-cell]="isStickyColumn(column)">
                    <ng-container *ngIf="column === '_hiddenValidation'">
                      <ng-container *ngFor="let ch of row._hiddenValidation">
                        <span
                          [style.background-color]="getColorForValidation(ch)"
                          >{{ ch[0].toUpperCase() }}</span
                        >
                      </ng-container>
                    </ng-container>
                    <ng-container
                      *ngIf="this.dateFilters.valuesTime.includes(column)"
                    >
                      {{
                        this.dataColumns.getValueByPath(row, column)
                          | appPadZero : 5
                      }}
                    </ng-container>
                    <ng-container
                      *ngIf="this.dateFilters.values.includes(column)"
                    >
                      {{
                        this.dataColumns.getValueByPath(row, column)
                          | date : "MM/dd/yyyy"
                      }}
                    </ng-container>
                    <ng-container
                      *ngIf="
                        !this.dateFilters.values.includes(column) &&
                        !this.dateFilters.valuesIgnore.includes(column) &&
                        column !== '_hiddenValidation'
                      "
                    >
                      {{ this.dataColumns.getValueByPath(row, column) }}
                    </ng-container>
                  </div>
                </td>
              </ng-container>

              <tr
                mat-header-row
                *matHeaderRowDef="this.displayedColumns.values"
              ></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: this.displayedColumns.values"
                [class.recentOpenHighlight]="
                  this.recentOpenRows.includes(row._mongoid)
                "
              ></tr>
            </table>
          </div>
        </mat-drawer-content>
      </mat-drawer-container>
      <mat-paginator
        [pageSizeOptions]="pageSizeOptions"
        [pageSize]="pageSize"
        showFirstLastButtons
        aria-label="Select page of periodic elements"
      >
      </mat-paginator>
    </div>
  `,
  styleUrls: ["./table.component.scss"],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: "outline",
        floatLabel: "auto",
      } as MatFormFieldDefaultOptions,
    },
  ],
})
export class TableComponent implements OnInit, AfterViewInit, OnDestroy {
  pageSizeOptions: number[] = [5, 10, 20];
  pageSize: number = this.pageSizeOptions[this.pageSizeOptions.length - 1];

  updatePageSizeOptions(dataLength: number) {
    const options = [5, 10, 20, 50, 100, 200, 300, 400, 500];
    this.pageSizeOptions = options.filter((size) => size <= dataLength);

    // Set pageSize to max option available limit to 300
    const maxOption = this.pageSizeOptions[this.pageSizeOptions.length - 1];
    this.pageSize = maxOption > 300 ? 300 : maxOption;

    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.paginator._changePageSize(this.pageSize);
    }
  }
  isAllSelected(): unknown {
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
  get dataColumns() {
    return TableComponent.dataColumns;
  }
  static readonly dataColumns = {
    values: [
      "_hiddenValidation",
      "dateOfTxn",
      "timeOfTxn",
      "dateOfPosting",
      "timeOfPosting",
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
      "reportingEntityTxnRefNo",
    ] as Array<DataColumnsType>,
    getValueByPath(obj: StrTxn, path: string): any {
      const keys = path.split(".");

      return keys.reduce((acc, key) => {
        if (acc === undefined || acc === null) return undefined;

        // If key is a number string (array index), convert to number
        const arrayIndex = Number(key);
        if (!Number.isNaN(arrayIndex) && Array.isArray(acc)) {
          return acc[arrayIndex];
        }

        return acc[key as keyof StrTxn];
      }, obj);
    },
  };
  get displayedColumns() {
    return TableComponent.displayedColumns;
  }
  static displayedColumns = {
    values: [
      "actions" as const,
      "select" as const,
      ...TableComponent.dataColumns.values,
    ],
    /**
     * Generates names for table headers and filter form input field labels
     *
     * @param {string} value
     * @returns {string}
     */
    transform(value: string): string {
      if (TableComponent.dateFilters.isDateFilterKeyStart(value)) {
        const parsedKey = TableComponent.dateFilters.parseFilterKey(value);
        return `${TableComponent.displayedColumns.columnHeaderMap[
          parsedKey
        ]!}  Start`;
      }
      if (TableComponent.dateFilters.isDateFilterKeyEnd(value)) {
        const parsedKey = TableComponent.dateFilters.parseFilterKey(value);
        return `${TableComponent.displayedColumns.columnHeaderMap[
          parsedKey
        ]!}  End`;
      }
      if (
        TableComponent.dateFilters.values.includes(value as DataColumnsType)
      ) {
        return TableComponent.displayedColumns.columnHeaderMap[
          value as DataColumnsType
        ]!;
      }
      if (TableComponent.selectFilters.isSelectFilterKey(value)) {
        const parsedVal = TableComponent.selectFilters.parseFilterKey(value);
        return TableComponent.displayedColumns.columnHeaderMap[
          parsedVal as ColumnHeaderKeys
        ]!;
      }
      if (
        TableComponent.selectFilters.values.includes(value as DataColumnsType)
      ) {
        return TableComponent.displayedColumns.columnHeaderMap[
          value as DataColumnsType
        ]!;
      }
      if (value.startsWith("_hidden")) return "";
      if (TableComponent.isTextFilterKey(value))
        return TableComponent.displayedColumns.columnHeaderMap[
          value as DataColumnsType
        ]!;

      throw new Error("Unknown column header");
    },
    get columnHeaderMap(): Partial<Record<ColumnHeaderKeys, string>> {
      return {
        dateOfTxn: "Date of Txn",
        timeOfTxn: "Time of Txn",
        dateOfPosting: "Date of Post",
        timeOfPosting: "Time of Post",
        methodOfTxn: "Method of Txn",
        reportingEntityLocationNo: "Reporting Entity",
        "startingActions.0.directionOfSA": "Direction",
        "startingActions.0.typeOfFunds": "Type of Funds",
        "startingActions.0.amount": "Debit",
        "startingActions.0.currency": "Debit Currency",
        "startingActions.0.fiuNo": "Debit FIU",
        "startingActions.0.branch": "Debit Branch",
        "startingActions.0.account": "Debit Account",
        "startingActions.0.accountType": "Debit Account Type",
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
        reportingEntityTxnRefNo: "Transaction Reference No",
        _hiddenValidation: "Validation Errors",
      };
    },
  };
  get stickyColumns() {
    return TableComponent.stickyColumns;
  }
  private static stickyColumns: DisplayedColumnType[] = [
    "actions",
    "_mongoid",
    "_hiddenValidation",
  ];
  get selectFilters() {
    return TableComponent.selectFilters;
  }
  static selectFilters: {
    values: DataColumnsType[];
    generateFilterKey: (col: string) => `select${string}`;
    parseFilterKey: (key: string) => DataColumnsType;
    isSelectFilterKey: (key: string) => boolean;
  } = {
    values: [
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
      "completingActions.0.detailsOfDispo",
      "completingActions.0.fiuNo",
      "completingActions.0.accountType",
      "completingActions.0.currency",
      "completingActions.0.branch",
      "completingActions.0.account",
      "completingActions.0.accountCurrency",
    ] as const,
    generateFilterKey: (column) =>
      `select${column.charAt(0).toUpperCase() + column.slice(1)}` as const,
    parseFilterKey: (key) => {
      console.assert(key.startsWith("select"));
      const column = key.slice(6); // Remove 'select'
      return (column.charAt(0).toLowerCase() +
        column.slice(
          1,
        )) as (typeof TableComponent.selectFilters.values)[number];
    },
    isSelectFilterKey: (key: string) => {
      return (
        key.startsWith("select") &&
        TableComponent.selectFilters.values.some(
          (col) => col === TableComponent.selectFilters.parseFilterKey(key),
        )
      );
    },
  };
  get dateFilters() {
    return TableComponent.dateFilters;
  }
  static dateFilters: {
    values: DataColumnsType[];
    generateStartAndEndFilterKeys: (col: string) => string[];
    parseFilterKey: (key: string) => DataColumnsType;
    isDateFilterKey: (key: string) => boolean;
    isDateFilterKeyStart: (key: string) => boolean;
    isDateFilterKeyEnd: (key: string) => boolean;
    valuesIgnore: DataColumnsType[];
    valuesTime: DataColumnsType[];
  } = {
    values: ["dateOfTxn", "dateOfPosting"],
    generateStartAndEndFilterKeys: (column) => [
      `${column}Start`,
      `${column}End`,
    ],
    parseFilterKey: (key) => {
      for (const col of TableComponent.dateFilters.values) {
        if (key === `${col}Start` || key === `${col}End`) {
          return col;
        }
      }
      throw new Error("Not a valid date filter key");
    },
    isDateFilterKey: (key) =>
      TableComponent.dateFilters.values.some(
        (col) => key === `${col}Start` || key === `${col}End`,
      ),
    isDateFilterKeyStart: (key) =>
      TableComponent.dateFilters.values.some((col) => key === `${col}Start`),
    isDateFilterKeyEnd: (key) =>
      TableComponent.dateFilters.values.some((col) => key === `${col}End`),
    valuesIgnore: [
      "timeOfTxn",
      "timeOfPosting",
      "startingActions.0.accountOpen",
      "startingActions.0.accountClose",
      "completingActions.0.accountOpen",
      "completingActions.0.accountClose",
    ],
    valuesTime: ["timeOfTxn", "timeOfPosting"],
  };

  get filterKeys() {
    return TableComponent.filterKeys;
  }
  private static filterKeys = TableComponent.dataColumns.values.flatMap(
    (column) => {
      if (TableComponent.dateFilters.values.includes(column)) {
        return TableComponent.dateFilters.generateStartAndEndFilterKeys(column);
      }
      if (TableComponent.dateFilters.valuesIgnore.includes(column)) return [];
      if (TableComponent.selectFilters.values.includes(column))
        return TableComponent.selectFilters.generateFilterKey(column);

      return column;
    },
  );
  isTextFilterKey(key: string) {
    return TableComponent.isTextFilterKey(key);
  }
  static isTextFilterKey(key: string) {
    if (TableComponent.dateFilters.isDateFilterKey(key)) return false;
    if (TableComponent.selectFilters.isSelectFilterKey(key)) return false;
    return true;
  }
  isStickyColumn(col: string) {
    return TableComponent.stickyColumns.includes(col as DisplayedColumnType);
  }
  get filterForm() {
    return TableComponent.filterForm;
  }
  static filterForm = {
    filterFormKeySanitize: (value: string): string => {
      // Replace all dots with underscores to make keys safe for FormGroup
      return value.replace(/\./g, "--");
    },
    filterFormKeyDesanitize: (value: string): string => {
      // Replace all underscores back to dots for filter predicate
      return value.replace(/--/g, ".");
    },
    _formGroup: null as FormGroup | null,
    get formGroup() {
      if (this._formGroup) return this._formGroup;
      this._formGroup = new FormGroup(
        TableComponent.filterKeys.reduce(
          (acc, item) => ({
            ...acc,
            [TableComponent.filterForm.filterFormKeySanitize(item)]:
              new FormControl(""),
          }),
          {} as {
            [key in FilterKeysType]: FormControl;
          },
        ),
        { updateOn: "submit" },
      );
      return this._formGroup;
    },
    get activeFilters() {
      return Object.keys(this._formGroup!.value).flatMap((sanitizedKey) => {
        const desanitizedKey = this.filterFormKeyDesanitize(sanitizedKey);
        const key = TableComponent.displayedColumns.transform(desanitizedKey);
        const value = this._formGroup?.get(sanitizedKey)!.value;
        if (!value) return [];
        if (TableComponent.dateFilters.isDateFilterKey(desanitizedKey)) {
          return {
            key,
            value: format(value, "MM/dd/yyyy"),
            sanitizedKey,
          };
        }
        return { key, value, sanitizedKey };
      });
    },
    removeFilter(sanitizedKey: string) {
      this._formGroup?.get(sanitizedKey)!.reset();
    },
    trackBy(_: number, item: any) {
      item.sanitizedKey;
    },
  };
  dataSource = new MatTableDataSource<WithVersion<StrTxn>>();

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;

  recentOpenRows: string[] = [];

  selection = new SelectionModel<WithVersion<StrTxn>>(true, []);

  constructor(
    private changeLogService: ChangeLogService<StrTxn>,
    private crossTabEditService: CrossTabEditService,
    private authService: AuthService,
    private sessionDataService: SessionDataService,
    private recordService: RecordService,
    private route: ActivatedRoute,
  ) {}

  private destroy$ = new Subject<void>();

  @HostListener("window:beforeunload", ["$event"])
  ngOnDestroy = (($event: Event) => {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.editFormTab) this.editFormTab.close();
    if (this.bulkEditFormTab) this.bulkEditFormTab.close();

    removePageFromOpenTabs(this.route.snapshot);
  }) as () => void;

  ngOnInit() {
    this.dataSource.filterPredicate = this.createFilterPredicate();

    this.filterForm.formGroup.valueChanges.subscribe((val) => {
      if (this.filterForm.formGroup.invalid) return;
      this.dataSource.filter = JSON.stringify(val);
      this.selection.clear();
    });

    this.setupTableDataSource();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator!;
    this.dataSource.sort = this.sort!;
  }

  lastUpdated?: string;
  snackBar = inject(MatSnackBar);
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
            this.recordService.getStrTxns(),
            this.sessionDataService.sessionState$,
          ]),
        ),
        scan((acc, [strTxns, sessionState]) => {
          const {
            data: { strTxnChangeLogs },
            editTabResVersioned,
            lastUpdated,
            conflictError,
          } = sessionState;

          if (conflictError) {
            this.editFormTab?.close();
            this.bulkEditFormTab?.close();

            this.snackBar.open(conflictError, "Dismiss", {
              duration: 10000,
            });
          }
          this.lastUpdated = lastUpdated;

          // apply edit tab res change logs and return
          if (editTabResVersioned != null) {
            console.assert(acc.length > 0);
            return acc
              .map((strTxn) => {
                const { changeLogs } =
                  editTabResVersioned.find(
                    (res) => res.strTxnId === strTxn._mongoid,
                  ) || {};

                if (!changeLogs) return strTxn;

                return this.changeLogService.applyChanges(strTxn, changeLogs);
              })
              .map(TableComponent.addValidationInfo);
          }

          return strTxns
            .map((strTxn) => {
              const { changeLogs } =
                strTxnChangeLogs?.find(
                  (editedUser) => editedUser.strTxnId === strTxn._mongoid,
                ) || {};
              return this.changeLogService.applyChanges(
                strTxn,
                changeLogs || [],
              );
            })
            .map(TableComponent.addValidationInfo);
        }, [] as WithVersion<StrTxn>[]),
        takeUntil(this.destroy$),
      )
      .subscribe((strTxns) => {
        this.dataSource.data = strTxns;
        this.updatePageSizeOptions(strTxns.length);
      });
  }

  // todo match empty values
  private createFilterPredicate(): (record: StrTxn, filter: string) => boolean {
    return (record, filter) => {
      const searchTerms: { [key: string]: string } = JSON.parse(filter);
      return Object.keys(searchTerms).every((searchTermKey) => {
        const desanitizedKey =
          this.filterForm.filterFormKeyDesanitize(searchTermKey);
        console.log(
          "🚀 ~ TableComponent ~ returnObject.keys ~ desanitizedKey:",
          desanitizedKey,
        );

        if (this.dateFilters.isDateFilterKey(desanitizedKey)) {
          const keyPath = this.dateFilters.parseFilterKey(desanitizedKey);
          const recordVal = startOfDay(
            this.dataColumns.getValueByPath(record, keyPath),
          );
          const startDate = searchTerms[`${keyPath}Start`]
            ? startOfDay(searchTerms[`${keyPath}Start`])
            : "";
          const endDate = searchTerms[`${keyPath}End`]
            ? startOfDay(searchTerms[`${keyPath}End`])
            : "";
          if (startDate && !isAfter(recordVal, startDate)) return false;
          if (endDate && !isBefore(recordVal, endDate)) return false;
          return true;
        }

        if (this.selectFilters.isSelectFilterKey(desanitizedKey)) {
          if (!searchTerms[searchTermKey]) return true;
          const keyPath = this.selectFilters.parseFilterKey(desanitizedKey);
          const recordVal = this.dataColumns.getValueByPath(record, keyPath);
          if (keyPath === "_hiddenValidation")
            return recordVal.includes(searchTerms[searchTermKey]);
          return searchTerms[searchTermKey] === recordVal;
        }

        if (this.isTextFilterKey(desanitizedKey)) {
          if (!searchTerms[searchTermKey]) return true;
          const recordVal = this.dataColumns.getValueByPath(
            record,
            desanitizedKey,
          );
          return searchTerms[searchTermKey].trim() === String(recordVal).trim();
        }

        throw new Error("Unknown filter search term");
      });
    };
  }

  getUniqueColumnValuesForSelectFilter(key: string) {
    const uniques = new Set([""]);
    return this.dataSource.data.reduce((acc, txn) => {
      const value = this.dataColumns.getValueByPath(
        txn,
        this.selectFilters.parseFilterKey(key),
      );
      if (Array.isArray(value)) {
        value.forEach((v) => acc.add(v ?? ""));
      } else {
        acc.add((value as string) ?? "");
      }
      return acc;
    }, uniques);
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

  isSingleOrBulkEditTabOpen = false;
  monitorEditTabOpenStatus({ tabWindow }: { tabWindow: WindowProxy }) {
    this.isSingleOrBulkEditTabOpen = true;
    interval(500)
      .pipe(
        takeWhile(() => !!tabWindow && !tabWindow.closed),
        takeUntil(this.destroy$),
      )
      .subscribe({
        complete: () => {
          this.isSingleOrBulkEditTabOpen = false;
        },
      });
  }
  static missingConductors(sa: StartingAction) {
    if (!sa.wasCondInfoObtained) return false;

    if (sa.conductors.length === 0) return true;
    if (sa.conductors.some((cond) => !cond.linkToSub)) return true;

    return false;
  }

  private static missingCibcInfo(action: StartingAction | CompletingAction) {
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

  static addValidationInfo(patchedStrTxn: WithVersion<StrTxn>) {
    const errors: _hiddenValidationType[] = [];
    if (patchedStrTxn._version && patchedStrTxn._version > 0)
      errors.push("Edited Txn");
    if (patchedStrTxn.startingActions.some(TableComponent.missingConductors))
      errors.push("Conductor Missing");
    if (
      patchedStrTxn.startingActions.some(TableComponent.missingCibcInfo) ||
      patchedStrTxn.completingActions.some(TableComponent.missingCibcInfo)
    )
      errors.push("Bank Info Missing");

    patchedStrTxn._hiddenValidation = errors;
    return patchedStrTxn;
  }

  get getColorForValidation() {
    return TableComponent.getColorForValidation;
  }
  static getColorForValidation(error: _hiddenValidationType): string {
    const colors: Record<_hiddenValidationType, string> = {
      "Conductor Missing": "#dc3545",
      "Bank Info Missing": "#ba005c",
      "Edited Txn": "#0d6efd",
    };
    if (!error) return "#007bff"; // fallback color
    return colors[error];
  }
}

type _hiddenValidationType =
  | "Edited Txn"
  | "Conductor Missing"
  | "Bank Info Missing";

export interface StrTxn {
  _hiddenValidation?: _hiddenValidationType[];
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
}

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

type FilterKeysType = keyof WithDateRange<StrTxn>;

export type DataColumnsType =
  | keyof StrTxn
  | keyof AddPrefixToObject<StartingAction, "startingActions.0.">
  | keyof AddPrefixToObject<CompletingAction, "completingActions.0.">;

type DisplayedColumnType = DataColumnsType | "actions" | "select";

type AddPrefixToObject<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${K}` : never]: T[K];
};

export interface SessionDataReqBody {
  userId: string;
  data: SessionStateLocal;
}

type ColumnHeaderKeys =
  | (typeof TableComponent.dataColumns.values)[number]
  | ReturnType<typeof TableComponent.selectFilters.generateFilterKey>
  | `${string}Start`
  | `${string}End`;
