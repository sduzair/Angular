import { ChangeDetectionStrategy, Component, forwardRef } from '@angular/core';
import { ProductType } from '../transaction-search.component';

import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { AbstractSelectableTableComponent } from '../abstract-selectable-table/abstract-selectable-table.component';
import { SourceRefreshSelectableTableComponent } from '../source-refresh-selectable-table/source-refresh-selectable-table.component';

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
          @if (!dataSourceLoadingState) {
            <span>
              {{ element.value }}
            </span>
          }
          @if (dataSourceLoadingState) {
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
export class ProductTypeSelectableTableComponent
  extends AbstractSelectableTableComponent<ProductType>
  implements ControlValueAccessor
{
  protected override displayedColumns: (keyof ProductType | (string & {}))[] = [
    'select',
    'value',
  ];

  protected override getSelectionComparator(): (
    a: ProductType,
    b: ProductType,
  ) => boolean {
    return (a, b) => a.value === b.value;
  }
}
