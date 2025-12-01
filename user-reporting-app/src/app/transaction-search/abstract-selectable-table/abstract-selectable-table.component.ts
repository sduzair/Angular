import { SelectionModel } from '@angular/cdk/collections';
import {
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  template: '',
})
export abstract class AbstractSelectableTableComponent<T>
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

  @Input({ required: true }) dataSource = new MatTableDataSource<T>();
  @Input({ required: true }) dataSourceLoadingState = false;
  protected abstract displayedColumns: (keyof T | (string & {}))[];
  protected isRowDisabledFn?: (row: T) => boolean = (_) => false;

  private cdr = inject(ChangeDetectorRef);

  // Abstract method for custom comparison logic
  protected abstract getSelectionComparator(): (a: T, b: T) => boolean;

  // ControlValueAccessor implementation
  writeValue(value: T[]): void {
    this.selection.clear();
    if (value?.length) {
      this.selection.select(...value);
    }
  }

  registerOnChange(fn: (value: T[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  ngOnInit() {
    // Always include 'select' as first column if not present
    if (!this.displayedColumns.includes('select')) {
      this.displayedColumns = ['select', ...this.displayedColumns];
    }

    this.selection.changed.subscribe(() => {
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
