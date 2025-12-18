import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { MatChip } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ResolveFn, RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { CaseRecordStore } from './case-record.store';

@Component({
  selector: 'app-aml',
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatChip,
    MatProgressSpinner,
    MatIcon,
  ],

  template: `
    <div class="container-fluid px-0">
      <div class="row row-cols-1 mx-0">
        <mat-toolbar class="col">
          <mat-toolbar-row class="px-0 header-toolbar-row">
            <h1>-- TITLE HERE --</h1>
            <div class="flex-fill"></div>
            <mat-chip selected="true" class="last-updated-chip">
              @if (savingStatus$ | async) {
                <mat-progress-spinner
                  diameter="20"
                  mode="indeterminate"
                  class="last-updated-chip-spinner"></mat-progress-spinner>
              } @else {
                <mat-icon class="mat-accent last-updated-chip-spinner"
                  >update</mat-icon
                >
              }
              Last Updated:
              {{ lastUpdated$ | async | date: 'short' }}
            </mat-chip>
          </mat-toolbar-row>
        </mat-toolbar>
      </div>
      <div class="row mx-0">
        <div class="col">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styleUrl: './aml.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmlComponent {
  @Input()
  lastUpdated$!: Observable<string>;

  @Input()
  savingStatus$!: Observable<boolean>;
}

export const lastUpdatedResolver: ResolveFn<Observable<string>> = async (
  _route,
  _state,
) => {
  return inject(CaseRecordStore).lastUpdated$;
};

export const savingStatusResolver: ResolveFn<Observable<boolean>> = async (
  _route,
  _state,
) => {
  return inject(CaseRecordStore).isSaving$;
};
