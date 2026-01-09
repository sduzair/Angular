import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  Input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { AbstractSelectableTableComponent } from '../abstract-selectable-table/abstract-selectable-table.component';

@Component({
  selector: 'app-source-refresh-selectable-table',
  imports: [CommonModule, MatCheckboxModule, MatTableModule],
  template: `
    <table mat-table [dataSource]="dataSource">
      <!-- Selection Column -->
      <ng-container matColumnDef="select">
        <th mat-header-cell *matHeaderCellDef>
          <mat-checkbox
            [disabled]="disabled"
            (change)="$event ? toggleAllRows() : null"
            [checked]="selection.hasValue() && isAllSelected()"
            [indeterminate]="selection.hasValue() && !isAllSelected()">
          </mat-checkbox>
        </th>
        <td mat-cell *matCellDef="let row">
          <mat-checkbox
            [disabled]="isRowDisabled(row)"
            (click)="$event.stopPropagation()"
            (change)="$event ? toggleRow(row) : null"
            [checked]="selection.isSelected(row)">
          </mat-checkbox>
        </td>
      </ng-container>

      <!-- System Column -->
      <ng-container matColumnDef="sourceSys">
        <th mat-header-cell *matHeaderCellDef>System</th>
        <td mat-cell *matCellDef="let element">
          @if (!isLoading) {
            <span>
              {{ element.sourceSys }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-6 skh-2"></span>
          }
        </td>
      </ng-container>

      <!-- Refresh Time Column -->
      <ng-container matColumnDef="refresh">
        <th mat-header-cell *matHeaderCellDef>Last Refresh</th>
        <td mat-cell *matCellDef="let element">
          @if (!isLoading) {
            <span>
              {{ element.refresh | date: 'yyyy-MM-dd' }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-4 skh-2"></span>
          }
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr
        mat-row
        *matRowDef="let row; columns: displayedColumns"
        [class.disabled-row]="disabled"></tr>
    </table>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SourceRefreshSelectableTableComponent),
      multi: true,
    },
  ],
  styleUrl: './source-refresh-selectable-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceRefreshSelectableTableComponent
  extends AbstractSelectableTableComponent<SourceSysRefreshTimeData>
  implements ControlValueAccessor
{
  // initialize with placeholder
  get data() {
    return Array.from({ length: 20 }, () => ({
      sourceSys: '',
      refresh: '',
      isDisabled: false,
    }));
  }

  @Input({ required: true })
  set data(value: SourceSysRefreshTimeData[]) {
    this.dataSource.data = value;
  }

  protected override displayedColumns: (
    | keyof SourceSysRefreshTimeData
    | (string & {})
  )[] = ['select', 'sourceSys', 'refresh'];

  protected override trackingProps: (keyof SourceSysRefreshTimeData)[] = [
    'sourceSys',
  ];

  protected override getSelectionComparator(): (
    a: SourceSysRefreshTimeData,
    b: SourceSysRefreshTimeData,
  ) => boolean {
    return (a, b) => a.sourceSys == b.sourceSys;
  }

  protected override isRowDisabledFn: (
    row: SourceSysRefreshTimeData,
  ) => boolean = (row: SourceSysRefreshTimeData): boolean => {
    return row.isDisabled || false;
  };
}

export interface SourceSysRefreshTimeData {
  sourceSys: string;
  refresh?: string | Date | null;
  isDisabled?: boolean | null;
}
