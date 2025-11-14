import { SelectionModel } from "@angular/cdk/collections";
import { CommonModule, DatePipe } from "@angular/common";
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  Input,
  OnInit,
  QueryList,
  TrackByFunction,
} from "@angular/core";
import { FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatAutocomplete } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatChipsModule } from "@angular/material/chips";
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from "@angular/material/datepicker";
import { MatDivider } from "@angular/material/divider";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatSortModule } from "@angular/material/sort";
import {
  MatColumnDef,
  MatTableDataSource,
  MatTableModule,
} from "@angular/material/table";
import { MatToolbarModule } from "@angular/material/toolbar";
import { of } from "rxjs";
import { TxnTimePipe } from "../reporting-ui/reporting-ui-table/pad-zero.pipe";
import { ScrollPositionPreserveDirective } from "../route-cache/scroll-position-preserve.directive";
import { ClickOutsideTableDirective } from "./click-outside-table.directive";
import { ReviewPeriodDateDirective } from "../transaction-search/review-period-date.directive";
import { PersistentAutocompleteTrigger } from "../transaction-view/persistent-autocomplete-trigger.directive";
import {
  AbstractBaseTable,
  IFilterForm,
  ISelectionMasterToggle,
} from "./abstract-base-table";

@Component({
  selector: "app-base-table",
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
    ReviewPeriodDateDirective,
    MatCheckboxModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatInputModule,
    TxnTimePipe,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDivider,
    MatChipsModule,
    MatAutocomplete,
    PersistentAutocompleteTrigger,
    MatButtonToggleModule,
    ClickOutsideTableDirective,
    ScrollPositionPreserveDirective,
  ],
  template: `
    <mat-toolbar class="col">
      <mat-toolbar-row class="px-0 header-toolbar-row">
        <!-- Active Filter Chips -->
        <mat-chip-set aria-label="Active filters" class="filter-chips">
          <mat-chip
            *ngFor="
              let filter of filterFormActiveFilters$ | async;
              trackBy: filterFormTrackBy
            "
            removable="true"
            highlighted="true"
            disableRipple="true"
            (removed)="filterFormRemoveFilter(filter.sanitizedKey)"
          >
            {{ filter.header }}:
            <ng-container
              *ngIf="
                filterFormHighlightSelectFilterKey === filter.sanitizedKey;
                else showValue
              "
            >
              <span
                class="color-box-in-chip"
                [ngStyle]="{ 'background-color': filter.value }"
              ></span>
            </ng-container>
            <ng-template #showValue>
              {{ filter.value }}
            </ng-template>
            <button matChipRemove>
              <mat-icon>cancel</mat-icon>
            </button>
          </mat-chip>
        </mat-chip-set>
        <mat-chip-set class="color-pallette">
          <mat-chip
            *ngFor="
              let option of Object.entries(filterFormHighlightMap);
              trackBy: filterFormHighlightMapTrackBy
            "
            [style.backgroundColor]="option[0]"
            (click)="filterFormHighlightSelectedColor = option[0]"
            [highlighted]="filterFormHighlightSelectedColor === option[0]"
          >
            <span class="invisible-text">1</span>
          </mat-chip>
          <mat-chip
            (click)="filterFormHighlightSelectedColor = null"
            [highlighted]="filterFormHighlightSelectedColor === null"
          >
            <mat-icon>cancel</mat-icon>
          </mat-chip>
        </mat-chip-set>

        <button mat-raised-button (click)="drawer.toggle()">
          <mat-icon>filter_list</mat-icon>
          Filter
        </button>
      </mat-toolbar-row>
    </mat-toolbar>
    <mat-drawer-container
      class="overflow-visible"
      hasBackdrop="false"
      appScrollPositionPreserve
    >
      <mat-drawer class="form-drawer" position="end" #drawer>
        <form
          [formGroup]="filterFormFormGroup"
          class="h-100 d-flex flex-column container px-0"
        >
          <mat-toolbar class="flex-shrink-0 row row-cols-1 filter-form-toolbar">
            <mat-toolbar-row class="col">
              <button
                mat-stroked-button
                color="primary"
                type="submit"
                (click)="filterFormApplyFilters()"
              >
                Apply
              </button>
              <button
                mat-stroked-button
                type="button"
                (click)="filterFormResetFilters()"
                [disabled]="filterFormIsResetBtnDisabled$ | async"
              >
                Reset
              </button>
              <mat-button-toggle-group
                [formControl]="filterFormConjunctionControl"
              >
                <mat-button-toggle value="AND">AND</mat-button-toggle>
                <mat-button-toggle value="OR">OR</mat-button-toggle>
              </mat-button-toggle-group>
              <div class="flex-fill"></div>
              <button mat-icon-button (click)="drawer.toggle()">
                <mat-icon>close</mat-icon>
              </button>
            </mat-toolbar-row>
          </mat-toolbar>
          <mat-divider></mat-divider>
          <div
            class="flex-grow-1 overflow-auto row row-cols-1 mx-0 pt-3 scroll-position-preserve"
          >
            <ng-container
              *ngFor="
                let filterKey of filterFormFilterKeys;
                trackBy: filterFormTrackBy
              "
            >
              <!-- Full Text Filter -->
              <mat-form-field
                *ngIf="this.filterFormFullTextFilterKey === filterKey"
                class="col"
              >
                <mat-label>Filter Full Text</mat-label>
                <input
                  type="text"
                  matInput
                  [formControlName]="
                    this.filterFormFilterFormKeySanitize(filterKey)
                  "
                />
                <button
                  matSuffix
                  mat-icon-button
                  (click)="this.filterFormGetFormControl(filterKey).reset(null)"
                >
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <!-- Text Filter -->
              <mat-form-field
                *ngIf="filterFormIsTextFilterKey(filterKey)"
                class="col"
              >
                <mat-label
                  >Filter
                  {{ this.displayedColumnsTransform(filterKey) }}</mat-label
                >
                <input
                  type="text"
                  matInput
                  [formControlName]="
                    this.filterFormFilterFormKeySanitize(filterKey)
                  "
                />
                <button
                  matSuffix
                  mat-icon-button
                  (click)="this.filterFormGetFormControl(filterKey).reset(null)"
                >
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <!-- Date Filter  -->
              <mat-form-field
                *ngIf="this.dateFiltersIsDateFilterKey(filterKey)"
                class="col"
              >
                <mat-label>{{
                  this.displayedColumnsTransform(filterKey)
                }}</mat-label>
                <input
                  matInput
                  [formControlName]="
                    this.filterFormFilterFormKeySanitize(filterKey)
                  "
                  [matDatepicker]="picker"
                  appReviewPeriodDate
                />
                <mat-datepicker-toggle
                  matSuffix
                  [for]="picker"
                ></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                <button
                  matSuffix
                  mat-icon-button
                  (click)="this.filterFormGetFormControl(filterKey).reset(null)"
                >
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <!-- Column Filter  -->
              <mat-form-field
                *ngIf="this.selectFiltersIsSelectFilterKey(filterKey)"
                class="col"
              >
                <mat-label>{{
                  this.displayedColumnsTransform(filterKey)
                }}</mat-label>
                <mat-chip-grid #chipGrid>
                  <mat-chip-row
                    *ngFor="
                      let option of this.selectFiltersOptionsSelected[filterKey]
                        | async;
                      trackBy: selectFiltersChipsTrackByOption
                    "
                    (removed)="
                      selectFiltersChipRemove(filterKey, option, chipGrid)
                    "
                  >
                    {{ option }}
                    <mat-icon matChipRemove>cancel</mat-icon>
                  </mat-chip-row>
                  <input
                    type="text"
                    matInput
                    [matAutocomplete]="auto"
                    persistentAutocomplete
                    #autoTrigger="persistentAutocompleteTrigger"
                    [formControl]="this.selectFiltersInputControl[filterKey]!"
                    [matChipInputFor]="chipGrid"
                    [matChipInputSeparatorKeyCodes]="
                      selectFiltersSeparatorKeysCodes
                    "
                    (matChipInputTokenEnd)="
                      selectFiltersAddFromInput($event, filterKey)
                    "
                    (keydown.esc)="
                      $event.stopPropagation(); autoTrigger.closePanel()
                    "
                  />
                </mat-chip-grid>
                <mat-autocomplete
                  #auto="matAutocomplete"
                  (opened)="selectFiltersOnFilterDropdownOpened(filterKey)"
                >
                  <mat-option [value]="null" disabled class="select-option">
                    <mat-checkbox
                      [checked]="selectFiltersIsAllSelected(filterKey)"
                      [indeterminate]="selectFiltersIsIndeterminate(filterKey)"
                      (change)="selectFiltersToggleSelectAll(filterKey)"
                    >
                      {{
                        this.selectFiltersIsAllSelected(filterKey)
                          ? "Unselect All"
                          : ""
                      }}
                      {{
                        !this.selectFiltersIsAllSelected(filterKey) &&
                        !this.selectFiltersIsIndeterminate(filterKey)
                          ? "Select All"
                          : ""
                      }}
                    </mat-checkbox>
                  </mat-option>
                  <mat-option
                    *ngFor="
                      let option of selectFiltersOptionsSelectionsFiltered$[
                        filterKey
                      ] | async;
                      trackBy: selectFiltersTrackByOption
                    "
                    disabled
                    [value]="option.value"
                    class="select-option"
                  >
                    <mat-checkbox
                      [checked]="
                        selectFiltersOptionsSelectionModel[
                          filterKey
                        ]!.isSelected(option.value)
                      "
                      (change)="
                        selectFiltersOptionsSelectionModel[filterKey]!.toggle(
                          option.value
                        )
                      "
                    >
                      {{ option.value }}
                    </mat-checkbox>
                  </mat-option>
                </mat-autocomplete>

                <button
                  matSuffix
                  mat-icon-button
                  (click)="
                    $event.stopPropagation();
                    this.filterFormGetFormControl(filterKey).reset(null);
                    this.selectFiltersResetSupplementaryControls(filterKey)
                  "
                >
                  <mat-icon>clear</mat-icon>
                </button>
              </mat-form-field>

              <div
                class="col mb-3"
                *ngIf="filterKey === this.filterFormHighlightSelectFilterKey"
              >
                <mat-button-toggle-group
                  class="px-0 w-100 justify-content-center"
                  [formControlName]="this.filterFormHighlightSelectFilterKey"
                >
                  <mat-button-toggle
                    class="highlight-radio"
                    *ngFor="
                      let option of Object.entries(filterFormHighlightMap);
                      trackBy: filterFormHighlightMapTrackBy
                    "
                    [value]="option[0]"
                  >
                    <span
                      class="color-box"
                      [ngStyle]="{ 'background-color': option[0] }"
                    ></span>
                  </mat-button-toggle>
                  <mat-button-toggle class="highlight-radio" [value]="null">
                    <mat-icon class="highlight-radio-cancel">cancel</mat-icon>
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>
            </ng-container>
          </div>
        </form>
      </mat-drawer>

      <mat-drawer-content>
        <div
          class="col px-0 overflow-auto scroll-position-preserve"
          (appClickOutsideTable)="filterFormHighlightSelectedColor = undefined"
        >
          <table
            mat-table
            [dataSource]="dataSource"
            [trackBy]="dataSourceTrackBy"
            matSort
          >
            <!-- Projected Column Definitions  -->
            <ng-content />

            <!-- Column Definitions  -->
            <ng-container
              *ngFor="let column of dataColumnsDisplayValues"
              [matColumnDef]="column"
            >
              <th
                mat-header-cell
                *matHeaderCellDef
                [mat-sort-header]="column"
                [class.sticky-cell]="isStickyColumn(column)"
                class="px-2"
              >
                <div>
                  {{ this.displayedColumnsTransform(column) }}
                </div>
              </th>
              <td
                mat-cell
                *matCellDef="let row"
                [class.sticky-cell]="isStickyColumn(column)"
                class="px-2"
              >
                <div>
                  <ng-container
                    *ngIf="this.displayedColumnsTime.includes(column)"
                  >
                    {{
                      this.dataColumnsGetUnsafeValueByPath(row, column)
                        | appTxnTime
                    }}
                  </ng-container>
                  <ng-container *ngIf="this.dateFiltersValues.includes(column)">
                    {{
                      this.dataColumnsGetUnsafeValueByPath(row, column)
                        | date : "MM/dd/yyyy"
                    }}
                  </ng-container>
                  <ng-container
                    *ngIf="
                      !this.dateFiltersValues.includes(column) &&
                      !this.displayedColumnsTime.includes(column)
                    "
                  >
                    {{ this.dataColumnsGetUnsafeValueByPath(row, column) }}
                  </ng-container>
                </div>
              </td>
            </ng-container>

            <tr
              mat-header-row
              *matHeaderRowDef="this.displayedColumns; sticky: true"
            ></tr>
            <ng-container *ngIf="recentlyOpenRows$ | async as recentlyOpenRows">
              <tr
                mat-row
                *matRowDef="let row; columns: this.displayedColumns"
                [class.recentlyOpenRowHighlight]="
                  isRecentlyOpened(row, recentlyOpenRows)
                "
                (click)="filterFormAssignSelectedColorToRow(row, $event)"
                [style.cursor]="
                  filterFormHighlightSelectedColor !== undefined
                    ? 'pointer'
                    : 'default'
                "
              ></tr>
            </ng-container>
          </table>
        </div>
      </mat-drawer-content>
    </mat-drawer-container>

    <mat-paginator
      [pageSizeOptions]="pageSizeOptions"
      [pageSize]="pageSize"
      showFirstLastButtons
      aria-label="Select page of periodic elements"
      class="col-auto ms-auto"
    >
    </mat-paginator>
  `,
  styleUrl: "./base-table.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTableComponent<
    TData extends object,
    TDataColumn extends (keyof TData & string) | (string & {}),
    TDisplayColumn extends TDataColumn,
    TFilterKeys extends keyof TData & string,
    THighlightKey extends (keyof TData & string) | TFilterKeys,
    TSelection = { [K in keyof TData]: string },
  >
  extends AbstractBaseTable<
    TData,
    TDataColumn,
    TDisplayColumn,
    TFilterKeys,
    THighlightKey,
    TSelection
  >
  implements OnInit, ISelectionMasterToggle<TData>, AfterContentInit
{
  @Input({ required: true })
  override dataColumnsValues!: TDataColumn[];

  @Input({ required: true })
  override dataColumnsIgnoreValues!: TDataColumn[];

  @Input()
  override dataColumnsProjected: TDataColumn[] = [];

  /**
   * Accepts columns that are not data columns. Includes display columns for select, actions.
   */
  @Input({ required: true })
  override displayedColumns!: TDisplayColumn[];

  @Input({ required: true })
  override displayedColumnsColumnHeaderMap: Partial<
    Record<TDataColumn | IFilterForm["filterFormFullTextFilterKey"], string>
  > = {};

  @Input({ required: true })
  override stickyColumns!: TDisplayColumn[];

  @Input({ required: true })
  override selectFiltersValues!: TDataColumn[];

  @Input({ required: true })
  override dateFiltersValues!: TDataColumn[];

  @Input({ required: true })
  override dateFiltersValuesIgnore!: TDataColumn[];

  @Input({ required: true })
  override displayedColumnsTime!: TDataColumn[];

  override filterFormFormGroup!: FormGroup<any>;

  override filterFormFilterKeys!: TFilterKeys[];
  private _data!: TData[];
  get data(): TData[] {
    return this._data;
  }

  @Input()
  set data(value: TData[]) {
    this._data = value;
    if (!this.dataSource) return;

    // todo update page size options if no of records changes
    if (this.dataSource.data.length !== value.length) {
      throw new Error("update page size options if no of records changes");
    }

    this.dataSource.data = value;

    // Mark ALL select filter options caches as dirty
    const selectFilterKeys = this.filterFormFilterKeys.filter(
      this.selectFiltersIsSelectFilterKey,
    );
    for (const key of selectFilterKeys) {
      this.selectFiltersIsUniqueOptionsCacheDirty.set(key, true);
    }
  }

  override dataSource!: MatTableDataSource<TData, MatPaginator>;

  @Input({ required: true })
  override dataSourceTrackBy!: TrackByFunction<TData>;

  @Input({ required: true })
  override selection!: SelectionModel<TSelection>;

  @Input({ required: true })
  override selectionKey!: keyof TSelection;

  @Input({ required: true })
  hasMasterToggle = false;

  isAllSelected(): boolean {
    if (!this.hasMasterToggle)
      throw new Error("Master selection toggle is disabled");

    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows;
  }

  toggleAllRows(): void {
    if (!this.hasMasterToggle)
      throw new Error("Master selection toggle is disabled");

    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.filteredData.forEach((row) =>
          this.selection.select(row as unknown as TSelection),
        );
  }

  @Input({ required: true })
  override filterFormHighlightSelectFilterKey!: THighlightKey;

  @ContentChildren(MatColumnDef) columnDefs!: QueryList<MatColumnDef>;
  ngAfterContentInit(): void {
    this.columnDefs.forEach((colDef) => this.table.addColumnDef(colDef));
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.data);
    this.dataSource.sortingDataAccessor = this.sortingAccessor;
    this.dataColumnsDisplayValues = this.dataColumnsValues.filter(
      (val) =>
        !this.dataColumnsIgnoreValues.includes(val) &&
        !this.dataColumnsProjected.includes(val),
    );
    this.displayedColumns.push(
      ...(this.dataColumnsProjected as TDisplayColumn[]),
      ...(this.dataColumnsDisplayValues as TDisplayColumn[]),
    );
    this.filterFormFilterKeys = this.filterFormFilterKeysCreate();
    this.filterFormFormGroup = this.filterFormGroupCreate();
    this.updatePageSizeOptions(this.dataSource.data.length);
    this.selectFiltersInitialize(this.dataSource.data);
    this.dataSource.filterPredicate = this.filterFormFilterPredicateCreate();
  }

  @Input() recentlyOpenRows$ = of([] as string[]);

  isRecentlyOpened(row: TData, recentlyOpenRows: string[]) {
    return recentlyOpenRows.includes(
      row[this.selectionKey as unknown as keyof TData] as string,
    );
  }
}
