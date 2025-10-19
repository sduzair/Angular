import { SelectionModel } from "@angular/cdk/collections";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  TrackByFunction,
  ViewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup } from "@angular/forms";
import { MatChipGrid, MatChipInputEvent } from "@angular/material/chips";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTable, MatTableDataSource } from "@angular/material/table";
import { startOfDay, isAfter, isBefore, format } from "date-fns";
import { combineLatest, map, Observable, startWith, Subject, tap } from "rxjs";

/**
 * Generic abstract base class for table components with filtering, pagination and selection capabilities
 *
 * @template TData - The type of data displayed in the table
 * @template TDataColumn - The type representing valid column names
 * @template TFilterKeys - The type representing valid filter keys
 */
@Component({ template: "" })
export abstract class AbstractBaseTable<
  TData extends TableRecordUiProps,
  TDataColumn extends (keyof TData & string) | (string & {}),
  TDisplayColumn extends TDataColumn | string,
  TFilterKeys extends string,
  TSelection = { [K in keyof TData]: string },
> implements
    IDataColumns<TDataColumn, TData>,
    IDisplayedColumns<TDataColumn, TDisplayColumn>,
    IStickyColumns<TDisplayColumn>,
    ISelectFilters<TDataColumn, TData, TFilterKeys>,
    IDateFilters<TDataColumn, TFilterKeys>,
    IFilterForm<TData, TFilterKeys>,
    IDataSource<TData>,
    IPagination,
    ISortable,
    ISelection<TData, TSelection>,
    IHighlightable<TData, TDataColumn, TFilterKeys>,
    AfterViewInit
{
  destroyRef = inject(DestroyRef);
  // ============================================================================
  // Data Columns Implementation
  // ============================================================================

  abstract dataColumnsValues: TDataColumn[];
  abstract dataColumnsIgnoreValues: TDataColumn[];

  dataColumnsDisplayValues!: TDataColumn[];

  /**
   * Get unsafe value from table record.
   *
   * @param {TData} obj
   * @param {string} path
   * @returns {*}
   */
  dataColumnsGetUnsafeValueByPath(obj: TData, path: string): any {
    const keys = path.split(".");

    return keys.reduce((acc, key) => {
      if (acc === undefined || acc === null) return undefined;

      const arrayIndex = Number(key);
      if (!Number.isNaN(arrayIndex) && Array.isArray(acc)) {
        return acc[arrayIndex];
      }

      return acc[key as keyof TData];
    }, obj as any);
  }
  /**
   * Formats and normalizes unsafe values in table record data into 'string'. Use in conjunction with get by path method
   *
   * @param {unknown} unsafeValue
   * @returns {string}
   */
  dataColumnsFormatAndNormalizeUnsafevalue(unsafeValue: unknown): string {
    if (unsafeValue === null || unsafeValue === undefined) {
      return "";
    }
    if (typeof unsafeValue === "object") {
      throw new Error(
        "Need primitive values to compute distict values for a column",
      );
    }

    return String(unsafeValue).trim();
  }

  // ============================================================================
  // Displayed Columns Implementation
  // ============================================================================
  abstract displayedColumnsValues: TDisplayColumn[];
  abstract displayedColumnsColumnHeaderMap: Partial<
    Record<TDataColumn | IFilterForm["filterFormFullTextFilterKey"], string>
  >;

  displayedColumnsTransform(key: string): string {
    if (this.dateFiltersIsDateFilterKeyStart(key)) {
      const parsedKey = this.dateFiltersParseFilterKey(key);
      return `${this.displayedColumnsColumnHeaderMap[parsedKey]!} Start`;
    }
    if (this.dateFiltersIsDateFilterKeyEnd(key)) {
      const parsedKey = this.dateFiltersParseFilterKey(key);
      return `${this.displayedColumnsColumnHeaderMap[parsedKey]!} End`;
    }
    if (this.dateFiltersValues.includes(key as TDataColumn)) {
      return this.displayedColumnsColumnHeaderMap[key as TDataColumn]!;
    }
    if (this.selectFiltersIsSelectFilterKey(key)) {
      const parsedVal = this.selectFiltersParseFilterKey(key);
      return this.displayedColumnsColumnHeaderMap[parsedVal]!;
    }
    if (this.selectFiltersValues.includes(key as TDataColumn)) {
      return this.displayedColumnsColumnHeaderMap[key as TDataColumn]!;
    }
    if (key.startsWith("_hidden")) return "";
    if (this.filterFormIsTextFilterKey(key))
      return this.displayedColumnsColumnHeaderMap[key as TDataColumn]!;
    if (this.filterFormFullTextFilterKey === key)
      return this.displayedColumnsColumnHeaderMap[key]!;
    if (this.filterFormHighlightSelectFilterKey === key)
      return this.displayedColumnsColumnHeaderMap[
        key as IFilterForm["filterFormFullTextFilterKey"]
      ]!;

    throw new Error("Unknown column header");
  }

  // ============================================================================
  // Sticky Column Implementation
  // ============================================================================
  abstract stickyColumns: TDisplayColumn[];
  isStickyColumn(col: string): boolean {
    return this.stickyColumns.includes(col as TDisplayColumn);
  }

  // ============================================================================
  // Select Filters Implementation
  // ============================================================================

  abstract selectFiltersValues: TDataColumn[];

  selectFiltersOptionsSelectionsFiltered$: Partial<
    Record<TFilterKeys, Observable<{ value: string; isSelected: boolean }[]>>
  > = {};
  selectFiltersOptionsSelectionModel: Partial<
    Record<TFilterKeys, SelectionModel<string>>
  > = {};
  selectFiltersOptionsSelected: Partial<
    Record<TFilterKeys, Observable<string[]>>
  > = {};

  readonly selectFiltersUniqueFilterOptions: Partial<
    Record<TFilterKeys, string[]>
  > = {};
  selectFiltersInputControl: Partial<Record<TFilterKeys, FormControl>> = {};

  selectFiltersGenerateFilterKeys = (column: string) =>
    `select${column.charAt(0).toUpperCase() + column.slice(1)}` as TFilterKeys;

  selectFiltersParseFilterKey = (key: string): TDataColumn => {
    console.assert(key.startsWith("select"));
    const column = key.slice(6); // Remove 'select'
    return (column.charAt(0).toLowerCase() + column.slice(1)) as TDataColumn;
  };

  selectFiltersIsSelectFilterKey = (key: string) => {
    return (
      key.startsWith("select") &&
      this.selectFiltersValues.some(
        (col) => col === this.selectFiltersParseFilterKey(key),
      )
    );
  };

  selectFiltersTrackByOption(
    _index: number,
    option: { value: string; isSelected: boolean },
  ) {
    return option.value;
  }

  SELECT_FILTER_BLANK_VALUE = "-- blank --" as const;
  selectFiltersComputeUniqueFilterOptions(data: TData[]): void {
    const filterKeys = this.filterFormFilterKeys.filter(
      this.selectFiltersIsSelectFilterKey,
    );

    this.selectFiltersOptionsSelectionsFiltered$ = {};

    for (const key of filterKeys) {
      const valueSet = new Set<string>([this.SELECT_FILTER_BLANK_VALUE]);
      for (const record of data) {
        const value = this.dataColumnsGetUnsafeValueByPath(
          record,
          this.selectFiltersParseFilterKey(key),
        );

        const addToValueSet = (unsafeVal: string) => {
          const safeVal =
            this.dataColumnsFormatAndNormalizeUnsafevalue(unsafeVal);
          if (safeVal === "") return;
          valueSet.add(safeVal);
        };

        // in case of row validation info the value is an array
        if (Array.isArray(value)) {
          value.forEach((v) => addToValueSet(v));
          continue;
        }

        addToValueSet(value);
      }

      // readonly unique filter options
      this.selectFiltersUniqueFilterOptions[key] = Array.from(valueSet).sort();

      // options selection model sets/gets select state
      this.selectFiltersOptionsSelectionModel[key] = new SelectionModel<string>(
        true,
        [],
      );

      // input for filtering selection options
      this.selectFiltersInputControl[key] = new FormControl<string>("", {
        nonNullable: true,
      });

      this.selectFiltersOptionsSelected[key] =
        this.selectFiltersOptionsSelectionModel[key].changed.pipe(
          map((selectionChange) => selectionChange.source.selected),
          startWith(this.selectFiltersOptionsSelectionModel[key].selected),
        );

      // filtered selection options
      this.selectFiltersOptionsSelectionsFiltered$[key] = combineLatest([
        this.selectFiltersInputControl[key]!.valueChanges.pipe(startWith("")),
        this.selectFiltersOptionsSelected[key].pipe(
          tap((selected) => {
            this.selectFiltersInputControl[key]!.reset();
            this.filterFormFormGroup
              .get(this.filterFormFilterFormKeySanitize(key))!
              .setValue(selected);
          }),
          takeUntilDestroyed(this.destroyRef),
        ),
      ]).pipe(
        map(([value, optionsSelected]: [string, string[]]) => {
          return this.selectFiltersUniqueFilterOptions[key]!.flatMap(
            (option) => {
              const matchesFilter =
                value === "" ||
                option.toLowerCase().includes(value.toLowerCase());

              if (!matchesFilter) return [];

              const isSelected = (optionsSelected ?? []).includes(option);

              return [{ value: option, isSelected }];
            },
          );
        }),
      );
    }
  }

  selectFiltersSeparatorKeysCodes: number[] = [ENTER, COMMA];

  selectFiltersChipRemove(
    filterKey: TFilterKeys,
    option: string,
    chipGrid: MatChipGrid,
  ) {
    const currentSelected: string[] =
      this.selectFiltersOptionsSelectionModel[filterKey]!.selected;

    const index = currentSelected.indexOf(option);

    console.assert(
      index >= 0,
      "Assert chip being removed must exist in chip set",
    );
    if (index < 0) return;

    this.selectFiltersOptionsSelectionModel[filterKey]!.deselect(
      currentSelected[index],
    );

    //  Focus last chip after removal
    setTimeout(() => {
      chipGrid._focusLastChip();
    }, 0);
  }

  selectFiltersAddFromInput(
    event: MatChipInputEvent,
    filterKey: TFilterKeys,
  ): void {
    if (
      !this.selectFiltersUniqueFilterOptions[filterKey]!.includes(event.value)!
    )
      return;

    this.selectFiltersOptionsSelectionModel[filterKey]!.select(event.value);
    event.chipInput.clear();
  }

  selectFiltersChipsTrackByOption(_: number, option: string): string {
    return option;
  }

  selectFiltersIsAllSelected(filterKey: TFilterKeys): boolean {
    if (!this.selectFiltersOptionsSelectionModel[filterKey]) return false;

    return (
      this.selectFiltersOptionsSelectionModel[filterKey].selected.length ===
      this.selectFiltersUniqueFilterOptions[filterKey]!.length
    );
  }

  selectFiltersIsIndeterminate(filterKey: TFilterKeys): boolean {
    if (!this.selectFiltersOptionsSelectionModel[filterKey]) return false;

    return (
      this.selectFiltersOptionsSelectionModel[filterKey].selected.length > 0 &&
      !this.selectFiltersIsAllSelected(filterKey)
    );
  }

  selectFiltersToggleSelectAll(filterKey: TFilterKeys): void {
    if (this.selectFiltersIsAllSelected(filterKey)) {
      this.selectFiltersOptionsSelectionModel[filterKey]!.clear();
      return;
    }

    this.selectFiltersOptionsSelectionModel[filterKey]!.select(
      ...this.selectFiltersUniqueFilterOptions[filterKey]!,
    );
  }

  selectFiltersResetSupplementaryControls(filterKey: TFilterKeys) {
    this.selectFiltersOptionsSelectionModel[filterKey]!.clear();
    this.selectFiltersInputControl[filterKey]!.reset("");
  }

  // ============================================================================
  // Date Filters Implementation
  // ============================================================================

  abstract dateFiltersValues: TDataColumn[];
  abstract dateFiltersValuesIgnore: TDataColumn[];
  abstract displayedColumnsTime: TDataColumn[];

  dateFiltersGenerateStartAndEndFilterKeys = (column: string) => [
    `${column}Start` as const,
    `${column}End` as const,
  ];

  dateFiltersParseFilterKey = (key: string): TDataColumn => {
    for (const col of this.dateFiltersValues) {
      if (key === `${col}Start` || key === `${col}End`) {
        return col;
      }
    }
    throw new Error("Not a valid date filter key");
  };

  dateFiltersIsDateFilterKey = (key: string) =>
    this.dateFiltersValues.some(
      (col) => key === `${col}Start` || key === `${col}End`,
    );

  dateFiltersIsDateFilterKeyStart = (key: string) =>
    this.dateFiltersValues.some((col) => key === `${col}Start`);

  dateFiltersIsDateFilterKeyEnd = (key: string) =>
    this.dateFiltersValues.some((col) => key === `${col}End`);

  // ============================================================================
  // Filter Form Implementation
  // ============================================================================
  abstract filterFormFormGroup: FormGroup;
  abstract filterFormFilterKeys: TFilterKeys[];
  private filterChangeSubject = new Subject<void>();
  public filterFormFilterStateChange$ = this.filterChangeSubject.asObservable();

  private _ = this.filterFormFilterStateChange$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => {
      this.dataSource.filter = JSON.stringify(this.filterFormFormGroup.value);
    });

  public filterFormApplyFilters() {
    this.filterChangeSubject.next();
  }

  filterFormResetFilters() {
    this.filterFormFormGroup.reset();
    this.filterFormFilterKeys
      .filter(this.selectFiltersIsSelectFilterKey)
      .forEach((key) => {
        this.selectFiltersResetSupplementaryControls(key);
      });

    this.filterFormApplyFilters();
  }

  filterFormRemoveFilter(sanitizedKey: string) {
    this.filterFormFormGroup.get(sanitizedKey)!.reset();
    const desanitizedKey = this.filterFormFilterFormKeyDesanitize(sanitizedKey);
    if (this.selectFiltersIsSelectFilterKey(desanitizedKey))
      this.selectFiltersResetSupplementaryControls(desanitizedKey);
    this.filterChangeSubject.next();
  }

  filterFormIsResetBtnDisabled$ = this.filterFormFilterStateChange$.pipe(
    map(() => {
      const filter = JSON.parse(this.dataSource.filter || "{}");

      return Object.keys(filter).every(
        (key) => filter[key] == null || (filter[key] as string[]).length === 0,
      );
    }),
  );

  filterFormIsTextFilterKey(key: string) {
    if (this.dateFiltersIsDateFilterKey(key)) return false;
    if (this.selectFiltersIsSelectFilterKey(key)) return false;
    if (this.filterFormFullTextFilterKey === key) return false;
    if (this.filterFormHighlightSelectFilterKey === key) return false;
    return true;
  }

  filterFormFilterKeysCreate(): TFilterKeys[] {
    return [
      this.filterFormFullTextFilterKey as TFilterKeys,
      this.filterFormHighlightSelectFilterKey as TFilterKeys,
      ...this.dataColumnsValues.flatMap((column): TFilterKeys[] => {
        if (this.dataColumnsIgnoreValues.includes(column)) return [];
        if (this.dateFiltersValuesIgnore.includes(column)) return [];
        if (this.dateFiltersValues.includes(column)) {
          return [
            ...this.dateFiltersGenerateStartAndEndFilterKeys(column),
          ] as TFilterKeys[];
        }
        if (this.selectFiltersValues.includes(column))
          return [this.selectFiltersGenerateFilterKeys(column)];

        return [column] as any as TFilterKeys[];
      }),
    ];
  }

  filterFormGroupCreate(): FormGroup {
    return new FormGroup(
      this.filterFormFilterKeys.reduce((acc, key) => {
        return {
          ...acc,
          [this.filterFormFilterFormKeySanitize(key)]: new FormControl(null),
        };
      }, {}),
      { updateOn: "change" },
    );
  }

  // todo invert filter
  // todo selection filter
  filterFormFilterPredicateCreate(): (
    record: TData,
    filter: string,
  ) => boolean {
    return (record, filter) => {
      const searchTerms: { [key: string]: string | string[] | null } =
        JSON.parse(filter);
      const recordPredicate = (searchTermKey: string) => {
        console.assert(
          searchTerms[searchTermKey] != null &&
            (searchTerms[searchTermKey] as string[]).length > 0,
        );

        const desanitizedKey =
          this.filterFormFilterFormKeyDesanitize(searchTermKey);

        if (this.dateFiltersIsDateFilterKey(desanitizedKey)) {
          const keyPath = this.dateFiltersParseFilterKey(desanitizedKey);
          const safeRecordValue = startOfDay(
            this.dataColumnsFormatAndNormalizeUnsafevalue(
              this.dataColumnsGetUnsafeValueByPath(record, keyPath),
            ),
          );

          console.assert(typeof searchTerms[`${keyPath}Start`] === "string");

          const startDate =
            searchTerms[`${keyPath}Start`] == null
              ? null
              : startOfDay(searchTerms[`${keyPath}Start`] as string);

          const endDate =
            searchTerms[`${keyPath}End`] == null
              ? null
              : startOfDay(searchTerms[`${keyPath}End`] as string);

          if (startDate && isBefore(safeRecordValue, startDate)) return false;
          if (endDate && isAfter(safeRecordValue, endDate)) return false;
          return true;
        }

        if (this.selectFiltersIsSelectFilterKey(desanitizedKey)) {
          const keyPath = this.selectFiltersParseFilterKey(desanitizedKey);
          const recordValue: unknown = this.dataColumnsGetUnsafeValueByPath(
            record,
            keyPath,
          );

          if (keyPath === ("_hiddenValidation" as TDataColumn)) {
            console.assert(typeof searchTerms[searchTermKey] === "string");
            console.assert(Array.isArray(recordValue));
            return (recordValue as string[]).includes(
              searchTerms[searchTermKey] as string,
            );
          }

          const safeRecordValue =
            this.dataColumnsFormatAndNormalizeUnsafevalue(recordValue);
          console.assert(Array.isArray(searchTerms[searchTermKey]));

          return (searchTerms[searchTermKey] as string[]).some((searchTerm) => {
            if (searchTerm === this.SELECT_FILTER_BLANK_VALUE) {
              return safeRecordValue === "";
            }
            return searchTerm === safeRecordValue;
          });
        }

        if (this.filterFormIsTextFilterKey(desanitizedKey)) {
          const safeRecordValue = this.dataColumnsFormatAndNormalizeUnsafevalue(
            this.dataColumnsGetUnsafeValueByPath(record, desanitizedKey),
          );
          console.assert(typeof searchTerms[searchTermKey] === "string");
          return safeRecordValue
            .toLowerCase()
            .includes(
              (searchTerms[searchTermKey] as string).trim().toLowerCase(),
            );
        }

        if (desanitizedKey === this.filterFormFullTextFilterKey) {
          console.assert(typeof searchTerms[searchTermKey] === "string");

          return JSON.stringify(record)
            .toLowerCase()
            .includes(
              (searchTerms[searchTermKey] as string).trim().toLowerCase(),
            );
        }

        if (desanitizedKey === this.filterFormHighlightSelectFilterKey) {
          console.assert(typeof searchTerms[searchTermKey] === "string");
          return record._uiPropHighlightColor === searchTerms[searchTermKey];
        }

        throw new Error("Unknown filter search term");
      };

      if (this.filterFormConjunctionControl.value === "AND")
        return Object.keys(searchTerms)
          .filter(
            (searchTermKey) =>
              searchTerms[searchTermKey] != null &&
              (searchTerms[searchTermKey] as string[]).length > 0,
          )
          .every(recordPredicate);

      if (this.filterFormConjunctionControl.value === "OR") {
        const filters = Object.keys(searchTerms).filter(
          (searchTermKey) =>
            searchTerms[searchTermKey] != null &&
            (searchTerms[searchTermKey] as string[]).length > 0,
        );
        return filters.length > 0 ? filters.some(recordPredicate) : true;
      }

      throw new Error("A conjuction type must be satisfied");
    };
  }

  filterFormActiveFilters$: Observable<
    {
      header: string;
      value: string | string[];
      sanitizedKey: string;
    }[]
  > = this.filterFormFilterStateChange$.pipe(
    map(() => {
      const activeFilters = JSON.parse(this.dataSource.filter || "{}") as {
        [key: string]: string | string[];
      };
      return Object.keys(activeFilters).flatMap((sanitizedKey) => {
        const header = this.displayedColumnsTransform(
          this.filterFormFilterFormKeyDesanitize(sanitizedKey),
        );
        const value = activeFilters[sanitizedKey];
        if (!value || value.length === 0) return [];
        if (
          this.dateFiltersIsDateFilterKey(
            this.filterFormFilterFormKeyDesanitize(sanitizedKey),
          )
        ) {
          return {
            header,
            value: format(value as string, "MM/dd/yyyy"),
            sanitizedKey,
          };
        }
        if (
          this.selectFiltersIsSelectFilterKey(
            this.filterFormFilterFormKeyDesanitize(sanitizedKey),
          )
        ) {
          return {
            header,
            value: (value as string[]).join(", "),
            sanitizedKey,
          };
        }
        return { header, value, sanitizedKey };
      });
    }),
  );

  filterFormFilterFormKeySanitize = (value: TFilterKeys) => {
    return value.replace(/\./g, "--") as string;
  };

  filterFormFilterFormKeyDesanitize = (value: string) => {
    return value.replace(/--/g, ".") as TFilterKeys;
  };

  filterFormTrackBy(_: number, item: any) {
    return item.sanitizedKey;
  }

  filterFormGetFormControl(filterKey: TFilterKeys) {
    return this.filterFormFormGroup.get(
      this.filterFormFilterFormKeySanitize(filterKey),
    ) as FormControl;
  }

  filterFormFullTextFilterKey = "fullTextFilterKey" as const;
  filterFormHighlightSelectFilterKey = "_uiPropHighlightColor" as
    | TDataColumn
    | TFilterKeys;
  filterFormHighlightMap: Record<string, string> = {
    "#FF6B6B": "Red",
    "#4ECB71": "Green",
    "#4D96FF": "Blue",
    "#FFD93D": "Yellow",
    "#FF8C42": "Orange",
    "#95A5A6": "Gray",
  };
  filterFormHighlightMapTrackBy(index: number, option: string[]) {
    return option[0];
  }
  filterFormHighlightSelectedColor?: string | null = undefined;

  /**
   * Select row color. Note: null signifies removing a color
   *
   * @param {TData} row
   * @param {MouseEvent} event
   */
  filterFormAssignSelectedColorToRow(row: TData, event: MouseEvent) {
    if (typeof this.filterFormHighlightSelectedColor === "undefined") return;

    const targetRows: TData[] = event.ctrlKey
      ? this.dataSource.filteredData
      : [row];

    // Apply selectedColor to target rows
    const targetIds = new Set(
      targetRows.map((row) => {
        return this.table.trackBy(0, row);
      }),
    );

    this.dataSource.data = this.dataSource.data.map((row) => {
      if (targetIds.has(this.table.trackBy(0, row))) {
        return {
          ...row,
          _uiPropHighlightColor: this.filterFormHighlightSelectedColor,
        };
      }
      return row;
    });
    return;
  }

  filterFormConjunctionControl = new FormControl<"OR" | "AND">("AND", {
    nonNullable: true,
  });

  // ============================================
  // IDataSource Implementation
  // ============================================
  @ViewChild(MatTable) table!: MatTable<TData>;
  abstract dataSource: MatTableDataSource<TData>;
  abstract dataSourceTrackBy: TrackByFunction<TData>;

  // ============================================
  // ISortable Implementation
  // ============================================
  @ViewChild(MatSort) sort!: MatSort;

  // ============================================
  // IPagination Implementation
  // ============================================
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  pageSizeOptions: number[] = [5, 10, 20];
  pageSize: number = this.pageSizeOptions[this.pageSizeOptions.length - 1];

  updatePageSizeOptions(dataLength: number): void {
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

  // ============================================
  // ISelection Implementation
  // ============================================
  abstract selection: SelectionModel<TSelection>;

  lastSelectedIndex: { pageRowIndex: number; pageIndex: number } | null = null;

  onCheckBoxClickMultiToggle(
    event: MouseEvent,
    _: TData,
    pageRowIndex: number,
  ) {
    // PointerEvent
    event.stopPropagation();
    if (event.shiftKey && this.lastSelectedIndex != null) {
      // assuming page size remains same b/w selections
      const lastSelectedRowIndex =
        this.lastSelectedIndex.pageRowIndex +
        this.lastSelectedIndex.pageIndex * this.paginator.pageSize;

      const rowIndex =
        pageRowIndex + this.paginator.pageIndex * this.paginator.pageSize;

      const start = Math.min(lastSelectedRowIndex, rowIndex) + 1;
      const end = Math.max(lastSelectedRowIndex, rowIndex) - 1;
      const displayData = this.dataSource.sortData(
        this.dataSource.filteredData,
        this.dataSource.sort!,
      );
      for (let i = start; i <= end; i++) {
        this.selection.toggle(displayData[i] as unknown as TSelection);
      }
    }
    this.lastSelectedIndex = {
      pageRowIndex,
      pageIndex: this.paginator.pageIndex,
    };
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator!;
    this.dataSource.sort = this.sort!;
  }
  readonly Object: any = Object;
}

/**
 * Interface for date filtering functionality
 */
export interface IDateFilters<TDataColumn, TFilterKeys> {
  dateFiltersValues: TDataColumn[];
  dateFiltersValuesIgnore: TDataColumn[];
  displayedColumnsTime: TDataColumn[];
  dateFiltersGenerateStartAndEndFilterKeys(
    column: string,
  ): (`${string}Start` | `${string}End` | TFilterKeys)[];

  dateFiltersParseFilterKey(key: TFilterKeys): TDataColumn;
  dateFiltersIsDateFilterKey(key: TFilterKeys): boolean;
  dateFiltersIsDateFilterKeyStart(key: TFilterKeys): boolean;
  dateFiltersIsDateFilterKeyEnd(key: TFilterKeys): boolean;
}

/**
 * Interface for select/dropdown filtering functionality
 */
export interface ISelectFilters<
  TDataColumn extends string,
  TData,
  TFilterKeys extends string,
> {
  SELECT_FILTER_BLANK_VALUE: "-- blank --";
  selectFiltersValues: TDataColumn[];
  selectFiltersOptionsSelectionsFiltered$: Partial<
    Record<TFilterKeys, Observable<{ value: string; isSelected: boolean }[]>>
  >;
  selectFiltersOptionsSelectionModel: Partial<
    Record<TFilterKeys, SelectionModel<string>>
  >;
  selectFiltersOptionsSelected: Partial<
    Record<TFilterKeys, Observable<string[]>>
  >;
  readonly selectFiltersUniqueFilterOptions: Partial<
    Record<TFilterKeys, string[]>
  >;
  selectFiltersInputControl: Partial<Record<TFilterKeys, FormControl<string>>>;
  selectFiltersGenerateFilterKeys(column: string): TFilterKeys;
  selectFiltersParseFilterKey(key: TFilterKeys): TDataColumn;
  selectFiltersIsSelectFilterKey(key: TFilterKeys): boolean;
  selectFiltersTrackByOption: TrackByFunction<{
    value: string;
    isSelected: boolean;
  }>;
  selectFiltersChipsTrackByOption(index: number, option: string): string;
  selectFiltersComputeUniqueFilterOptions(data: TData[]): void;
  selectFiltersSeparatorKeysCodes: number[];
  selectFiltersChipRemove(
    filterKey: TFilterKeys,
    option: string,
    chipGrid: MatChipGrid,
  ): void;
  selectFiltersAddFromInput(
    $event: MatChipInputEvent,
    filterKey: TFilterKeys,
  ): void;
  selectFiltersIsAllSelected(filterKey: TFilterKeys): boolean;
  selectFiltersIsIndeterminate(filterKey: TFilterKeys): boolean;
  selectFiltersToggleSelectAll(filterKey: TFilterKeys): void;
  selectFiltersResetSupplementaryControls(filterKey: TFilterKeys): void;
}

/**
 * Interface for filter form management
 */
export interface IFilterForm<TData = any, TFilterKeys = any> {
  filterFormFilterKeys: TFilterKeys[];
  filterFormFormGroup: FormGroup;
  filterFormFilterStateChange$: Observable<void>;
  filterFormApplyFilters(): void;
  filterFormResetFilters(): void;
  filterFormIsTextFilterKey(key: TFilterKeys): boolean;
  filterFormFilterKeysCreate(): TFilterKeys[];
  filterFormGroupCreate(): FormGroup;
  filterFormFilterPredicateCreate(): (record: TData, filter: string) => boolean;
  filterFormActiveFilters$: Observable<
    Array<{
      header: string;
      value: string | string[];
      sanitizedKey: string;
    }>
  >;
  filterFormFilterFormKeySanitize(value: TFilterKeys): string;
  filterFormFilterFormKeyDesanitize(value: string): TFilterKeys;
  filterFormRemoveFilter(sanitizedKey: string): void;
  filterFormIsResetBtnDisabled$: Observable<boolean>;
  filterFormTrackBy(index: number, item: any): any;
  filterFormGetFormControl(filterKey: TFilterKeys): FormControl;
  filterFormFullTextFilterKey: "fullTextFilterKey";
}

export interface IHighlightable<TData, TDataColumn, TFilterKeys> {
  filterFormHighlightSelectFilterKey: TDataColumn | TFilterKeys;
  filterFormHighlightMap: Record<string, string>;
  filterFormHighlightMapTrackBy: TrackByFunction<[string, string]>;
  filterFormHighlightSelectedColor?: string | null;

  filterFormAssignSelectedColorToRow(row: TData, event: MouseEvent): void;
  filterFormConjunctionControl: FormControl<"OR" | "AND">;
}

/**
 * Interface for data column configuration
 */
export interface IDataColumns<TDataColumn, TData> {
  dataColumnsValues: TDataColumn[];
  dataColumnsIgnoreValues: TDataColumn[];
  dataColumnsDisplayValues: TDataColumn[];
  dataColumnsGetUnsafeValueByPath(obj: TData, path: string): any;
  dataColumnsFormatAndNormalizeUnsafevalue(value: unknown): string;
}

/**
 * Interface for displayed columns configuration
 */
export interface IDisplayedColumns<
  TDataColumn extends string,
  TDisplayedColumn extends TDataColumn | string,
> {
  displayedColumnsValues: TDisplayedColumn[];
  displayedColumnsColumnHeaderMap: Partial<Record<TDataColumn, string>>;
  displayedColumnsTransform(key: string): string;
}

/**
 * Interface for pagination configuration and updates
 */
export interface IPagination {
  paginator: MatPaginator;
  pageSizeOptions: number[];
  pageSize: number;
  updatePageSizeOptions(dataLength: number): void;
}

/**
 * Interface for pagination configuration and updates
 */
export interface ISortable {
  sort: MatSort;
}

/**
 * Interface for row selection functionality
 */
export interface ISelection<TData, TSelection> {
  selection: SelectionModel<TSelection>;
  lastSelectedIndex: { pageRowIndex: number; pageIndex: number } | null;
  onCheckBoxClickMultiToggle(
    event: MouseEvent,
    _: TData,
    pageRowIndex: number,
  ): void;
}

/**
 * Interface for row selection comparator
 */
export interface ISelectionComparator<TData> {
  selectionComparator(o1: TData, o2: TData): boolean;
}

/**
 * Interface for row selection master toggle
 */
export interface ISelectionMasterToggle<TData> {
  isAllSelected(): boolean;
  toggleAllRows(): void;
}

/**
 * Interface for sticky columns
 */
export interface IStickyColumns<T extends string> {
  stickyColumns: T[];
  isStickyColumn(col: string): boolean;
}

/**
 * Interface for table data source
 */
export interface IDataSource<TData> {
  table: MatTable<TData>;
  dataSource: MatTableDataSource<TData>;
  dataSourceTrackBy: TrackByFunction<TData>;
}

export type TableRecordUiProps = {
  _uiPropHighlightColor?: string | null;
};
