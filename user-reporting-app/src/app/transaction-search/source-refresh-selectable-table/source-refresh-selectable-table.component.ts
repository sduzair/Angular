import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { AbstractSelectableTableComponent } from "../abstract-selectable-table/abstract-selectable-table.component";
import { CommonModule } from "@angular/common";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatTableModule } from "@angular/material/table";
import {
  SourceSys,
  SourceSysRefreshTime,
} from "../aml-transaction-search.service";

@Component({
  selector: "app-source-refresh-selectable-table",
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

      <!-- System Column -->
      <ng-container matColumnDef="system">
        <th mat-header-cell *matHeaderCellDef>System</th>
        <td mat-cell *matCellDef="let element">
          <span *ngIf="!dataSourceLoadingState">
            {{ element.value }}
          </span>
          <span
            *ngIf="dataSourceLoadingState"
            class="sk skw-6 skh-2"
          ></span>
        </td>
      </ng-container>

      <!-- Refresh Time Column -->
      <ng-container matColumnDef="refresh">
        <th mat-header-cell *matHeaderCellDef>Last Refresh</th>
        <td mat-cell *matCellDef="let element">
          <span *ngIf="!dataSourceLoadingState">
            {{ element.refresh | date : "yyyy-MM-dd" }}
          </span>
          <span
            *ngIf="dataSourceLoadingState"
            class="sk skw-4 skh-2"
          ></span>
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
      useExisting: forwardRef(() => SourceRefreshSelectableTableComponent),
      multi: true,
    },
  ],
  styleUrl: "./source-refresh-selectable-table.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceRefreshSelectableTableComponent
  extends AbstractSelectableTableComponent<SourceSysRefreshTime>
  implements ControlValueAccessor
{
  protected override displayedColumns: Array<
    keyof SourceSysRefreshTime | (string & {})
  > = ["select", "system", "refresh"];

  protected override getSelectionComparator(): (
    a: SourceSysRefreshTime,
    b: SourceSysRefreshTime,
  ) => boolean {
    return (a, b) => a.value === b.value;
  }
  protected override isRowDisabledFn: (row: SourceSysRefreshTime) => boolean = (
    row: SourceSysRefreshTime,
  ): boolean => {
    return row.isDisabled || false;
  };
}
