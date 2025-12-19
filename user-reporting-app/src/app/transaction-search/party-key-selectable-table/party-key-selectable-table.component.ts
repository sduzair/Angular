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
import { PartyKey } from '../transaction-search.service';

@Component({
  selector: 'app-party-key-selectable-table',
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
        <th mat-header-cell *matHeaderCellDef>Party Key</th>
        <td mat-cell *matCellDef="let element">
          @if (!isLoading) {
            <span>
              {{ element.value }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-6 skh-2"></span>
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
      useExisting: forwardRef(() => PartyKeySelectableTableComponent),
      multi: true,
    },
  ],
  styleUrl: './party-key-selectable-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartyKeySelectableTableComponent
  extends AbstractSelectableTableComponent<PartyKey>
  implements ControlValueAccessor
{
  get data() {
    return Array.from({ length: 5 }, () => ({
      value: '',
    }));
  }

  @Input({ required: true })
  set data(value: PartyKey[]) {
    this.dataSource.data = value;
  }

  protected override displayedColumns: (keyof PartyKey | (string & {}))[] = [
    'select',
    'value',
  ];

  protected override getSelectionComparator(): (
    a: PartyKey,
    b: PartyKey,
  ) => boolean {
    return (a, b) => a.value === b.value;
  }
}
