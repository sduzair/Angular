import { CommonModule, DatePipe } from "@angular/common";
import {
  type AfterViewInit,
  Component,
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
import { MatIcon } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { CamelCaseToSpacesPipe } from "../pipes/camelcase-to-spaces.pipe";
import { ChangeLogService, UserWithVersion } from "../change-log.service";
import { CrossTabEditService } from "../cross-tab-edit.service";
import { combineLatest, scan, Subject, switchMap, takeUntil } from "rxjs";
import { type SessionState, SessionDataService } from "../session-data.service";
import { FingerprintingService } from "../fingerprinting.service";
import { RecordService } from "../record.service";

@Component({
  selector: "app-table",
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    DatePipe,
    MatFormFieldModule,
    MatIcon,
    ReactiveFormsModule,
    MatInputModule,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    CamelCaseToSpacesPipe,
  ],
  template: `<div class="table-system">
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
        <div *ngIf="isDateFilterKey(key)">
          <mat-form-field>
            <mat-label>{{ key | appCamelCaseToSpaces }}</mat-label>
            <input matInput [formControlName]="key" [matDatepicker]="picker" />
            <mat-datepicker-toggle
              matSuffix
              [for]="picker"
            ></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>
      </ng-container>
    </form>
    <div class="mat-elevation-z8 table-container">
      <table mat-table [dataSource]="dataSource" matSort>
        <!-- Action Column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>
            <div [class.sticky-cell]="true">Actions</div>
          </th>
          <td mat-cell *matCellDef="let row">
            <div [class.sticky-cell]="true">
              <button mat-icon-button (click)="openEditFormTab(row)">
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>
        <!-- Column Definitions  -->
        <ng-container
          *ngFor="let column of dataColumns"
          [matColumnDef]="column"
        >
          <th mat-header-cell *matHeaderCellDef [mat-sort-header]="column">
            <div [class.sticky-cell]="isStickyColumn(column)">
              {{ column | appCamelCaseToSpaces }}
            </div>
          </th>
          <td mat-cell *matCellDef="let row">
            <div [class.sticky-cell]="isStickyColumn(column)">
              <ng-container *ngIf="isDateColumn(column)">
                {{ row[column] | date : "MM/dd/yyyy" }}
              </ng-container>
              <ng-container *ngIf="!isDateColumn(column)">
                {{ row[column] }}
              </ng-container>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: displayedColumns"
          [class.recentOpenHighlight]="recentOpenRowId === row._id"
        ></tr>
      </table>
    </div>
    <mat-paginator
      [pageSizeOptions]="[5, 10, 20]"
      showFirstLastButtons
      aria-label="Select page of periodic elements"
    >
    </mat-paginator>
  </div>`,
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
    ...this.dataColumns,
  ];
  stickyColumns: DisplayedColumnType[] = ["actions", "id"];
  filterKeys = this.dataColumns.flatMap((column) => {
    if (column.toLowerCase().includes("date")) {
      return [`${column}Start`, `${column}End`];
    }
    return column;
  });
  isDateFilterKey(key: string) {
    if (
      !key.toLowerCase().includes("date") ||
      (!key.toLowerCase().includes("start") &&
        !key.toLowerCase().includes("end"))
    ) {
      return false;
    }
    return true;
  }
  isTextFilterKey(key: string): any {
    if (key.toLowerCase().includes("date")) return false;
    return true;
  }
  isStickyColumn(col: string) {
    return this.stickyColumns.includes(col as DisplayedColumnType);
  }
  isDateColumn(col: string) {
    return ["birthDate"].includes(col);
  }
  filterForm = new FormGroup(
    this.filterKeys.reduce(
      (acc, item) => ({ ...acc, [item]: new FormControl("") }),
      {} as {
        [key in FilterKeysType]: FormControl;
      },
    ),
  );

  dataSource = new MatTableDataSource<User>();

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;

  recentOpenRowId = "";

  constructor(
    private changeLogService: ChangeLogService,
    private crossTabEditService: CrossTabEditService,
    private fingerprintingService: FingerprintingService,
    private sessionDataService: SessionDataService,
    private recordService: RecordService,
  ) {}

  private destroy$ = new Subject<void>();
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngOnInit() {
    this.dataSource.filterPredicate = this.createFilterPredicate();

    this.filterForm.valueChanges.subscribe((val) => {
      if (this.filterForm.invalid) return;
      this.dataSource.filter = JSON.stringify(val);
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
        }, [] as UserWithVersion[]),
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
        if (!searchTerms[prop] && !this.isDateColumn(prop)) return true;
        if (this.isDateColumn(prop)) {
          if (!searchTerms[`${prop}Start`] && !searchTerms[`${prop}End`])
            return true;
          return this.isDateBetween(
            record[prop] as string,
            searchTerms[`${prop}Start`].split("T")[0],
            searchTerms[`${prop}End`].split("T")[0],
          );
        }
        if (!this.isDateColumn(prop))
          return (record[prop] as string).includes(searchTerms[prop].trim());
        console.assert(
          false,
          "🚀 ~ TableComponent ~ createFilter ~ data: assert all data keys handled",
        );
        return true;
      });
    };
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
  openEditFormTab(record: UserWithVersion) {
    this.recentOpenRowId = record._id;
    this.editFormTab = this.crossTabEditService.openEditFormTab(record);
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

type DisplayedColumnType = keyof User | "actions";

export interface SessionDataReqBody {
  userId: string;
  data: SessionState;
}
