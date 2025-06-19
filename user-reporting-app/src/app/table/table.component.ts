import { CommonModule, DatePipe } from "@angular/common";
import {
  type AfterViewInit,
  Component,
  HostListener,
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
import { CamelCaseToSpacesPipe } from "../pipes/camelcase-to-spaces.pipe";
import { ChangeLogService, WithVersion } from "../change-log.service";
import { CrossTabEditService } from "../cross-tab-edit.service";
import {
  combineLatest,
  interval,
  scan,
  Subject,
  switchMap,
  takeUntil,
  takeWhile,
} from "rxjs";
import { type SessionState, SessionDataService } from "../session-data.service";
import { FingerprintingService } from "../fingerprinting.service";
import { RecordService } from "../record.service";
import { SelectionModel } from "@angular/cdk/collections";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { ActivatedRoute } from "@angular/router";
import { removePageFromOpenTabs } from "../single-tab.guard";

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
    CamelCaseToSpacesPipe,
    MatCheckboxModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatInputModule,
  ],
  template: `
    <div class="table-system">
      <mat-toolbar>
        <mat-toolbar-row>
          <h2>Reporting UI</h2>
          <span class="toolbarrow-spacer"></span>
          <button
            (click)="openBulkEditFormTab()"
            *ngIf="!this.selection.isEmpty()"
            mat-flat-button
            [disabled]="this.isSingleOrBulkEditTabOpen"
          >
            <mat-icon>edit</mat-icon>
            Bulk Edit
          </button>
          <button mat-raised-button (click)="drawer.toggle()">
            <mat-icon>filter_list</mat-icon>
            Filter
          </button>
        </mat-toolbar-row>
      </mat-toolbar>
      <mat-drawer-container class="table-filter-container" hasBackdrop="false">
        <mat-drawer position="end" #drawer>
          <mat-toolbar>
            <mat-toolbar-row>
              <span class="toolbarrow-spacer"></span>
              <button mat-icon-button (click)="drawer.toggle()">
                <mat-icon>close</mat-icon>
              </button>
            </mat-toolbar-row>
          </mat-toolbar>
          <form [formGroup]="filterForm" class="filter-header">
            <ng-container *ngFor="let key of filterKeys">
              <!-- Text Filter -->
              <mat-form-field *ngIf="isTextFilterKey(key)">
                <mat-label>Filter {{ key | appCamelCaseToSpaces }}</mat-label>
                <input
                  matInput
                  [formControlName]="key"
                  [placeholder]="'Filter ' + key"
                />
                <button
                  matSuffix
                  mat-icon-button
                  *ngIf="filterForm.get(key)?.value"
                  (click)="clearFilter(key)"
                >
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <!-- Date Filter  -->
              <div *ngIf="this.dateFilters.isDateFilterKey(key)">
                <mat-form-field>
                  <mat-label>{{ key | appCamelCaseToSpaces }}</mat-label>
                  <input
                    matInput
                    [formControlName]="key"
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
                  <mat-label>{{ key | appCamelCaseToSpaces }}</mat-label>
                  <select matNativeControl [formControlName]="key">
                    <option value=""></option>
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
                *ngFor="let column of dataColumns"
                [matColumnDef]="column"
              >
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  [mat-sort-header]="column"
                >
                  <div [class.sticky-cell]="isStickyColumn(column)">
                    {{ column | appCamelCaseToSpaces }}
                  </div>
                </th>
                <td mat-cell *matCellDef="let row">
                  <div [class.sticky-cell]="isStickyColumn(column)">
                    <ng-container
                      *ngIf="this.dateFilters.values.includes(column)"
                    >
                      {{ row[column] | date : "MM/dd/yyyy" }}
                    </ng-container>
                    <ng-container
                      *ngIf="!this.dateFilters.values.includes(column)"
                    >
                      {{ row[column] }}
                    </ng-container>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                [class.recentOpenHighlight]="
                  this.recentOpenRows.includes(row._id)
                "
              ></tr>
            </table>
          </div>
        </mat-drawer-content>
      </mat-drawer-container>
      <mat-paginator
        [pageSizeOptions]="[5, 10, 20]"
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
  dataColumns: Array<keyof User> = [
    "id",
    "firstName",
    "lastName",
    "maidenName",
    "age",
    "gender",
    "email",
    "phone",
    "username",
    "password",
    "birthDate",
    "bloodGroup",
    "height",
    "weight",
    "eyeColor",
    "ip",
    "macAddress",
    "university",
    "ein",
    "ssn",
    "userAgent",
    "role",
  ];
  displayedColumns: DisplayedColumnType[] = [
    "actions" as const,
    "select" as const,
    ...this.dataColumns,
  ];
  stickyColumns: DisplayedColumnType[] = ["actions", "id"];
  selectFilters: {
    values: DisplayedColumnType[];
    generateFilterKey: (col: string) => string;
    parseFilterKey: (key: string) => string;
    isSelectFilterKey: (key: string) => boolean;
  } = {
    values: ["gender", "bloodGroup", "eyeColor", "university", "role"],
    generateFilterKey: (column) =>
      `select${column.charAt(0).toUpperCase() + column.slice(1)}`,
    parseFilterKey: (key) => {
      console.assert(key.startsWith("select"));
      const column = key.slice(6); // Remove 'select'
      return column.charAt(0).toLowerCase() + column.slice(1);
    },
    isSelectFilterKey: (key: string) => {
      return (
        key.startsWith("select") &&
        this.selectFilters.values.some(
          (col) => col === this.selectFilters.parseFilterKey(key),
        )
      );
    },
  };
  dateFilters: {
    values: DisplayedColumnType[];
    generateStartAndEndFilterKeys: (col: string) => string[];
    parseFilterKey: (key: string) => string;
    isDateFilterKey: (key: string) => boolean;
  } = {
    values: ["birthDate"],
    generateStartAndEndFilterKeys: (column) => [
      `${column}Start`,
      `${column}End`,
    ],
    parseFilterKey: (key) => {
      for (const col of this.dateFilters.values) {
        if (key === `${col}Start` || key === `${col}End`) {
          return col;
        }
      }
      throw new Error("Not a valid date filter key");
    },
    isDateFilterKey: (key) =>
      this.dateFilters.values.some(
        (col) => key === `${col}Start` || key === `${col}End`,
      ),
  };

  filterKeys = this.dataColumns.flatMap((column) => {
    if (this.dateFilters.values.includes(column)) {
      return this.dateFilters.generateStartAndEndFilterKeys(column);
    }
    if (this.selectFilters.values.includes(column))
      return [column, this.selectFilters.generateFilterKey(column)];

    return column;
  });
  isTextFilterKey(key: string) {
    if (this.dateFilters.isDateFilterKey(key)) return false;
    if (this.selectFilters.isSelectFilterKey(key)) return false;
    if (this.selectFilters.values.includes(key as DisplayedColumnType))
      return false;
    return true;
  }
  isStickyColumn(col: string) {
    return this.stickyColumns.includes(col as DisplayedColumnType);
  }
  filterForm = new FormGroup(
    this.filterKeys.reduce(
      (acc, item) => ({ ...acc, [item]: new FormControl("") }),
      {} as {
        [key in FilterKeysType]: FormControl;
      },
    ),
  );

  dataSource = new MatTableDataSource<WithVersion<User>>();

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;

  recentOpenRows: string[] = [];

  selection = new SelectionModel<WithVersion<User>>(true, []);

  constructor(
    private changeLogService: ChangeLogService<User>,
    private crossTabEditService: CrossTabEditService,
    private fingerprintingService: FingerprintingService,
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

    this.filterForm.valueChanges.subscribe((val) => {
      if (this.filterForm.invalid) return;
      this.dataSource.filter = JSON.stringify(val);
      this.selection.clear();
    });

    this.setupTableDataSource();
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator!;
    this.dataSource.sort = this.sort!;
  }

  setupTableDataSource() {
    this.fingerprintingService.browserFingerPrint$
      .pipe(
        switchMap((fprint) => this.sessionDataService.intialize(fprint)),
        switchMap(() =>
          combineLatest([
            this.recordService.getUsers(),
            this.sessionDataService.sessionState$,
          ]),
        ),
        scan((acc, [users, sessionState]) => {
          const { data: sessionStateData, recentEdit } = sessionState;

          if (recentEdit != null) {
            console.assert(acc.length > 0);
            return acc.map((user) => {
              if (recentEdit.userId !== user._id) return user;
              return this.changeLogService.applyChanges(
                user,
                recentEdit.changeLogs,
              );
            });
          }

          const usersResult = users.map((user) => {
            const userChanges = sessionStateData.editedUsers.find(
              (editedUser) => editedUser.userId === user._id,
            );
            return this.changeLogService.applyChanges(
              user,
              userChanges?.changeLogs || [],
            );
          });
          return usersResult;
        }, [] as WithVersion<User>[]),
        takeUntil(this.destroy$),
      )
      .subscribe((users) => {
        this.dataSource.data = users;
      });
  }

  private createFilterPredicate(): (record: User, filter: string) => boolean {
    return (record, filter) => {
      const searchTerms: { [key: string]: string } = JSON.parse(filter);
      return Object.keys(record).every((key) => {
        const prop = key as keyof User;
        if (
          !searchTerms[prop] &&
          !this.dateFilters.values.includes(prop) &&
          !this.selectFilters.values.includes(prop)
        )
          return true;

        if (this.dateFilters.values.includes(prop)) {
          if (!searchTerms[`${prop}Start`] && !searchTerms[`${prop}End`])
            return true;
          return this.isDateBetween(
            record[prop] as string,
            searchTerms[`${prop}Start`].split("T")[0],
            searchTerms[`${prop}End`].split("T")[0],
          );
        }
        if (this.selectFilters.values.includes(prop)) {
          const filterTerm =
            searchTerms[this.selectFilters.generateFilterKey(prop)];
          if (!filterTerm) return true;
          return (record[prop] as string) === filterTerm;
        }
        if (
          !this.dateFilters.values.includes(prop) &&
          !this.selectFilters.values.includes(prop)
        )
          return (record[prop] as string).includes(searchTerms[prop].trim());

        console.assert(
          false,
          "🚀 ~ TableComponent ~ createFilter ~ data: assert all data keys handled",
        );
        return true;
      });
    };
  }

  getUniqueColumnValuesForSelectFilter(key: string) {
    const values = this.dataSource.filteredData.map(
      (user) => user[this.selectFilters.parseFilterKey(key) as keyof User],
    ) as string[];
    return new Set(values);
  }

  private isDateBetween(
    checkDateStr: string,
    startDateStr: string,
    endDateStr: string,
  ) {
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day); // month is zero-based
    };
    if (
      ![checkDateStr, startDateStr, endDateStr].every((str) =>
        str ? this.isExpectedDateFormat(str) : true,
      )
    )
      throw new Error("Invalid date format");
    if (startDateStr && !endDateStr) {
      const checkDate = parseLocalDate(checkDateStr);
      const startDate = parseLocalDate(startDateStr);
      return checkDate >= startDate;
    }
    if (!startDateStr && endDateStr) {
      const checkDate = parseLocalDate(checkDateStr);
      const endDate = parseLocalDate(endDateStr);
      return checkDate <= endDate;
    }
    if (startDateStr && endDateStr) {
      const checkDate = parseLocalDate(checkDateStr);
      const startDate = parseLocalDate(startDateStr);
      const endDate = parseLocalDate(endDateStr);

      return checkDate >= startDate && checkDate <= endDate;
    }
    console.assert(
      false,
      "🚀 ~ TableComponent ~ isDateBetween: assert all cases handled",
    );
    return false;
  }

  clearFilter(key: string): void {
    this.filterForm.get(key)?.reset();
  }

  private isExpectedDateFormat(str: string) {
    const dateRegex = /^\d{4}-(\d{1,2})-(\d{1,2})$/;
    return dateRegex.test(str);
  }

  editFormTab: WindowProxy | null = null;
  openEditFormTab(record: WithVersion<User>) {
    this.recentOpenRows = [record._id];
    this.editFormTab = this.crossTabEditService.openEditFormTab({
      editType: "EDIT_REQUEST",
      user: record,
    });
    this.monitorEditTabOpenStatus({ tabWindow: this.editFormTab! });
  }

  bulkEditFormTab: WindowProxy | null = null;
  openBulkEditFormTab() {
    this.recentOpenRows = this.selection.selected.map((user) => user._id);
    this.bulkEditFormTab = this.crossTabEditService.openEditFormTab({
      editType: "BULK_EDIT_REQUEST",
      users: this.selection.selected,
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
}

export interface User {
  _id: string;
  id: number;
  firstName: string;
  lastName: string;
  maidenName: string;
  age: number;
  gender: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  birthDate: string;
  image: string;
  bloodGroup: string;
  height: number;
  weight: number;
  eyeColor: string;
  hair: Hair;
  ip: string;
  address: Address[];
  macAddress: string;
  university: string;
  bank: Bank[];
  company: Company[];
  ein: string;
  ssn: string;
  userAgent: string;
  crypto: Crypto[];
  role: string;
  workExperience: WorkExperience[];
}

export interface Crypto {
  _id: string;
  coin: string;
  wallet: string;
  network: string;
}

export interface Company {
  _id: string;
  department: string;
  name: string;
  title: string;
  address: CompanyAddress;
}

export interface Bank {
  _id: string;
  cardExpire: string;
  cardNumber: string;
  cardType: string;
  currency: string;
  iban: string;
}

export interface Address {
  _id: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  coordinates: Coordinates;
  country: string;
}

export interface CompanyAddress {
  address: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  coordinates: Coordinates;
  country: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Hair {
  color: string;
  type: string;
}

export interface WorkExperience {
  _id: string;
  jobTitle: string;
  employer: string;
  projects: Project[];
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  technologies: Technology[];
  teamMembers: TeamMember[];
}

export interface TeamMember {
  _id: string;
  name: string;
  role: string;
}

export interface Technology {
  _id: string;
  technology: string;
}

type DateKeys<T> = {
  [K in keyof T]: K extends `${string}Date${string}` ? K : never;
}[keyof T];

type WithDateRange<T> = T & {
  [K in DateKeys<T> as `${K & string}Start`]: string;
} & {
  [K in DateKeys<T> as `${K & string}End`]: string;
};

type FilterKeysType = keyof WithDateRange<User>;

type DisplayedColumnType = keyof User | "actions" | "select";

export interface SessionDataReqBody {
  userId: string;
  data: SessionState;
}
