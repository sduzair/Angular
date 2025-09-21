import { ChangeDetectionStrategy, Component, forwardRef } from "@angular/core";
import { AccountNumber } from "../aml-transaction-search.service";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { AbstractSelectableTableComponent } from "../abstract-selectable-table/abstract-selectable-table.component";
import { CommonModule } from "@angular/common";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatTableModule } from "@angular/material/table";

@Component({
  selector: "app-account-number-selectable-table",
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
            [indeterminate]="selection.hasValue() && !isAllSelected()"
          >
          </mat-checkbox>
        </th>
        <td mat-cell *matCellDef="let row">
          <mat-checkbox
            [disabled]="isRowDisabled(row)"
            (click)="$event.stopPropagation()"
            (change)="$event ? toggleRow(row) : null"
            [checked]="selection.isSelected(row)"
          >
          </mat-checkbox>
        </td>
      </ng-container>

      <!-- Value Column -->
      <ng-container matColumnDef="value">
        <th mat-header-cell *matHeaderCellDef>Account No</th>
        <td mat-cell *matCellDef="let element">
          <span *ngIf="!dataSourceLoadingState">
            {{ element.value }}
          </span>
          <span *ngIf="dataSourceLoadingState" class="sk skw-6 skh-2"></span>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr
        mat-row
        *matRowDef="let row; columns: displayedColumns"
        [class.disabled-row]="disabled"
      ></tr>
    </table>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AccountNumberSelectableTableComponent),
      multi: true,
    },
  ],
  styleUrl: "./account-number-selectable-table.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNumberSelectableTableComponent
  extends AbstractSelectableTableComponent<AccountNumber>
  implements ControlValueAccessor
{
  protected override displayedColumns: Array<
    keyof AccountNumber | (string & {})
  > = ["select", "value"];

  protected override getSelectionComparator(): (
    a: AccountNumber,
    b: AccountNumber,
  ) => boolean {
    return (a, b) => a.value === b.value;
  }
}
