import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  Input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Observable } from 'rxjs';
import { AbstractSelectableTableComponent } from '../abstract-selectable-table/abstract-selectable-table.component';

@Component({
  selector: 'app-source-refresh-selectable-table',
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatIconModule,
  ],
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
            <span class="sk skw-4 skh-2"></span>
          }
        </td>
      </ng-container>

      <!-- Refresh Time Column -->
      <ng-container matColumnDef="refresh">
        <th mat-header-cell *matHeaderCellDef>Last Refresh</th>
        <td mat-cell *matCellDef="let element">
          @if (!isLoading) {
            <span class="text-nowrap">
              {{ element.refresh | date: 'yyyy-MM-dd' }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-4 skh-2"></span>
          }
        </td>
      </ng-container>

      <!-- Loading Status Column -->
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let element">
          @let loading = isLoadingSearch$ | async;
          @if (
            loading !== null &&
            loading === 'loading' &&
            selection.isSelected(element)
          ) {
            <!-- Loading spinner -->
            <div class="status-indicator">
              <mat-spinner [diameter]="20"></mat-spinner>
            </div>
          }
          @if (
            loading !== null &&
            loading === 'success' &&
            selection.isSelected(element)
          ) {
            <!-- Ready icon -->
            <div class="status-indicator">
              <mat-icon class="status-icon text-success">task_alt</mat-icon>
            </div>
          }
          @if (
            loading !== null &&
            loading === 'fail' &&
            selection.isSelected(element)
          ) {
            <!-- Error icon -->
            <div class="status-indicator">
              <mat-icon class="status-icon text-danger">error_outline</mat-icon>
            </div>
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
    | 'select'
    | 'status'
  )[] = ['select', 'sourceSys', 'refresh', 'status'];

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

  @Input({ required: true }) isLoadingSearch$!: Observable<
    'loading' | 'success' | 'fail' | null
  >;
}

export interface SourceSysRefreshTimeData {
  sourceSys: string;
  refresh?: string | Date | null;
  isDisabled?: boolean | null;
}
