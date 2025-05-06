import { CommonModule, DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import {
  type AfterViewInit,
  Component,
  type OnInit,
  ViewChild,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIcon } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { CamelCaseToSpacesPipe } from "../pipes/camelcase-to-spaces.pipe";

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
              <button mat-icon-button (click)="openEditTab(row)">
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
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
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
})
export class TableComponent implements OnInit, AfterViewInit {
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
  filterKeys = this.dataColumns.reduce((acc, item) => {
    if (item.toLowerCase().includes("date")) {
      return [...acc, `${item}Start`, `${item}End`] as FilterKeysType[];
    }
    return [...acc, item];
  }, [] as FilterKeysType[]);
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

  constructor(private httpClient: HttpClient) {}
  ngOnInit(): void {
    this.httpClient
      .get<{ users: User[] }>("https://dummyjson.com/users?limit=0")
      .subscribe((data) => {
        this.dataSource.data = data.users;
      });

    this.dataSource.filterPredicate = this.createFilter();

    this.filterForm.valueChanges.subscribe((val) => {
      if (this.filterForm.invalid) return;
      this.dataSource.filter = JSON.stringify(val);
    });
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator!;
    this.dataSource.sort = this.sort!;
  }
  private createFilter(): (data: User, filter: string) => boolean {
    return (data, filter) => {
      const searchTerms: { [key: string]: string } = JSON.parse(filter);
      return Object.keys(data).every((key) => {
        const dataKey = key as keyof User;
        if (!searchTerms[dataKey] && !this.isDateColumn(dataKey)) return true;
        if (this.isDateColumn(dataKey)) {
          if (!searchTerms[`${dataKey}Start`] && !searchTerms[`${dataKey}End`])
            return true;
          return this.isDateBetween(
            data[dataKey] as string,
            searchTerms[`${dataKey}Start`].split("T")[0],
            searchTerms[`${dataKey}End`].split("T")[0],
          );
        }
        if (!this.isDateColumn(dataKey))
          return (data[dataKey] as string).includes(
            searchTerms[dataKey].trim(),
          );
        console.assert(
          false,
          "🚀 ~ TableComponent ~ createFilter ~ data: assert all data keys handled",
        );
        return true;
      });
    };
  }
  clearFilter(key: string): void {
    this.filterForm.get(key)?.reset();
  }
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

  isDateColumn(col: string) {
    return ["birthDate"].includes(col);
  }
  isStickyColumn(col: string) {
    return this.stickyColumns.includes(col as DisplayedColumnType);
  }

  private parseLocalDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day); // month is zero-based
  }
  dateRegex = /^\d{4}-(\d{1,2})-(\d{1,2})$/;

  private isExpectedDateFormat(str: string) {
    return this.dateRegex.test(str);
  }

  private isDateBetween(
    checkDateStr: string,
    startDateStr: string,
    endDateStr: string,
  ) {
    if (
      ![checkDateStr, startDateStr, endDateStr].every((str) =>
        str ? this.isExpectedDateFormat(str) : true,
      )
    )
      throw new Error("Invalid date format");
    if (startDateStr && !endDateStr) {
      const checkDate = this.parseLocalDate(checkDateStr);
      const startDate = this.parseLocalDate(startDateStr);
      return checkDate >= startDate;
    }
    if (!startDateStr && endDateStr) {
      const checkDate = this.parseLocalDate(checkDateStr);
      const endDate = this.parseLocalDate(endDateStr);
      return checkDate <= endDate;
    }
    if (startDateStr && endDateStr) {
      const checkDate = this.parseLocalDate(checkDateStr);
      const startDate = this.parseLocalDate(startDateStr);
      const endDate = this.parseLocalDate(endDateStr);

      return checkDate >= startDate && checkDate <= endDate;
    }
    console.assert(
      false,
      "🚀 ~ TableComponent ~ isDateBetween: assert all cases handled",
    );
    return false;
  }
  openEditTab(record: User) {
    const editUrl = `record/${record.id}`;
    window.open(editUrl, "editTab");
  }
}

interface User {
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
  address: Address;
  macAddress: string;
  university: string;
  bank: Bank;
  company: Company;
  ein: string;
  ssn: string;
  userAgent: string;
  crypto: Crypto;
  role: string;
}

interface Crypto {
  coin: string;
  wallet: string;
  network: string;
}

interface Company {
  department: string;
  name: string;
  title: string;
  address: Address;
}

interface Bank {
  cardExpire: string;
  cardNumber: string;
  cardType: string;
  currency: string;
  iban: string;
}

interface Address {
  address: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  coordinates: Coordinates;
  country: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface Hair {
  color: string;
  type: string;
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
