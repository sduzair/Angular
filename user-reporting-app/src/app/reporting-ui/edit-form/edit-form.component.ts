import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { ErrorStateMatcher, MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormField } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { isEqualWith } from 'lodash-es';
import { debounceTime } from 'rxjs';
import {
  combineLatestWith,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';
import {
  CaseRecordStore,
  createTransactionEntityEnricher,
  StrTransactionWithChangeLogs,
} from '../../aml/case-record.store';
import * as ChangeLog from '../../change-logging/change-log';
import { getFormErrors } from '../../form-helpers';
import { SnackbarQueueService } from '../../snackbar-queue.service';
import { getEntityFullName } from '../../transaction-view/transform-to-str-transaction/entity-gen.service';
import {
  ConductorNpdData,
  StrTransaction,
  StrTxnFlowOfFunds,
} from '../reporting-ui-table/reporting-ui-table.component';
import { AuditableFormComponent } from './auditable-form.component';
import { ClearFieldDirective } from './clear-field.directive';
import { ControlToggleReadonlyDirective } from './control-toggle-readonly.directive';
import { ControlToggleDirective } from './control-toggle.directive';
import { DatepickerReadonlyDirective } from './datepicker-readonly.directive';
import { EntitySyncDirective } from './entity-sync.directive';
import { FormOptions } from './form-options.service';
import { MarkAsClearedDirective } from './mark-as-cleared.directive';
import { ToggleEditFieldDirective } from './toggle-edit-field.directive';
import { TransactionDateDirective } from './transaction-date.directive';
import { TransactionDetailsPanelComponent } from './transaction-details-panel/transaction-details-panel.component';
import { TransactionTimeDirective } from './transaction-time.directive';
import { ValidateOnParentChangesDirective } from './validate-on-parent-changes.directive';

export class PreemptiveErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    _: FormGroupDirective | NgForm | null,
  ): boolean {
    // const isSubmitted = form?.submitted;
    return !!control?.invalid;
  }
}

@Component({
  selector: 'app-edit-form',
  imports: [
    CommonModule,
    MatButtonModule,
    MatExpansionModule,
    TransactionDetailsPanelComponent,
    ReactiveFormsModule,
    TransactionDateDirective,
    TransactionTimeDirective,
    ControlToggleDirective,
    ToggleEditFieldDirective,
    MarkAsClearedDirective,
    ClearFieldDirective,
    MatFormField,
    MatToolbarModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTabsModule,
    MatCardModule,
    MatInputModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatDividerModule,
    MatOptionModule,
    MatSelectModule,
    MatBadgeModule,
    ValidateOnParentChangesDirective,
    EntitySyncDirective,
    DatepickerReadonlyDirective,
    ControlToggleReadonlyDirective,
    MatTooltip,
  ],
  template: `
    @let editForm = editForm$ | async;
    <div class="container px-0 mb-5">
      <mat-toolbar class="justify-content-end px-0 gap-4 toolbar">
        <button
          type="button"
          mat-icon-button
          (click)="navigateBack()"
          aria-label="Go back">
          <mat-icon>arrow_back</mat-icon>
        </button>

        @let editType = editType$ | async;

        @if (editType && editType.type === 'BULK_SAVE') {
          <div class="d-flex align-items-center gap-2">
            <mat-chip
              color="accent"
              class="d-flex align-items-center selected-chip">
              <mat-icon>checklist</mat-icon>
              <span class="fw-bold">{{ editType.payload.length }}</span>
              <span class="text-muted">
                transaction(s) selected for bulk edit
              </span>
            </mat-chip>
          </div>
        }

        <div class="flex-fill"></div>

        @if (isAudit) {
          @let auditLastUpdatedBy = (auditLastUpdatedBy$ | async) ?? '';
          @let auditLastUpdated = (auditLastUpdated$ | async) ?? '';

          <div
            class="d-flex align-items-center gap-3 text-muted fs-6"
            [class.invisible]="!auditLastUpdatedBy || !auditLastUpdated">
            <span class="d-flex align-items-center gap-1">
              <span class="fw-medium text-secondary">Updated By:</span>
              <mat-icon
                color="accent"
                style="font-size: 20px; height: 20px; width: 20px;">
                person
              </mat-icon>
              <span class="text-dark">{{ auditLastUpdatedBy }}</span>
            </span>

            <span class="vr"></span>

            <span class="d-flex align-items-center gap-1">
              <span class="fw-medium text-secondary"> Last Updated: </span>
              <mat-icon
                color="accent"
                style="font-size: 20px; height: 20px; width: 20px;">
                schedule
              </mat-icon>
              <span class="text-dark">
                {{ auditLastUpdated | date: 'short' }}
              </span>
            </span>

            <span class="vr"></span>
          </div>
        }

        @if (!isAudit) {
          <button
            mat-flat-button
            color="primary"
            type="submit"
            form="edit-form"
            [disabled]="
              (editFormHasChanges$ | async) === false ||
              (caseRecordStore.qIsSaving$ | async)
            "
            [matBadge]="selectedTransactionsForBulkEditLength"
            [matBadgeHidden]="!isBulkEdit">
            @if (caseRecordStore.qIsSaving$ | async) {
              Saving...
            } @else {
              Save
            }
          </button>
        }

        @if (isAudit) {
          <mat-form-field class="audit-form-btn" subscriptSizing="dynamic">
            <mat-select
              placeholder="Version"
              [formControl]="auditVersionControl">
              @for (
                option of auditVersionOptions$ | async;
                track option.value
              ) {
                <mat-option [value]="option.value">
                  {{ option.label }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      </mat-toolbar>

      @if (isSingleEdit || isAudit) {
        @if (editType) {
          <app-transaction-details-panel
            [singleStrTransaction]="$any(editType.payload)" />
        }
      }
    </div>
    <div class="container form-field-density px-0">
      @if (editForm) {
        <form
          [formGroup]="editForm"
          (ngSubmit)="onSave()"
          [class.bulk-edit-form]="isBulkEdit"
          [class.audit-form]="isAudit"
          class="edit-form"
          data-testid="edit-form"
          id="edit-form">
          <!-- Main Tabs -->
          <mat-tab-group preserveContent class="gap-3">
            <!-- Transaction Details Tab -->
            <mat-tab>
              <ng-template mat-tab-label>
                <h3 class="mb-0">Transaction Details</h3>
                <mat-icon
                  class="error-icon mx-1"
                  [class.error-icon-show]="showTransactionDetailsErrorIcon"
                  color="error"
                  >error_outline</mat-icon
                >
                <!-- Change indicator -->
                @if (isTransactionDetailsChanged()) {
                  <mat-icon
                    matIconPrefix
                    class="audit-icon text-primary"
                    matTooltip="Field was modified">
                    edit
                  </mat-icon>
                }
              </ng-template>
              <div>
                <mat-card class="transaction-details-card m-1 mt-3">
                  <mat-card-header>
                    <mat-card-title>Transaction Information</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="row row-cols-1 row-cols-md-2">
                      <mat-form-field class="col-xl-4" data-testid="dateOfTxn">
                        <mat-label>Date of Transaction</mat-label>
                        <input
                          matInput
                          formControlName="dateOfTxn"
                          [matDatepicker]="dateOfTxnPicker"
                          [max]="maxDate"
                          appTransactionDate />
                        <mat-datepicker-toggle
                          matIconSuffix
                          [for]="dateOfTxnPicker"></mat-datepicker-toggle>
                        <mat-datepicker #dateOfTxnPicker />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/dateOfTxn')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsCleared
                          mat-icon-button
                          matSuffix>
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appToggleEditField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                      <mat-form-field class="col-xl-4" data-testid="timeOfTxn">
                        <mat-label>Time of Transaction</mat-label>
                        <input
                          matInput
                          formControlName="timeOfTxn"
                          type="time"
                          step="1"
                          appTransactionTime />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/timeOfTxn')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsCleared
                          mat-icon-button
                          matSuffix>
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appToggleEditField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                      <div class="col-xl-4 d-flex gap-2">
                        <mat-checkbox
                          formControlName="hasPostingDate"
                          class="col-auto"
                          data-testid="hasPostingDate">
                          Has Posting Date?
                        </mat-checkbox>
                        <!-- Change indicator for checkbox -->
                        @if (isFormFieldChanged('/hasPostingDate')) {
                          <mat-icon
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appToggleEditField="hasPostingDate"
                          mat-icon-button
                          matSuffix
                          class="col-auto">
                          <mat-icon>edit</mat-icon>
                        </button>
                      </div>
                    </div>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3">
                      <mat-form-field class="col" data-testid="dateOfPosting">
                        <mat-label>Date of Posting</mat-label>
                        <input
                          matInput
                          formControlName="dateOfPosting"
                          [matDatepicker]="dateOfPostingPicker"
                          [max]="maxDate"
                          appTransactionDate
                          appToggleControl="hasPostingDate" />
                        <mat-datepicker-toggle
                          matIconSuffix
                          [for]="dateOfPostingPicker"></mat-datepicker-toggle>
                        <mat-datepicker #dateOfPostingPicker />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/dateOfPosting')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                      <mat-form-field class="col" data-testid="timeOfPosting">
                        <mat-label>Time of Posting</mat-label>
                        <input
                          matInput
                          formControlName="timeOfPosting"
                          type="time"
                          step="1"
                          appTransactionTime
                          appToggleControl="hasPostingDate" />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/timeOfPosting')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                    </div>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3">
                      <div
                        class="col"
                        [class.d-none]="!isFormOptionsLoading"
                        [class.d-flex]="isFormOptionsLoading">
                        <span
                          class="sk skw-6 skh-7 col-auto flex-grow-1"
                          [class.d-none]="!isFormOptionsLoading"
                          [class.d-inline-block]="isFormOptionsLoading"></span>
                      </div>
                      <mat-form-field
                        class="col"
                        data-testid="methodOfTxn"
                        [class.d-none]="isFormOptionsLoading">
                        <mat-label>Method of Transaction</mat-label>
                        <mat-select formControlName="methodOfTxn">
                          @for (
                            opt of (formOptions$ | async)?.methodOfTxn
                              | keyvalue;
                            track opt.key
                          ) {
                            <mat-option [value]="opt.key">
                              {{ opt.key }}
                            </mat-option>
                          }
                        </mat-select>
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/methodOfTxn')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsCleared
                          mat-icon-button
                          matSuffix>
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appToggleEditField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        data-testid="methodOfTxnOther">
                        <mat-label>Other Method of Transaction</mat-label>
                        <input
                          matInput
                          formControlName="methodOfTxnOther"
                          appToggleControl="methodOfTxn"
                          appToggleControlValue="Other" />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/methodOfTxnOther')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsCleared
                          mat-icon-button
                          matSuffix>
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                    </div>
                    <div class="row row-cols-1">
                      <div class="col-12 col-xl-4 d-flex gap-2">
                        <mat-checkbox
                          formControlName="wasTxnAttempted"
                          class="col-auto"
                          data-testid="wasTxnAttempted">
                          Was Transaction Attempted?
                        </mat-checkbox>
                        <!-- Change indicator for checkbox -->
                        @if (isFormFieldChanged('/wasTxnAttempted')) {
                          <mat-icon
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appToggleEditField="wasTxnAttempted"
                          mat-icon-button
                          matSuffix
                          class="col-auto">
                          <mat-icon>edit</mat-icon>
                        </button>
                      </div>
                      <mat-form-field
                        class="col-12 col-xl-8"
                        data-testid="wasTxnAttemptedReason">
                        <mat-label
                          >Reason transaction was not completed</mat-label
                        >
                        <input
                          matInput
                          formControlName="wasTxnAttemptedReason"
                          appToggleControl="wasTxnAttempted" />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/wasTxnAttemptedReason')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                    </div>
                    <div class="row row-cols-md-3">
                      <mat-form-field
                        class="col-md-8"
                        data-testid="purposeOfTxn">
                        <mat-label>Purpose of Transaction</mat-label>
                        <input matInput formControlName="purposeOfTxn" />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/purposeOfTxn')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsCleared
                          mat-icon-button
                          matSuffix>
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appToggleEditField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        <mat-error>This field is required</mat-error>
                      </mat-form-field>
                    </div>
                    <div class="row row-cols-md-3">
                      <mat-form-field
                        class="col-md-4"
                        data-testid="reportingEntityLocationNo">
                        <mat-label>Reporting Entity Location</mat-label>
                        <input
                          matInput
                          formControlName="reportingEntityLocationNo" />
                        <!-- Change indicator -->
                        @if (isFormFieldChanged('/reportingEntityLocationNo')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsCleared
                          mat-icon-button
                          matSuffix>
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appToggleEditField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix>
                          <mat-icon>clear</mat-icon>
                        </button>
                        @if (
                          editForm.controls.reportingEntityLocationNo.hasError(
                            'required'
                          )
                        ) {
                          <mat-error>This field is required</mat-error>
                        } @else if (
                          editForm.controls.reportingEntityLocationNo.invalid
                        ) {
                          <mat-error>This field is invalid</mat-error>
                        }
                      </mat-form-field>
                      <mat-form-field
                        class="col-md-8"
                        data-testid="reportingEntityTxnRefNo">
                        <mat-label>Reporting Entity Ref No</mat-label>
                        <input
                          matInput
                          formControlName="reportingEntityTxnRefNo"
                          readonly="true" />
                        <!-- Change indicator (even for readonly fields) -->
                        @if (isFormFieldChanged('/reportingEntityTxnRefNo')) {
                          <mat-icon
                            matIconPrefix
                            class="text-primary"
                            matTooltip="Field was modified">
                            edit
                          </mat-icon>
                        }
                      </mat-form-field>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </mat-tab>
            <!-- Starting Actions Tab -->
            <mat-tab>
              <ng-template mat-tab-label>
                <h3 class="mb-0">Starting Actions</h3>
                <mat-icon
                  class="error-icon mx-1"
                  [class.error-icon-show]="showStartingActionsErrorIcon"
                  color="error"
                  >error_outline</mat-icon
                >
                <!-- Change indicator -->
                @if (isArrayFieldChanged('/startingActions')) {
                  <mat-icon
                    matIconPrefix
                    class="audit-icon text-primary"
                    matTooltip="Field was modified">
                    edit
                  </mat-icon>
                }
              </ng-template>
              <div class="d-flex flex-column align-items-end gap-3 mt-3">
                <button
                  type="button"
                  mat-raised-button
                  color="primary"
                  (click)="addStartingAction()"
                  class="mx-1"
                  [class.invisible]="this.isAudit"
                  [attr.data-testid]="'startingActions-add'">
                  <mat-icon>add</mat-icon> Add Starting Action
                </button>
                <div
                  formArrayName="startingActions"
                  class="w-100 d-flex flex-column gap-3 mb-5">
                  @for (
                    saAction of editForm.controls.startingActions.controls;
                    track $index;
                    let saIndex = $index
                  ) {
                    <div [formGroupName]="saIndex">
                      <mat-expansion-panel [expanded]="true">
                        <mat-expansion-panel-header class="my-3">
                          <mat-panel-title
                            class="d-flex align-items-center gap-2">
                            <h1>Starting Action #{{ saIndex + 1 }}</h1>
                            <span class="mat-h1 mb-0 text-break">
                              ({{
                                saAction.controls.amount.value ?? 0
                                  | currency
                                    : saAction.controls.currency.value ?? ''
                              }})
                            </span>
                            <button
                              type="button"
                              mat-icon-button
                              [class.invisible]="this.isAudit"
                              [attr.data-testid]="
                                'startingActions-' + saIndex + '-remove'
                              "
                              (click)="removeStartingAction(saIndex)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </mat-panel-title>
                        </mat-expansion-panel-header>
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-directionOfSA'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Direction</mat-label>
                            <mat-select formControlName="directionOfSA">
                              @for (
                                opt of (formOptions$ | async)?.directionOfSA
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/directionOfSA'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-typeOfFunds'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Type of Funds</mat-label>
                            <mat-select formControlName="typeOfFunds">
                              @for (
                                opt of (formOptions$ | async)?.typeOfFunds
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/typeOfFunds'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            @if (
                              saAction.controls.typeOfFunds.hasError(
                                'missingCheque'
                              )
                            ) {
                              <mat-error>
                                {{
                                  saAction.controls.typeOfFunds.errors![
                                    'missingCheque'
                                  ]
                                }}
                              </mat-error>
                            } @else {
                              <mat-error>This field is required</mat-error>
                            }
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-typeOfFundsOther'
                            ">
                            <mat-label>Other Type of Funds</mat-label>
                            <input
                              matInput
                              formControlName="typeOfFundsOther"
                              [appToggleControl]="
                                'startingActions.' + saIndex + '.typeOfFunds'
                              "
                              appToggleControlValue="Other" />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' +
                                  saIndex +
                                  '/typeOfFundsOther'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Amount Section -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-amount'
                            ">
                            <mat-label>Amount</mat-label>
                            <input
                              matInput
                              type="number"
                              formControlName="amount" />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/amount'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-currency'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Currency</mat-label>
                            <mat-select formControlName="currency">
                              @for (
                                opt of (formOptions$ | async)?.amountCurrency
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/currency'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Information -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-fiuNo'
                            ">
                            <mat-label>FIU Number</mat-label>
                            <input
                              matInput
                              formControlName="fiuNo"
                              appValidateOnParentChanges />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/fiuNo'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            @if (
                              saAction.controls.fiuNo.hasError(
                                'missingAccountInfo'
                              )
                            ) {
                              <mat-error>
                                {{
                                  saAction.controls.fiuNo.errors![
                                    'missingAccountInfo'
                                  ]
                                }}
                              </mat-error>
                            } @else if (
                              saAction.controls.fiuNo.hasError('invalidFiu')
                            ) {
                              <mat-error>
                                {{
                                  saAction.controls.fiuNo.errors!['invalidFiu']
                                }}
                              </mat-error>
                            }
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-branch'
                            ">
                            <mat-label>Branch</mat-label>
                            <input matInput formControlName="branch" />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/branch'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-account'
                            ">
                            <mat-label>Account Number</mat-label>
                            <input matInput formControlName="account" />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/account'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Information -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-accountType'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Account Type</mat-label>
                            <mat-select formControlName="accountType">
                              @for (
                                opt of (formOptions$ | async)?.accountType
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/accountType'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-accountTypeOther'
                            ">
                            <mat-label>Other Account Type</mat-label>
                            <input
                              matInput
                              formControlName="accountTypeOther"
                              [appToggleControl]="
                                'startingActions.' + saIndex + '.accountType'
                              "
                              appToggleControlValue="Other" />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' +
                                  saIndex +
                                  '/accountTypeOther'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-accountCurrency'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Account Currency</mat-label>
                            <mat-select formControlName="accountCurrency">
                              @for (
                                opt of (formOptions$ | async)?.accountCurrency
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' +
                                  saIndex +
                                  '/accountCurrency'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-accountStatus'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Account Status</mat-label>
                            <mat-select formControlName="accountStatus">
                              @for (
                                opt of (formOptions$ | async)?.accountStatus
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/accountStatus'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Open/Close -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-accountOpen'
                            ">
                            <mat-label>Account Open Date</mat-label>
                            <input
                              matInput
                              formControlName="accountOpen"
                              [matDatepicker]="accountOpenPicker"
                              [max]="maxDate"
                              appTransactionDate />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="accountOpenPicker"></mat-datepicker-toggle>
                            <mat-datepicker #accountOpenPicker />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/accountOpen'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-accountClose'
                            ">
                            <mat-label>Account Close Date</mat-label>
                            <input
                              matInput
                              formControlName="accountClose"
                              [matDatepicker]="accountClosePicker"
                              [max]="maxDate"
                              appTransactionDate
                              appValidateOnParentChanges />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="
                                accountClosePicker
                              "></mat-datepicker-toggle>
                            <mat-datepicker #accountClosePicker />
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' + saIndex + '/accountClose'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <div class="row">
                          <mat-form-field
                            class="col-12"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-howFundsObtained'
                            ">
                            <mat-label>How Funds Were Obtained</mat-label>
                            <textarea
                              matInput
                              formControlName="howFundsObtained"
                              rows="2"></textarea>
                            <!-- Change indicator icon -->
                            @if (
                              isFormFieldChanged(
                                '/startingActions/' +
                                  saIndex +
                                  '/howFundsObtained'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Holders Section -->
                        <h2 class="d-flex align-items-center gap-2">
                          Account Holders
                          @if (
                            isArrayFieldChanged(
                              '/startingActions/' + saIndex + '/accountHolders'
                            )
                          ) {
                            <mat-icon
                              class="text-primary"
                              matTooltip="Section has changes">
                              edit
                            </mat-icon>
                          }
                        </h2>

                        <div class="row">
                          <mat-checkbox
                            class="col"
                            formControlName="hasAccountHolders"
                            [attr.data-testid]="
                              'startingActions-' +
                              saIndex +
                              '-hasAccountHolders'
                            ">
                            Has account holders?
                          </mat-checkbox>
                          <button
                            [disabled]="!this.isBulkEdit"
                            type="button"
                            appToggleEditField="hasAccountHolders"
                            mat-icon-button
                            matSuffix>
                            <mat-icon>edit</mat-icon>
                          </button>
                        </div>
                        <div
                          formArrayName="accountHolders"
                          class="d-flex flex-column align-items-end gap-3"
                          [appToggleControl]="
                            'startingActions.' + saIndex + '.hasAccountHolders'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="
                            addAccountHolder('startingActions', saIndex)
                          ">
                          @for (
                            holder of saAction.controls.accountHolders.controls;
                            track $index;
                            let holderIndex = $index
                          ) {
                            <div
                              [formGroupName]="holderIndex"
                              appEntitySync
                              class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>
                                      Account Holder #{{ holderIndex + 1 }}
                                    </h3>
                                    <button
                                      type="button"
                                      mat-icon-button
                                      [class.invisible]="this.isAudit"
                                      [attr.data-testid]="
                                        'startingActions-' +
                                        saIndex +
                                        '-accountHolders-' +
                                        holderIndex +
                                        '-remove'
                                      "
                                      (click)="
                                        removeAccountHolder(
                                          'startingActions',
                                          saIndex,
                                          holderIndex
                                        )
                                      ">
                                      <mat-icon>delete</mat-icon>
                                    </button>
                                  </mat-panel-title>
                                </mat-expansion-panel-header>
                                <div class="row row-cols-1 row-cols-md-3">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-linkToSub'
                                    ">
                                    <mat-label>Select Entity</mat-label>
                                    <mat-select formControlName="linkToSub">
                                      @for (
                                        option of entitiesOptions$ | async;
                                        track option.value
                                      ) {
                                        <mat-option [value]="option.value">
                                          {{ option.label }}
                                        </mat-option>
                                      }
                                    </mat-select>
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>

                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenPartyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenPartyKey" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    @if (
                                      holder.controls._hiddenPartyKey.hasError(
                                        'invalidPartyKey'
                                      )
                                    ) {
                                      <mat-error>
                                        {{
                                          holder.controls._hiddenPartyKey
                                            .errors!['invalidPartyKey']
                                        }}
                                      </mat-error>
                                    } @else {
                                      <mat-error>
                                        This field is required
                                      </mat-error>
                                    }
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenSurname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenSurname"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenGivenName'
                                    ">
                                    <mat-label>Given Name</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenGivenName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenOtherOrInitialName'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenOtherOrInitialName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenNameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenNameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                </div>
                              </mat-expansion-panel>
                            </div>
                          }
                          <button
                            type="button"
                            mat-raised-button
                            color="primary"
                            (click)="
                              addAccountHolder('startingActions', saIndex)
                            "
                            [class.invisible]="this.isAudit"
                            [attr.data-testid]="
                              'startingActions-' +
                              saIndex +
                              '-accountHolders-add'
                            ">
                            <mat-icon>add</mat-icon> Add Account Holder
                          </button>
                        </div>
                        <!-- Source of Funds Section -->
                        <h2 class="d-flex align-items-center gap-2">
                          Source of Funds
                          @if (
                            isArrayFieldChanged(
                              '/startingActions/' + saIndex + '/sourceOfFunds'
                            )
                          ) {
                            <mat-icon
                              class="text-primary"
                              matTooltip="Section has changes">
                              edit
                            </mat-icon>
                          }
                        </h2>
                        <div class="row">
                          <mat-checkbox
                            class="col"
                            formControlName="wasSofInfoObtained"
                            [attr.data-testid]="
                              'startingActions-' +
                              saIndex +
                              '-wasSofInfoObtained'
                            ">
                            Was Source of Funds Info Obtained?
                          </mat-checkbox>
                          <button
                            [disabled]="!this.isBulkEdit"
                            type="button"
                            appToggleEditField="wasSofInfoObtained"
                            mat-icon-button
                            matSuffix>
                            <mat-icon>edit</mat-icon>
                          </button>
                        </div>
                        <div
                          formArrayName="sourceOfFunds"
                          class="d-flex flex-column align-items-end gap-3"
                          [appToggleControl]="
                            'startingActions.' + saIndex + '.wasSofInfoObtained'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addSourceOfFunds(saIndex)">
                          @for (
                            source of saAction.controls.sourceOfFunds.controls;
                            track $index;
                            let fundsIndex = $index
                          ) {
                            <div
                              [formGroupName]="fundsIndex"
                              appEntitySync
                              class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>
                                      Source of Funds #{{ fundsIndex + 1 }}
                                    </h3>
                                    <button
                                      type="button"
                                      mat-icon-button
                                      [class.invisible]="this.isAudit"
                                      [attr.data-testid]="
                                        'startingActions-' +
                                        saIndex +
                                        '-sourceOfFunds-' +
                                        fundsIndex +
                                        '-remove'
                                      "
                                      (click)="
                                        removeSourceOfFunds(saIndex, fundsIndex)
                                      ">
                                      <mat-icon>delete</mat-icon>
                                    </button>
                                  </mat-panel-title>
                                </mat-expansion-panel-header>
                                <div class="row row-cols-1 row-cols-md-3">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-linkToSub'
                                    ">
                                    <mat-label>Select Entity</mat-label>
                                    <mat-select formControlName="linkToSub">
                                      @for (
                                        option of entitiesOptions$ | async;
                                        track option.value
                                      ) {
                                        <mat-option [value]="option.value">
                                          {{ option.label }}
                                        </mat-option>
                                      }
                                    </mat-select>
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>

                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-_hiddenPartyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenPartyKey" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    @if (
                                      source.controls._hiddenPartyKey.hasError(
                                        'invalidPartyKey'
                                      )
                                    ) {
                                      <mat-error>
                                        {{
                                          source.controls._hiddenPartyKey
                                            .errors!['invalidPartyKey']
                                        }}
                                      </mat-error>
                                    } @else {
                                      <mat-error>
                                        This field is required
                                      </mat-error>
                                    }
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-_hiddenSurname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenSurname"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-_hiddenGivenName'
                                    ">
                                    <mat-label>Given Name</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenGivenName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-_hiddenOtherOrInitialName'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenOtherOrInitialName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-_hiddenNameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenNameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-accountNumber'
                                    ">
                                    <mat-label>Account Number</mat-label>
                                    <input
                                      matInput
                                      formControlName="accountNumber" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-identifyingNumber'
                                    ">
                                    <mat-label>Identifying Number</mat-label>
                                    <input
                                      matInput
                                      formControlName="identifyingNumber" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                </div>
                              </mat-expansion-panel>
                            </div>
                          }
                          <button
                            type="button"
                            mat-raised-button
                            color="primary"
                            (click)="addSourceOfFunds(saIndex)"
                            [class.invisible]="this.isAudit"
                            [attr.data-testid]="
                              'startingActions-' +
                              saIndex +
                              '-sourceOfFunds-add'
                            ">
                            <mat-icon>add</mat-icon> Add Source of Funds
                          </button>
                        </div>
                        <!-- Conductors Section -->
                        <h2 class="d-flex align-items-center gap-2">
                          Conductors
                          @if (
                            isArrayFieldChanged(
                              '/startingActions/' + saIndex + '/conductors'
                            )
                          ) {
                            <mat-icon
                              class="text-primary"
                              matTooltip="Section has changes">
                              edit
                            </mat-icon>
                          }
                        </h2>
                        <div class="row">
                          <mat-checkbox
                            class="col"
                            formControlName="wasCondInfoObtained"
                            [attr.data-testid]="
                              'startingActions-' +
                              saIndex +
                              '-wasCondInfoObtained'
                            ">
                            Was Conductor Info Obtained?
                          </mat-checkbox>
                          <button
                            [disabled]="!this.isBulkEdit"
                            type="button"
                            appToggleEditField="wasCondInfoObtained"
                            mat-icon-button
                            matSuffix>
                            <mat-icon>edit</mat-icon>
                          </button>
                        </div>
                        <div
                          formArrayName="conductors"
                          class="d-flex flex-column align-items-end gap-3"
                          [appToggleControl]="
                            'startingActions.' +
                            saIndex +
                            '.wasCondInfoObtained'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addConductor(saIndex)">
                          @for (
                            conductor of saAction.controls.conductors.controls;
                            track $index;
                            let condIndex = $index
                          ) {
                            <div
                              [formGroupName]="condIndex"
                              appEntitySync
                              class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>Conductor #{{ condIndex + 1 }}</h3>
                                    <button
                                      type="button"
                                      mat-icon-button
                                      [class.invisible]="this.isAudit"
                                      [attr.data-testid]="
                                        'startingActions-' +
                                        saIndex +
                                        '-conductors-' +
                                        condIndex +
                                        '-remove'
                                      "
                                      (click)="
                                        removeConductor(saIndex, condIndex)
                                      ">
                                      <mat-icon>delete</mat-icon>
                                    </button>
                                  </mat-panel-title>
                                </mat-expansion-panel-header>

                                <div class="row row-cols-1 row-cols-md-3">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-linkToSub'
                                    ">
                                    <mat-label>Select Entity</mat-label>
                                    <mat-select formControlName="linkToSub">
                                      @for (
                                        option of entitiesOptions$ | async;
                                        track option.value
                                      ) {
                                        <mat-option [value]="option.value">
                                          {{ option.label }}
                                        </mat-option>
                                      }
                                    </mat-select>
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>

                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-_hiddenPartyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenPartyKey" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    @if (
                                      conductor.controls._hiddenPartyKey.hasError(
                                        'invalidPartyKey'
                                      )
                                    ) {
                                      <mat-error>
                                        {{
                                          conductor.controls._hiddenPartyKey
                                            .errors!['invalidPartyKey']
                                        }}
                                      </mat-error>
                                    } @else {
                                      <mat-error>
                                        This field is required
                                      </mat-error>
                                    }
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-_hiddenSurname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenSurname"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-_hiddenGivenName'
                                    ">
                                    <mat-label>Given Name</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenGivenName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-_hiddenOtherOrInitialName'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenOtherOrInitialName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-_hiddenNameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenNameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                </div>
                                <!-- On Behalf Of Subsection -->
                                <h3>On Behalf Of</h3>
                                <div class="row">
                                  <mat-checkbox
                                    formControlName="wasConductedOnBehalf"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-wasConductedOnBehalf'
                                    ">
                                    Was Conducted On Behalf Of Others?
                                  </mat-checkbox>
                                </div>
                                <div
                                  formArrayName="onBehalfOf"
                                  class="d-flex flex-column align-items-end gap-3"
                                  [appToggleControl]="
                                    'startingActions.' +
                                    saIndex +
                                    '.conductors.' +
                                    condIndex +
                                    '.wasConductedOnBehalf'
                                  "
                                  (addControlGroup)="
                                    addOnBehalfOf(saIndex, condIndex)
                                  ">
                                  @for (
                                    behalf of conductor.controls.onBehalfOf
                                      .controls;
                                    track $index;
                                    let behalfIndex = $index
                                  ) {
                                    <div
                                      [formGroupName]="behalfIndex"
                                      appEntitySync
                                      class="w-100">
                                      <mat-expansion-panel [expanded]="true">
                                        <mat-expansion-panel-header
                                          class="my-2">
                                          <mat-panel-title
                                            class="d-flex align-items-center gap-2"
                                            ><h3>
                                              On Behalf Of #{{
                                                behalfIndex + 1
                                              }}
                                            </h3>
                                            <button
                                              type="button"
                                              mat-icon-button
                                              [class.invisible]="this.isAudit"
                                              [attr.data-testid]="
                                                'startingActions-' +
                                                saIndex +
                                                '-conductors-' +
                                                condIndex +
                                                '-onBehalfOf-' +
                                                behalfIndex +
                                                '-remove'
                                              "
                                              (click)="
                                                removeOnBehalfOf(
                                                  saIndex,
                                                  condIndex,
                                                  behalfIndex
                                                )
                                              ">
                                              <mat-icon>delete</mat-icon>
                                            </button>
                                          </mat-panel-title>
                                        </mat-expansion-panel-header>
                                        <div
                                          class="row row-cols-1 row-cols-md-3">
                                          <mat-form-field
                                            class="col"
                                            [attr.data-testid]="
                                              'startingActions-' +
                                              saIndex +
                                              '-conductors-' +
                                              condIndex +
                                              '-onBehalfOf-' +
                                              behalfIndex +
                                              '-linkToSub'
                                            ">
                                            <mat-label>Select Entity</mat-label>
                                            <mat-select
                                              formControlName="linkToSub">
                                              @for (
                                                option of entitiesOptions$
                                                  | async;
                                                track option.value
                                              ) {
                                                <mat-option
                                                  [value]="option.value">
                                                  {{ option.label }}
                                                </mat-option>
                                              }
                                            </mat-select>
                                            <button
                                              type="button"
                                              appClearField
                                              mat-icon-button
                                              matSuffix>
                                              <mat-icon>clear</mat-icon>
                                            </button>
                                            <mat-error
                                              >This field is required</mat-error
                                            >
                                          </mat-form-field>

                                          <mat-form-field
                                            class="col"
                                            [attr.data-testid]="
                                              'startingActions-' +
                                              saIndex +
                                              '-conductors-' +
                                              condIndex +
                                              '-onBehalfOf-' +
                                              behalfIndex +
                                              '-_hiddenPartyKey'
                                            ">
                                            <mat-label>Party Key</mat-label>
                                            <input
                                              matInput
                                              formControlName="_hiddenPartyKey" />
                                            <button
                                              type="button"
                                              appClearField
                                              mat-icon-button
                                              matSuffix>
                                              <mat-icon>clear</mat-icon>
                                            </button>
                                            @if (
                                              behalf.controls._hiddenPartyKey.hasError(
                                                'invalidPartyKey'
                                              )
                                            ) {
                                              <mat-error>
                                                {{
                                                  behalf.controls
                                                    ._hiddenPartyKey.errors![
                                                    'invalidPartyKey'
                                                  ]
                                                }}
                                              </mat-error>
                                            } @else {
                                              <mat-error>
                                                This field is required
                                              </mat-error>
                                            }
                                          </mat-form-field>
                                          <mat-form-field
                                            class="col"
                                            [attr.data-testid]="
                                              'startingActions-' +
                                              saIndex +
                                              '-conductors-' +
                                              condIndex +
                                              '-onBehalfOf-' +
                                              behalfIndex +
                                              '-_hiddenSurname'
                                            ">
                                            <mat-label
                                              >_hiddenSurname</mat-label
                                            >
                                            <input
                                              matInput
                                              formControlName="_hiddenSurname"
                                              appValidateOnParentChanges />
                                            <button
                                              type="button"
                                              appClearField
                                              mat-icon-button
                                              matSuffix>
                                              <mat-icon>clear</mat-icon>
                                            </button>
                                            <mat-error
                                              >This field is required</mat-error
                                            >
                                          </mat-form-field>
                                          <mat-form-field
                                            class="col"
                                            [attr.data-testid]="
                                              'startingActions-' +
                                              saIndex +
                                              '-conductors-' +
                                              condIndex +
                                              '-onBehalfOf-' +
                                              behalfIndex +
                                              '-_hiddenGivenName'
                                            ">
                                            <mat-label
                                              >_hiddenGivenName</mat-label
                                            >
                                            <input
                                              matInput
                                              formControlName="_hiddenGivenName"
                                              appValidateOnParentChanges />
                                            <button
                                              type="button"
                                              appClearField
                                              mat-icon-button
                                              matSuffix>
                                              <mat-icon>clear</mat-icon>
                                            </button>
                                            <mat-error
                                              >This field is required</mat-error
                                            >
                                          </mat-form-field>
                                          <mat-form-field
                                            class="col"
                                            [attr.data-testid]="
                                              'startingActions-' +
                                              saIndex +
                                              '-conductors-' +
                                              condIndex +
                                              '-onBehalfOf-' +
                                              behalfIndex +
                                              '-_hiddenOtherOrInitialName'
                                            ">
                                            <mat-label
                                              >Other or Initial</mat-label
                                            >
                                            <input
                                              matInput
                                              formControlName="_hiddenOtherOrInitialName"
                                              appValidateOnParentChanges />
                                            <button
                                              type="button"
                                              appClearField
                                              mat-icon-button
                                              matSuffix>
                                              <mat-icon>clear</mat-icon>
                                            </button>
                                            <mat-error
                                              >This field is required</mat-error
                                            >
                                          </mat-form-field>
                                          <mat-form-field
                                            class="col"
                                            [attr.data-testid]="
                                              'startingActions-' +
                                              saIndex +
                                              '-conductors-' +
                                              condIndex +
                                              '-onBehalfOf-' +
                                              behalfIndex +
                                              '-_hiddenNameOfEntity'
                                            ">
                                            <mat-label
                                              >Name of Entity</mat-label
                                            >
                                            <input
                                              matInput
                                              formControlName="_hiddenNameOfEntity"
                                              appValidateOnParentChanges />
                                            <button
                                              type="button"
                                              appClearField
                                              mat-icon-button
                                              matSuffix>
                                              <mat-icon>clear</mat-icon>
                                            </button>
                                            <mat-error
                                              >This field is required</mat-error
                                            >
                                          </mat-form-field>
                                        </div>
                                      </mat-expansion-panel>
                                    </div>
                                  }
                                  <button
                                    type="button"
                                    mat-raised-button
                                    color="primary"
                                    (click)="addOnBehalfOf(saIndex, condIndex)"
                                    [class.invisible]="this.isAudit"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-onBehalfOf-add'
                                    ">
                                    <mat-icon>add</mat-icon> Add On Behalf Of
                                  </button>
                                </div>
                              </mat-expansion-panel>
                            </div>
                          }
                          <button
                            type="button"
                            mat-raised-button
                            color="primary"
                            (click)="addConductor(saIndex)"
                            [class.invisible]="this.isAudit"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-conductors-add'
                            ">
                            <mat-icon>add</mat-icon> Add Conductor
                          </button>
                        </div>
                      </mat-expansion-panel>
                    </div>
                  }
                </div>
              </div>
            </mat-tab>

            <mat-tab>
              <ng-template mat-tab-label>
                <h3 class="mb-0">Completing Actions</h3>
                <mat-icon
                  class="error-icon mx-1"
                  [class.error-icon-show]="showCompletingActionsErrorIcon"
                  color="error"
                  >error_outline</mat-icon
                >
                <!-- Change indicator -->
                @if (isArrayFieldChanged('/completingActions')) {
                  <mat-icon
                    matIconPrefix
                    class="audit-icon text-primary"
                    matTooltip="Field was modified">
                    edit
                  </mat-icon>
                }
              </ng-template>
              <div class="d-flex flex-column align-items-end gap-3 mt-3">
                <button
                  type="button"
                  mat-raised-button
                  color="primary"
                  (click)="addCompletingAction()"
                  class="mx-1"
                  [class.invisible]="this.isAudit"
                  [attr.data-testid]="'completingActions-add'">
                  <mat-icon>add</mat-icon> Add Completing Action
                </button>
                <div
                  formArrayName="completingActions"
                  class="w-100 d-flex flex-column gap-3 mb-5">
                  @for (
                    caAction of editForm.controls.completingActions.controls;
                    track $index;
                    let caIndex = $index
                  ) {
                    <div [formGroupName]="caIndex">
                      <mat-expansion-panel [expanded]="true">
                        <mat-expansion-panel-header class="my-3">
                          <mat-panel-title
                            class="d-flex align-items-center gap-2"
                            ><h1>Completing Action #{{ caIndex + 1 }}</h1>
                            <span class="mat-h1 mb-0 text-break">
                              ({{
                                caAction.controls.amount.value ?? 0
                                  | currency
                                    : caAction.controls.currency.value ?? ''
                              }})
                            </span>
                            <button
                              type="button"
                              [class.invisible]="this.isAudit"
                              [attr.data-testid]="
                                'completingActions-' + caIndex + '-remove'
                              "
                              mat-icon-button
                              (click)="removeCompletingAction(caIndex)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </mat-panel-title>
                        </mat-expansion-panel-header>
                        <!-- Disposition Details -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-detailsOfDispo'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Details of Disposition</mat-label>
                            <mat-select formControlName="detailsOfDispo">
                              @for (
                                opt of (formOptions$ | async)
                                  ?.detailsOfDisposition | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' +
                                  caIndex +
                                  '/detailsOfDispo'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-detailsOfDispoOther'
                            ">
                            <mat-label>Other Details of Disposition</mat-label>
                            <input
                              matInput
                              formControlName="detailsOfDispoOther"
                              [appToggleControl]="
                                'completingActions.' +
                                caIndex +
                                '.detailsOfDispo'
                              "
                              appToggleControlValue="Other" />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' +
                                  caIndex +
                                  '/detailsOfDispoOther'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Amount Section -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-amount'
                            ">
                            <mat-label>Amount</mat-label>
                            <input
                              matInput
                              type="number"
                              formControlName="amount" />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/amount'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-currency'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Currency</mat-label>
                            <mat-select formControlName="currency">
                              @for (
                                opt of (formOptions$ | async)?.amountCurrency
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/currency'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-exchangeRate'
                            ">
                            <mat-label>Exchange Rate</mat-label>
                            <input
                              matInput
                              type="number"
                              formControlName="exchangeRate" />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' +
                                  caIndex +
                                  '/exchangeRate'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-valueInCad'
                            ">
                            <mat-label>Value in CAD</mat-label>
                            <input
                              matInput
                              type="number"
                              formControlName="valueInCad" />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/valueInCad'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Information -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-fiuNo'
                            ">
                            <mat-label>FIU Number</mat-label>
                            <input
                              matInput
                              formControlName="fiuNo"
                              appValidateOnParentChanges />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/fiuNo'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            @if (
                              caAction.controls.fiuNo.hasError(
                                'missingAccountInfo'
                              )
                            ) {
                              <mat-error>
                                {{
                                  caAction.controls.fiuNo.errors![
                                    'missingAccountInfo'
                                  ]
                                }}
                              </mat-error>
                            } @else if (
                              caAction.controls.fiuNo.hasError('invalidFiu')
                            ) {
                              <mat-error>
                                {{
                                  caAction.controls.fiuNo.errors!['invalidFiu']
                                }}
                              </mat-error>
                            }
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-branch'
                            ">
                            <mat-label>Branch</mat-label>
                            <input matInput formControlName="branch" />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/branch'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-account'
                            ">
                            <mat-label>Account Number</mat-label>
                            <input matInput formControlName="account" />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/account'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Information -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-accountType'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Account Type</mat-label>
                            <mat-select formControlName="accountType">
                              @for (
                                opt of (formOptions$ | async)?.accountType
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/accountType'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-accountTypeOther'
                            ">
                            <mat-label>Other Account Type</mat-label>
                            <input
                              matInput
                              formControlName="accountTypeOther"
                              [appToggleControl]="
                                'completingActions.' + caIndex + '.accountType'
                              "
                              appToggleControlValue="Other" />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' +
                                  caIndex +
                                  '/accountTypeOther'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-accountCurrency'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Account Currency</mat-label>
                            <mat-select formControlName="accountCurrency">
                              @for (
                                opt of (formOptions$ | async)?.accountCurrency
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' +
                                  caIndex +
                                  '/accountCurrency'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <div
                            class="col"
                            [class.d-none]="!isFormOptionsLoading"
                            [class.d-flex]="isFormOptionsLoading">
                            <span
                              class="sk skw-6 skh-7 col-auto flex-grow-1"
                              [class.d-none]="!isFormOptionsLoading"
                              [class.d-inline-block]="
                                isFormOptionsLoading
                              "></span>
                          </div>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-accountStatus'
                            "
                            [class.d-none]="isFormOptionsLoading">
                            <mat-label>Account Status</mat-label>
                            <mat-select formControlName="accountStatus">
                              @for (
                                opt of (formOptions$ | async)?.accountStatus
                                  | keyvalue;
                                track opt.key
                              ) {
                                <mat-option [value]="opt.key">
                                  {{ opt.key }}
                                </mat-option>
                              }
                            </mat-select>
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' +
                                  caIndex +
                                  '/accountStatus'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Open/Close -->
                        <div
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-accountOpen'
                            ">
                            <mat-label>Account Open Date</mat-label>
                            <input
                              matInput
                              formControlName="accountOpen"
                              [matDatepicker]="accountOpenPicker"
                              [max]="maxDate"
                              appTransactionDate />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="accountOpenPicker"></mat-datepicker-toggle>
                            <mat-datepicker #accountOpenPicker />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' + caIndex + '/accountOpen'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-accountClose'
                            ">
                            <mat-label>Account Close Date</mat-label>
                            <input
                              matInput
                              formControlName="accountClose"
                              [matDatepicker]="accountClosePicker"
                              [max]="maxDate"
                              appTransactionDate
                              appValidateOnParentChanges />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="
                                accountClosePicker
                              "></mat-datepicker-toggle>
                            <mat-datepicker #accountClosePicker />
                            <!-- Change indicator -->
                            @if (
                              isFormFieldChanged(
                                '/completingActions/' +
                                  caIndex +
                                  '/accountClose'
                              )
                            ) {
                              <mat-icon
                                matIconPrefix
                                class="text-primary"
                                matTooltip="Field was modified">
                                edit
                              </mat-icon>
                            }
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appMarkAsCleared
                              mat-icon-button
                              matSuffix>
                              <mat-icon>backspace</mat-icon>
                            </button>
                            <button
                              [disabled]="!this.isBulkEdit"
                              type="button"
                              appToggleEditField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
                          </mat-form-field>
                        </div>
                        <!-- Account Holders Section -->
                        <h2 class="d-flex align-items-center gap-2">
                          Account Holders
                          @if (
                            isArrayFieldChanged(
                              '/completingActions/' +
                                caIndex +
                                '/accountHolders'
                            )
                          ) {
                            <mat-icon
                              class="text-primary"
                              matTooltip="Section has changes">
                              edit
                            </mat-icon>
                          }
                        </h2>
                        <div class="row">
                          <mat-checkbox
                            class="col"
                            formControlName="hasAccountHolders"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-hasAccountHolders'
                            ">
                            Has account holders?
                          </mat-checkbox>
                          <button
                            [disabled]="!this.isBulkEdit"
                            type="button"
                            appToggleEditField="hasAccountHolders"
                            mat-icon-button
                            matSuffix>
                            <mat-icon>edit</mat-icon>
                          </button>
                        </div>
                        <div
                          formArrayName="accountHolders"
                          class="d-flex flex-column align-items-end gap-3"
                          [appToggleControl]="
                            'completingActions.' +
                            caIndex +
                            '.hasAccountHolders'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="
                            addAccountHolder('completingActions', caIndex)
                          ">
                          @for (
                            holder of caAction.controls.accountHolders.controls;
                            track $index;
                            let holderIndex = $index
                          ) {
                            <div
                              [formGroupName]="holderIndex"
                              appEntitySync
                              class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>
                                      Account Holder #{{ holderIndex + 1 }}
                                    </h3>
                                    <button
                                      type="button"
                                      mat-icon-button
                                      [class.invisible]="this.isAudit"
                                      [attr.data-testid]="
                                        'completingActions-' +
                                        caIndex +
                                        '-accountHolders-' +
                                        holderIndex +
                                        '-remove'
                                      "
                                      (click)="
                                        removeAccountHolder(
                                          'completingActions',
                                          caIndex,
                                          holderIndex
                                        )
                                      ">
                                      <mat-icon>delete</mat-icon>
                                    </button>
                                  </mat-panel-title>
                                </mat-expansion-panel-header>
                                <div class="row row-cols-1 row-cols-md-3">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-linkToSub'
                                    ">
                                    <mat-label>Select Entity</mat-label>
                                    <mat-select formControlName="linkToSub">
                                      @for (
                                        option of entitiesOptions$ | async;
                                        track option.value
                                      ) {
                                        <mat-option [value]="option.value">
                                          {{ option.label }}
                                        </mat-option>
                                      }
                                    </mat-select>
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenPartyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenPartyKey" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    @if (
                                      holder.controls._hiddenPartyKey.hasError(
                                        'invalidPartyKey'
                                      )
                                    ) {
                                      <mat-error>
                                        {{
                                          holder.controls._hiddenPartyKey
                                            .errors!['invalidPartyKey']
                                        }}
                                      </mat-error>
                                    } @else {
                                      <mat-error>
                                        This field is required
                                      </mat-error>
                                    }
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenSurname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenSurname"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenGivenName'
                                    ">
                                    <mat-label>Given Name</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenGivenName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenOtherOrInitialName'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenOtherOrInitialName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-_hiddenNameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenNameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                </div>
                              </mat-expansion-panel>
                            </div>
                          }
                          <button
                            type="button"
                            mat-raised-button
                            color="primary"
                            (click)="
                              addAccountHolder('completingActions', caIndex)
                            "
                            [class.invisible]="this.isAudit"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-accountHolders-add'
                            ">
                            <mat-icon>add</mat-icon> Add Account Holder
                          </button>
                        </div>
                        <!-- Involved In Section -->
                        <h2 class="d-flex align-items-center gap-2">
                          Other Involved Subjects
                          @if (
                            isArrayFieldChanged(
                              '/completingActions/' + caIndex + '/involvedIn'
                            )
                          ) {
                            <mat-icon
                              class="text-primary"
                              matTooltip="Section has changes">
                              edit
                            </mat-icon>
                          }
                        </h2>
                        <div class="row">
                          <mat-checkbox
                            class="col"
                            formControlName="wasAnyOtherSubInvolved"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-wasAnyOtherSubInvolved'
                            ">
                            Was any other subject involved?
                          </mat-checkbox>
                          <button
                            [disabled]="!this.isBulkEdit"
                            type="button"
                            appToggleEditField="wasAnyOtherSubInvolved"
                            mat-icon-button
                            matSuffix>
                            <mat-icon>edit</mat-icon>
                          </button>
                        </div>
                        <div
                          formArrayName="involvedIn"
                          class="d-flex flex-column align-items-end gap-3"
                          [appToggleControl]="
                            'completingActions.' +
                            caIndex +
                            '.wasAnyOtherSubInvolved'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addInvolvedIn(caIndex)">
                          @for (
                            involved of caAction.controls.involvedIn.controls;
                            track $index;
                            let invIndex = $index
                          ) {
                            <div
                              [formGroupName]="invIndex"
                              appEntitySync
                              class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>
                                      Involved Subject #{{ invIndex + 1 }}
                                    </h3>
                                    <button
                                      type="button"
                                      mat-icon-button
                                      [class.invisible]="this.isAudit"
                                      [attr.data-testid]="
                                        'completingActions-' +
                                        caIndex +
                                        '-involvedIn-' +
                                        invIndex +
                                        '-remove'
                                      "
                                      (click)="
                                        removeInvolvedIn(caIndex, invIndex)
                                      ">
                                      <mat-icon>delete</mat-icon>
                                    </button>
                                  </mat-panel-title>
                                </mat-expansion-panel-header>
                                <div class="row row-cols-1 row-cols-md-3">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-linkToSub'
                                    ">
                                    <mat-label>Select Entity</mat-label>
                                    <mat-select formControlName="linkToSub">
                                      @for (
                                        option of entitiesOptions$ | async;
                                        track option.value
                                      ) {
                                        <mat-option [value]="option.value">
                                          {{ option.label }}
                                        </mat-option>
                                      }
                                    </mat-select>
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-_hiddenPartyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenPartyKey" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    @if (
                                      involved.controls._hiddenPartyKey.hasError(
                                        'invalidPartyKey'
                                      )
                                    ) {
                                      <mat-error>
                                        {{
                                          involved.controls._hiddenPartyKey
                                            .errors!['invalidPartyKey']
                                        }}
                                      </mat-error>
                                    } @else {
                                      <mat-error>
                                        This field is required
                                      </mat-error>
                                    }
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-_hiddenSurname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenSurname"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-_hiddenGivenName'
                                    ">
                                    <mat-label>Given Name</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenGivenName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-_hiddenOtherOrInitialName'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenOtherOrInitialName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-_hiddenNameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenNameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-accountNumber'
                                    ">
                                    <mat-label>Account Number</mat-label>
                                    <input
                                      matInput
                                      formControlName="accountNumber" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-identifyingNumber'
                                    ">
                                    <mat-label>Identifying Number</mat-label>
                                    <input
                                      matInput
                                      formControlName="identifyingNumber" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                </div>
                              </mat-expansion-panel>
                            </div>
                          }
                          <button
                            type="button"
                            mat-raised-button
                            color="primary"
                            (click)="addInvolvedIn(caIndex)"
                            [class.invisible]="this.isAudit"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-involvedIn-add'
                            ">
                            <mat-icon>add</mat-icon> Add Involved Subject
                          </button>
                        </div>
                        <!-- Beneficiaries Section -->
                        <h2 class="d-flex align-items-center gap-2">
                          Beneficiaries
                          @if (
                            isArrayFieldChanged(
                              '/completingActions/' + caIndex + '/beneficiaries'
                            )
                          ) {
                            <mat-icon
                              class="text-primary"
                              matTooltip="Section has changes">
                              edit
                            </mat-icon>
                          }
                        </h2>
                        <div class="row">
                          <mat-checkbox
                            class="col"
                            formControlName="wasBenInfoObtained"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-wasBenInfoObtained'
                            ">
                            Was Beneficiary Info Obtained?
                          </mat-checkbox>
                          <button
                            [disabled]="!this.isBulkEdit"
                            type="button"
                            appToggleEditField="wasBenInfoObtained"
                            mat-icon-button
                            matSuffix>
                            <mat-icon>edit</mat-icon>
                          </button>
                        </div>
                        <div
                          formArrayName="beneficiaries"
                          class="d-flex flex-column align-items-end gap-3"
                          [appToggleControl]="
                            'completingActions.' +
                            caIndex +
                            '.wasBenInfoObtained'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addBeneficiary(caIndex)">
                          @for (
                            beneficiary of caAction.controls.beneficiaries
                              .controls;
                            track $index;
                            let benIndex = $index
                          ) {
                            <div
                              [formGroupName]="benIndex"
                              appEntitySync
                              class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>Beneficiary #{{ benIndex + 1 }}</h3>
                                    <button
                                      type="button"
                                      mat-icon-button
                                      [class.invisible]="this.isAudit"
                                      [attr.data-testid]="
                                        'completingActions-' +
                                        caIndex +
                                        '-beneficiaries-' +
                                        benIndex +
                                        '-remove'
                                      "
                                      (click)="
                                        removeBeneficiary(caIndex, benIndex)
                                      ">
                                      <mat-icon>delete</mat-icon>
                                    </button>
                                  </mat-panel-title>
                                </mat-expansion-panel-header>
                                <div class="row row-cols-1 row-cols-md-3">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-beneficiaries-' +
                                      benIndex +
                                      '-linkToSub'
                                    ">
                                    <mat-label>Select Entity</mat-label>
                                    <mat-select formControlName="linkToSub">
                                      @for (
                                        option of entitiesOptions$ | async;
                                        track option.value
                                      ) {
                                        <mat-option [value]="option.value">
                                          {{ option.label }}
                                        </mat-option>
                                      }
                                    </mat-select>
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-beneficiaries-' +
                                      benIndex +
                                      '-_hiddenPartyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenPartyKey" />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    @if (
                                      beneficiary.controls._hiddenPartyKey.hasError(
                                        'invalidPartyKey'
                                      )
                                    ) {
                                      <mat-error>
                                        {{
                                          beneficiary.controls._hiddenPartyKey
                                            .errors!['invalidPartyKey']
                                        }}
                                      </mat-error>
                                    } @else {
                                      <mat-error>
                                        This field is required
                                      </mat-error>
                                    }
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-beneficiaries-' +
                                      benIndex +
                                      '-_hiddenSurname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenSurname"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-beneficiaries-' +
                                      benIndex +
                                      '-_hiddenGivenName'
                                    ">
                                    <mat-label>Given Name</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenGivenName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-beneficiaries-' +
                                      benIndex +
                                      '-_hiddenOtherOrInitialName'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenOtherOrInitialName"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-beneficiaries-' +
                                      benIndex +
                                      '-_hiddenNameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="_hiddenNameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix>
                                      <mat-icon>clear</mat-icon>
                                    </button>
                                    <mat-error
                                      >This field is required</mat-error
                                    >
                                  </mat-form-field>
                                </div>
                              </mat-expansion-panel>
                            </div>
                          }
                          <button
                            type="button"
                            mat-raised-button
                            color="primary"
                            (click)="addBeneficiary(caIndex)"
                            [class.invisible]="this.isAudit"
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-beneficiaries-add'
                            ">
                            <mat-icon>add</mat-icon> Add Beneficiary
                          </button>
                        </div>
                      </mat-expansion-panel>
                    </div>
                  }
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
          <!-- <pre class="overlay-pre">
            Form values: {{ editForm.value | json }}
          </pre
          > -->
        </form>
      }
    </div>
  `,
  styleUrl: './edit-form.component.scss',
  providers: [
    { provide: ErrorStateMatcher, useClass: PreemptiveErrorStateMatcher },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFormComponent
  extends AuditableFormComponent
  implements AfterViewChecked
{
  private snackbarQ = inject(SnackbarQueueService);
  protected caseRecordStore = inject(CaseRecordStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected entities$ = this.caseRecordStore.state$.pipe(
    map(({ entities }) => entities),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected entitiesOptions$ = this.entities$.pipe(
    map((entities) =>
      entities.map((entity, index) => {
        const {
          givenName,
          surname,
          otherOrInitialName,
          nameOfEntity,
          entityIdentifier,
        } = entity ?? {};
        return {
          label: `${index + 1}. ${getEntityFullName({ givenName, otherOrInitialName, surname, nameOfEntity })}`,
          value: entityIdentifier,
        };
      }),
    ),
  );

  protected readonly editForm$ = this.editType$.pipe(
    combineLatestWith(
      this.auditVersionControl.valueChanges.pipe(startWith(NaN)),
    ),
    withLatestFrom(this.entities$),
    map(([[editType, auditVersion], entities]) => {
      switch (editType.type) {
        case 'SINGLE_SAVE':
          return this.createEditForm({
            txn: editType.payload,
            options: { editType: 'SINGLE_SAVE' },
          });

        case 'BULK_SAVE':
          return this.createEditForm({
            options: { editType: 'BULK_SAVE', disabled: true },
          });

        case 'AUDIT_REQUEST': {
          const auditChangeLogs = editType.payload.changeLogs.filter(
            (log) => log.eTag! <= auditVersion,
          );
          this.auditChangeLogPaths = auditChangeLogs.map(({ path }) => path);
          const txn = ChangeLog.applyChangeLogs(
            editType.payload,
            auditChangeLogs,
          );

          const enrichEntities = createTransactionEntityEnricher(entities);

          return this.createEditForm({
            txn: enrichEntities(txn),
            options: { editType: 'AUDIT_REQUEST', disabled: true },
          });
        }
      }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  _ = this.editForm$
    .pipe(takeUntilDestroyed())
    // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
    .subscribe((form) => {
      this.editForm = form;
    });

  protected readonly editFormHasChanges$ = this.editForm$.pipe(
    switchMap((form) => {
      // Store initial value to detect form changes
      const editFormValueBefore: EditFormValueType | null =
        this.editType().type === 'BULK_SAVE'
          ? structuredClone(form?.value ?? null)
          : structuredClone(form?.getRawValue() ?? null);

      return form.valueChanges.pipe(
        debounceTime(300),
        map(() => {
          const editFormVal =
            this.editType().type === 'BULK_SAVE'
              ? form.value!
              : form?.getRawValue();

          return !isEqualWith(
            editFormVal,
            editFormValueBefore,
            (val1, val2, indexOrKey) => {
              if (indexOrKey === '_id') return true;
              if (
                indexOrKey &&
                typeof indexOrKey === 'string' &&
                indexOrKey.startsWith('_hidden')
              )
                return true;

              if (
                this.editType().type === 'BULK_SAVE' &&
                isDepProp(indexOrKey as ChangeLog.DepPropType)
              )
                return true;

              return undefined;
            },
          );
        }),
        distinctUntilChanged(),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  ngAfterViewChecked(): void {
    // note: needed because audit form arrays seem to be enabled despite being set as disabled
    if (this.isAudit) this.editForm!.disable();
  }

  // ----------------------
  // Form Submission
  // ----------------------
  protected isSaved = false;

  private static obstructiveErrors = new Set(['invalidPartyKey']);

  private static mandatoryFields = [
    '_hiddenPartyKey',
    '_hiddenGivenName',
    '_hiddenOtherOrInitialName',
    '_hiddenSurname',
    '_hiddenNameOfEntity',
  ];

  protected onSave(): void {
    // console.log(
    //   '🚀 ~ EditFormComponent ~ onSubmit ~ this.userForm!.getRawValue():',
    //   this.editForm!.getRawValue(),
    // );
    //
    const formErrors = getFormErrors(this.editForm!);

    const hasObstructiveErrors = Object.values(formErrors)
      .flatMap((validationErrors) => Object.keys(validationErrors))
      .some((error) => EditFormComponent.obstructiveErrors.has(error));

    if (hasObstructiveErrors) {
      this.snackbarQ.open(
        'Please fix validation errors before saving',
        'Dismiss',
        {
          duration: 5000,
        },
      );
      return;
    }

    const hasMissingMandatoryFields = Object.keys(formErrors).some((key) =>
      EditFormComponent.mandatoryFields.some(
        (m) =>
          key.endsWith(m) &&
          Object.keys(formErrors[key]).some(
            (errorKey) => errorKey === 'required',
          ),
      ),
    );

    if (this.isSaved) {
      this.snackbarQ.open('Edits already saved!', 'Dismiss', {
        duration: 5000,
      });
      return;
    }

    this.isSaved = true;

    const editType = this.editType();

    if (editType.type === 'SINGLE_SAVE') {
      this.caseRecordStore.qSaveEditForm({
        editType: 'SINGLE_SAVE',
        flowOfFundsAmlTransactionId:
          editType.payload.flowOfFundsAmlTransactionId,
        selectionAfter: this.editForm!.getRawValue(),
      });
    }

    if (editType.type === 'BULK_SAVE') {
      this.caseRecordStore.qSaveEditForm({
        editType: 'BULK_SAVE',
        selectionAfter: this.editForm!.value,
        selectionIds: editType.payload,
      });
    }
  }

  protected navigateBack() {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  private readonly _conflictSub = this.caseRecordStore.conflict$
    .pipe(takeUntilDestroyed())
    // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
    .subscribe(() => this.navigateBack());
}

export const singleEditTypeResolver: ResolveFn<EditFormEditType> = (
  route: ActivatedRouteSnapshot,
  _: RouterStateSnapshot,
) => {
  return inject(CaseRecordStore).selectionsComputed$.pipe(
    map((strTransactionData) => {
      const strTransaction = strTransactionData.find(
        (txn) =>
          route.params['transactionId'] === txn.flowOfFundsAmlTransactionId,
      );

      if (!strTransaction) throw new Error('Transaction record not found');

      return {
        type: 'SINGLE_SAVE',
        payload: structuredClone(strTransaction),
      };
    }),
  );
};

export const bulkEditTypeResolver: ResolveFn<EditFormEditType> = (
  route: ActivatedRouteSnapshot,
  _: RouterStateSnapshot,
) => {
  const selectedTransactionsForBulkEdit = inject(Router).currentNavigation()
    ?.extras.state?.['selectedTransactionsForBulkEdit'] as string[] | null;

  if (!selectedTransactionsForBulkEdit) throw new Error('Unknown edit type');

  return inject(CaseRecordStore).selectionsComputed$.pipe(
    map((strTransactionData) => {
      const strTransactions = strTransactionData.filter((txn) =>
        selectedTransactionsForBulkEdit.includes(
          txn.flowOfFundsAmlTransactionId,
        ),
      );
      console.assert(
        strTransactions.length === selectedTransactionsForBulkEdit.length,
      );
      return {
        type: 'BULK_SAVE',
        payload: selectedTransactionsForBulkEdit,
      };
    }),
  );
};

export const auditResolver: ResolveFn<EditFormEditType> = (
  route: ActivatedRouteSnapshot,
  _: RouterStateSnapshot,
) => {
  return inject(CaseRecordStore).state$.pipe(
    map(({ selections }) => {
      const strTransaction = selections.find(
        (txn) =>
          route.params['transactionId'] === txn.flowOfFundsAmlTransactionId,
      );
      if (!strTransaction) throw new Error('Transaction record not found');
      return {
        type: 'AUDIT_REQUEST',
        payload: structuredClone(
          strTransaction,
        ) as StrTransactionWithChangeLogs,
      };
    }),
  );
};

function isDepProp(prop: ChangeLog.DepPropType) {
  return (
    [
      'accountHolders',
      'sourceOfFunds',
      'conductors',
      'involvedIn',
      'beneficiaries',
      'wasTxnAttemptedReason',
      'dateOfPosting',
      'timeOfPosting',
      'methodOfTxnOther',
      'typeOfFundsOther',
      'accountTypeOther',
      'detailsOfDispoOther',
    ] as ChangeLog.DepPropType[]
  ).some((t) => t === prop);
}

export type TypedForm<T> = {
  [K in keyof T]-?: Exclude<T[K], undefined | null> extends (infer U)[]
    ? FormArray<
        U extends object ? FormGroup<TypedForm<U>> : FormControl<U | null>
      >
    : Exclude<T[K], undefined | null> extends object
      ? FormGroup<TypedForm<T[K]>>
      : FormControl<Exclude<T[K], undefined> | null>;
};

export type StrTxnEditForm = RecursiveOmit<
  StrTransaction,
  | keyof StrTxnFlowOfFunds
  | keyof ConductorNpdData
  | '_hiddenFullName'
  | '_hiddenSaAmount'
  | '_hiddenFirstName'
  | 'sourceId'
> & {
  _hiddenUpdatedAt?: string | null;
  _hiddenUpdatedBy?: string | null;
};

export type EditFormEditType =
  | {
      type: 'SINGLE_SAVE';
      payload: StrTransactionWithChangeLogs;
    }
  | {
      type: 'BULK_SAVE';
      payload: StrTransaction['flowOfFundsAmlTransactionId'][];
    }
  | {
      type: 'AUDIT_REQUEST';
      payload: StrTransactionWithChangeLogs;
    };

export type EditType = EditFormEditType extends { type: infer T } ? T : never;

// note does not properly omit keys from union types
export type RecursiveOmit<T, K extends PropertyKey> = T extends object
  ? Omit<{ [P in keyof T]: RecursiveOmit<T[P], K> }, K>
  : T;

export type EditFormValueType = ReturnType<
  typeof EditFormComponent.prototype.createEditForm
>['value'];

export type EditFormType = ReturnType<
  typeof EditFormComponent.prototype.createEditForm
>;

export type InvalidFormOptionsErrors = {
  [K in InvalidFormOptionsErrorKeys]: Record<
    K,
    {
      value: string;
      validValues: string[];
    }
  >;
}[InvalidFormOptionsErrorKeys];

export type InvalidFormOptionsErrorKeys =
  `invalid${Capitalize<keyof FormOptions & string>}`;

export type InvalidTxnDateTimeErrorKeys = 'invalidDate' | 'invalidTime';
