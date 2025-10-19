import { CommonModule, DatePipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
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
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatToolbarModule } from "@angular/material/toolbar";
import { ClickOutsideTableDirective } from "../table/click-outside-table.directive";
import { PadZeroPipe } from "../table/pad-zero.pipe";
import { ReviewPeriodDateDirective } from "../transaction-search/review-period-date.directive";
import { PersistentAutocompleteTrigger } from "../transaction-view/persistent-autocomplete-trigger.directive";
import {
  AbstractBaseTable,
  IFilterForm,
  ISelectionMasterToggle,
  TableRecordUiProps,
} from "./abstract-base-table";
import { SelectionModel } from "@angular/cdk/collections";

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
    PadZeroPipe,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDivider,
    MatChipsModule,
    MatAutocomplete,
    PersistentAutocompleteTrigger,
    MatButtonToggleModule,
    ClickOutsideTableDirective,
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
    <mat-drawer-container class="overflow-visible" hasBackdrop="false">
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
          <div class="flex-grow-1 overflow-auto row row-cols-1 mx-0 pt-3">
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
                <mat-autocomplete #auto="matAutocomplete">
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
          class="col px-0 overflow-auto"
          (appClickOutsideTable)="filterFormHighlightSelectedColor = undefined"
        >
          <table
            mat-table
            [dataSource]="dataSource"
            [trackBy]="dataSourceTrackBy"
            matSort
          >
            <!-- Selection Model -->
            <ng-container matColumnDef="select">
              <th
                mat-header-cell
                *matHeaderCellDef
                class="px-2"
                [class.sticky-cell]="isStickyColumn('select')"
              >
                <div *ngIf="hasMasterToggle">
                  <mat-checkbox
                    (change)="$event ? toggleAllRows() : null"
                    [checked]="selection.hasValue() && isAllSelected()"
                    [indeterminate]="selection.hasValue() && !isAllSelected()"
                  >
                  </mat-checkbox>
                </div>
              </th>
              <td
                mat-cell
                *matCellDef="let row; let i = index"
                [class.sticky-cell]="isStickyColumn('select')"
                [ngStyle]="{
                  backgroundColor: row._uiPropHighlightColor || ''
                }"
              >
                <div>
                  <mat-checkbox
                    (click)="onCheckBoxClickMultiToggle($event, row, i)"
                    (change)="$event ? selection.toggle(row) : null"
                    [checked]="selection.isSelected(row)"
                  >
                  </mat-checkbox>
                </div>
              </td>
            </ng-container>
            <!-- Column Definitions  -->
            <ng-container
              *ngFor="let column of dataColumnsDisplayValues"
              [matColumnDef]="column"
            >
              <th
                mat-header-cell
                *matHeaderCellDef
                [mat-sort-header]="column"
                class="px-2"
              >
                <div [class.sticky-cell]="isStickyColumn(column)">
                  {{ this.displayedColumnsTransform(column) }}
                </div>
              </th>
              <td mat-cell *matCellDef="let row">
                <div [class.sticky-cell]="isStickyColumn(column)">
                  <ng-container
                    *ngIf="this.displayedColumnsTime.includes(column)"
                  >
                    {{
                      this.dataColumnsGetUnsafeValueByPath(row, column)
                        | appPadZero : 8
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
              *matHeaderRowDef="this.displayedColumnsValues"
            ></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: this.displayedColumnsValues"
              (click)="filterFormAssignSelectedColorToRow(row, $event)"
              [style.cursor]="
                filterFormHighlightSelectedColor !== undefined
                  ? 'pointer'
                  : 'default'
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
      class="col-auto ms-auto"
    >
    </mat-paginator>
  `,
  styleUrl: "./base-table.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTableComponent<
    TData extends TableRecordUiProps,
    TDataColumn extends (keyof TData & string) | (string & {}),
    TDisplayColumn extends TDataColumn | "select",
    TFilterKeys extends string,
    TSelection = { [K in keyof TData]: string },
  >
  extends AbstractBaseTable<
    TData,
    TDataColumn,
    TDisplayColumn,
    TFilterKeys,
    TSelection
  >
  implements OnInit, ISelectionMasterToggle<TData>
{
  @Input({ required: true })
  override dataColumnsValues!: TDataColumn[];

  @Input({ required: true })
  override dataColumnsIgnoreValues!: TDataColumn[];

  /**
   * Apart from data columns includes display columns for select, validation info
   */
  override displayedColumnsValues!: TDisplayColumn[];

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

  @Input()
  data!: TData[];

  override dataSource!: MatTableDataSource<TData, MatPaginator>;

  @Input({ required: true })
  override dataSourceTrackBy!: TrackByFunction<TData>;

  @Input({ required: true })
  override selection!: SelectionModel<TSelection>;

  @Input()
  hasMasterToggle = false;

  @Input()
  isAllSelected(): boolean {
    throw new Error("Method not implemented.");
    //   const numSelected = this.selection.selected.length;
    //   const numRows = this.dataSource.data.length;
    //   return numSelected === numRows;
  }

  @Input()
  toggleAllRows(): void {
    throw new Error("Method not implemented.");
    // this.isAllSelected()
    //   ? this.selection.clear()
    //   : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.data);
    this.dataColumnsDisplayValues = this.dataColumnsValues.filter(
      (val) => !this.dataColumnsIgnoreValues.includes(val),
    );
    this.displayedColumnsValues = [
      "select" as TDisplayColumn,
      ...(this.dataColumnsDisplayValues as TDisplayColumn[]),
    ];
    this.filterFormFilterKeys = this.filterFormFilterKeysCreate();
    this.filterFormFormGroup = this.filterFormGroupCreate();
    this.updatePageSizeOptions(this.dataSource.data.length);
    this.selectFiltersComputeUniqueFilterOptions(this.dataSource.data);
    this.dataSource.filterPredicate = this.filterFormFilterPredicateCreate();
  }
}
