import { SelectionModel } from '@angular/cdk/collections';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class AbstractSelectableTableComponent<T extends object>
  implements ControlValueAccessor, OnInit
{
  selection = new SelectionModel<T>(
    true,
    [],
    true,
    this.getSelectionComparator(),
  );
  disabled = false;
  private onChange = (value: T[]) => {
    /* empty */
  };
  private onTouched = () => {
    /* empty */
  };

  abstract data: T[];
  @Input({ required: true }) isLoading = false;
  dataSource = new MatTableDataSource<T>();
  protected abstract displayedColumns: (keyof T | (string & {}))[];
  protected isRowDisabledFn?: (row: T) => boolean = (_) => false;

  private cdr = inject(ChangeDetectorRef);

  // Abstract method for custom comparison logic
  protected abstract getSelectionComparator(): (a: T, b: T) => boolean;

  protected abstract trackingProps: (keyof T & (string & {}))[];

  // ControlValueAccessor implementation
  writeValue(value: T[]): void {
    this.selection.clear();
    if (value?.length) {
      const tPropMapper = trackingPropsMapper<T>(this.trackingProps);

      this.selection.select(...value.map(tPropMapper));
    }
  }

  registerOnChange(fn: (value: T[]) => void): void {
    this.onChange = (value: T[]) => {
      const tPropMapper = trackingPropsMapper<T>(this.trackingProps);

      fn(value.map(tPropMapper));
    };
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    // initialize table data
    this.dataSource.data = this.data;

    this.selection.changed
      .pipe(takeUntilDestroyed(this.destroyRef))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe(() => {
        this.onChange(this.selection.selected);
        this.onTouched();
      });
  }

  toggleRow(row: T) {
    if (this.isRowDisabled(row)) return;
    this.selection.toggle(row);
  }

  toggleAllRows() {
    if (this.disabled) return;

    const enabledRows = this.dataSource.data.filter(
      (row) => !this.isRowDisabled(row),
    );

    if (this.isAllEnabledSelected()) {
      enabledRows.forEach((row) => {
        if (this.selection.isSelected(row)) {
          this.selection.deselect(row);
        }
      });
    } else {
      this.selection.select(...enabledRows);
    }
  }

  isAllEnabledSelected(): boolean {
    const enabledRows = this.dataSource.data.filter(
      (row) => !this.isRowDisabled(row),
    );
    const selectedEnabledRows = enabledRows.filter((row) =>
      this.selection.isSelected(row),
    );
    return (
      enabledRows.length > 0 &&
      selectedEnabledRows.length === enabledRows.length
    );
  }

  isAllSelected(): boolean {
    return this.isAllEnabledSelected();
  }

  isIndeterminate(): boolean {
    const enabledRows = this.dataSource.data.filter(
      (row) => !this.isRowDisabled(row),
    );
    const selectedEnabledRows = enabledRows.filter((row) =>
      this.selection.isSelected(row),
    );
    return (
      selectedEnabledRows.length > 0 &&
      selectedEnabledRows.length < enabledRows.length
    );
  }

  isRowDisabled(row: T): boolean {
    return (
      this.disabled ||
      (this.isRowDisabledFn ? this.isRowDisabledFn(row) : false)
    );
  }
}

function trackingPropsMapper<T extends object>(trackingProps: string[]) {
  return (item: T) =>
    Object.fromEntries(
      Object.entries(item).filter(([key, _val]) => trackingProps.includes(key)),
    ) as T;
}
// function trackingPropsMapper<T extends object>(trackingProps: string[]) {
//   return (item: T) =>
//     Object.fromEntries(
//       Object.entries(item).map(([key, val]) =>
//         trackingProps.includes(key) ? [key, val] : [key, null],
//       ),
//     ) as T;
// }
