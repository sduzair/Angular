import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  Input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AbstractSelectableTableComponent } from '../abstract-selectable-table/abstract-selectable-table.component';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-account-number-selectable-table',
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

      <!-- Transit Column -->
      <ng-container matColumnDef="transit">
        <th mat-header-cell *matHeaderCellDef>Transit</th>
        <td mat-cell *matCellDef="let row">
          @if (!isLoading) {
            <span>
              {{ row.transit }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-4 skh-2"></span>
          }
        </td>
      </ng-container>

      <!-- Account Column -->
      <ng-container matColumnDef="account">
        <th mat-header-cell *matHeaderCellDef>Account No</th>
        <td mat-cell *matCellDef="let row">
          @if (!isLoading) {
            <span>
              {{ row.account }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-6 skh-2"></span>
          }
        </td>
      </ng-container>

      <!-- Currency Column -->
      <ng-container matColumnDef="accountCurrency">
        <th mat-header-cell *matHeaderCellDef>Currency</th>
        <td mat-cell *matCellDef="let row">
          @if (!isLoading) {
            <span>
              {{ row.accountCurrency }}
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
      useExisting: forwardRef(() => AccountNumberSelectableTableComponent),
      multi: true,
    },
  ],
  styleUrl: './account-number-selectable-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNumberSelectableTableComponent
  extends AbstractSelectableTableComponent<AccountNumberData>
  implements ControlValueAccessor
{
  get data() {
    return Array.from({ length: 5 }, () => ({
      transit: '',
      account: '',
      currency: '',
    }));
  }

  @Input({ required: true })
  set data(value: AccountNumberData[]) {
    this.dataSource.data = value;
  }
  protected override displayedColumns: (keyof AccountNumberData | 'select')[] =
    ['select', 'transit', 'account', 'accountCurrency'];

  protected override trackingProps: ('transit' | 'account')[] = [
    'transit',
    'account',
  ];

  protected override getSelectionComparator(): (
    a: AccountNumberData,
    b: AccountNumberData,
  ) => boolean {
    return (a, b) => a.transit === b.transit && a.account === b.account;
  }
}

export interface AccountNumberData {
  transit: string;
  account: string;
  accountCurrency?: string | null;
}
