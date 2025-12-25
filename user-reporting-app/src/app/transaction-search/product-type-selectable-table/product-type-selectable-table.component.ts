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
import { TransactionSearchService } from '../transaction-search.service';

@Component({
  selector: 'app-product-type-selectable-table',
  imports: [MatCheckboxModule, MatTableModule],
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

      <!-- Value Column -->
      <ng-container matColumnDef="value">
        <th mat-header-cell *matHeaderCellDef>Product Type</th>
        <td mat-cell *matCellDef="let element">
          @if (!isLoading) {
            <span>
              {{ element.value }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-12 skh-2"></span>
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
      useExisting: forwardRef(() => ProductTypeSelectableTableComponent),
      multi: true,
    },
  ],
  styleUrl: './product-type-selectable-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTypeSelectableTableComponent<T extends { value: string }>
  extends AbstractSelectableTableComponent<T>
  implements ControlValueAccessor
{
  get data() {
    return TransactionSearchService.getProductInfo().map((prod) => ({
      value: prod.productDescription,
    })) as T[];
  }

  @Input()
  set data(value: T[]) {
    this.dataSource.data = value;
  }

  protected override displayedColumns: (keyof T | (string & {}))[] = [
    'select',
    'value',
  ];

  protected override getSelectionComparator(): (a: T, b: T) => boolean {
    return (a, b) => a.value === b.value;
  }
}
