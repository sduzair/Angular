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

      <!-- Party key Column -->
      <ng-container matColumnDef="partyKey">
        <th mat-header-cell *matHeaderCellDef>Party Key</th>
        <td mat-cell *matCellDef="let element">
          @if (!isLoading) {
            <span>
              {{ element.partyKey }}
            </span>
          }
          @if (isLoading) {
            <span class="sk skw-6 skh-2"></span>
          }
        </td>
      </ng-container>

      <!-- Name Column -->
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let element">
          @if (!isLoading) {
            <span>
              {{ element.name }}
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
  extends AbstractSelectableTableComponent<PartyKeyData>
  implements ControlValueAccessor
{
  get data() {
    return Array.from({ length: 5 }, () => ({
      partyKey: '',
      name: '',
    })) satisfies PartyKeyData[];
  }

  @Input({ required: true })
  set data(value: PartyKeyData[]) {
    this.dataSource.data = value;
  }

  protected override displayedColumns: (keyof PartyKeyData | 'select')[] = [
    'select',
    'partyKey',
    'name',
  ];

  protected override trackingProps: ('name' | 'partyKey')[] = ['partyKey'];

  protected override getSelectionComparator(): (
    a: PartyKeyData,
    b: PartyKeyData,
  ) => boolean {
    return (a, b) => a.partyKey === b.partyKey;
  }
}

export interface PartyKeyData {
  partyKey: string;
  name?: string;
}
