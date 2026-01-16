import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormArray,
  FormControl,
  FormGroup,
  isFormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
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
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { isValid } from 'date-fns';
import { isEqualWith } from 'lodash-es';
import { Observable, of } from 'rxjs';
import {
  combineLatestWith,
  filter,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import {
  CaseRecordStore,
  StrTransactionWithChangeLogs,
} from '../../aml/case-record.store';
import * as ChangeLog from '../../change-logging/change-log';
import { setError } from '../../form-helpers';
import { SnackbarQueueService } from '../../snackbar-queue.service';
import { PreemptiveErrorStateMatcher } from '../../transaction-search/transaction-search.component';
import {
  AccountHolder,
  Beneficiary,
  CompletingAction,
  Conductor,
  ConductorNpdData,
  InvolvedIn,
  OnBehalfOf,
  SourceOfFunds,
  StartingAction,
  StrTransaction,
  StrTxnFlowOfFunds,
  WithETag,
} from '../reporting-ui-table/reporting-ui-table.component';
import { ClearFieldDirective } from './clear-field.directive';
import {
  hasEntityName,
  hasMissingAccountInfo,
  hasMissingConductorInfo,
  hasPersonName,
} from './common-validation';
import { ControlToggleDirective } from './control-toggle.directive';
import { FormOptions, FormOptionsService } from './form-options.service';
import { MarkAsClearedDirective } from './mark-as-cleared.directive';
import { ToggleEditFieldDirective } from './toggle-edit-field.directive';
import { TransactionDateDirective } from './transaction-date.directive';
import { TransactionDetailsPanelComponent } from './transaction-details-panel/transaction-details-panel.component';
import { TransactionTimeDirective } from './transaction-time.directive';
import { ValidateOnParentChangesDirective } from './validate-on-parent-changes.directive';

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
  ],
  template: `
    <div class="container px-0 mb-5">
      <mat-toolbar class="justify-content-end px-0">
        <button
          type="button"
          mat-icon-button
          (click)="navigateBack()"
          aria-label="Go back">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="flex-fill"></div>

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
          <mat-form-field>
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
        @if (editType$ | async; as editType) {
          <app-transaction-details-panel
            [singleStrTransaction]="$any(editType.payload)" />
        }
      }
    </div>
    <div class="container form-field-density px-0">
      @if (editForm$ | async; as editForm) {
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
                          appTransactionDate />
                        <mat-datepicker-toggle
                          matIconSuffix
                          [for]="dateOfTxnPicker"></mat-datepicker-toggle>
                        <mat-datepicker #dateOfTxnPicker />
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
                      <div class="col-xl-4 d-flex">
                        <mat-checkbox
                          formControlName="hasPostingDate"
                          class="col-auto"
                          data-testid="hasPostingDate">
                          Has Posting Date?
                        </mat-checkbox>
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
                          appTransactionDate
                          appControlToggle="hasPostingDate" />
                        <mat-datepicker-toggle
                          matIconSuffix
                          [for]="dateOfPostingPicker"></mat-datepicker-toggle>
                        <mat-datepicker #dateOfPostingPicker />
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
                          appControlToggle="hasPostingDate" />
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
                          appControlToggle="methodOfTxn"
                          appControlToggleValue="Other" />
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
                      <div class="col-12 col-xl-4 d-flex">
                        <mat-checkbox
                          formControlName="wasTxnAttempted"
                          class="col-auto"
                          data-testid="wasTxnAttempted">
                          Was Transaction Attempted?
                        </mat-checkbox>
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
                          appControlToggle="wasTxnAttempted" />
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
              </ng-template>
              <div class="d-flex flex-column align-items-end gap-3 mt-3">
                <button
                  type="button"
                  mat-raised-button
                  color="primary"
                  (click)="addStartingAction()"
                  class="mx-1"
                  [attr.data-testid]="'startingActions-add'">
                  <mat-icon>add</mat-icon> Add Starting Action
                </button>
                <div
                  formArrayName="startingActions"
                  class="w-100 d-flex flex-column gap-3 mb-5">
                  @for (
                    saAction of editForm.controls.startingActions.controls;
                    track saAction.value._id;
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
                              'startingActions-' + saIndex + '-typeOfFundsOther'
                            ">
                            <mat-label>Other Type of Funds</mat-label>
                            <input
                              matInput
                              formControlName="typeOfFundsOther"
                              [appControlToggle]="
                                'startingActions.' + saIndex + '.typeOfFunds'
                              "
                              appControlToggleValue="Other" />
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
                            }
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'startingActions-' + saIndex + '-branch'
                            ">
                            <mat-label>Branch</mat-label>
                            <input matInput formControlName="branch" />
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
                              [appControlToggle]="
                                'startingActions.' + saIndex + '.accountType'
                              "
                              appControlToggleValue="Other" />
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
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-3">
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
                              appTransactionDate />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="accountOpenPicker"></mat-datepicker-toggle>
                            <mat-datepicker #accountOpenPicker />
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
                              appTransactionDate
                              appValidateOnParentChanges />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="
                                accountClosePicker
                              "></mat-datepicker-toggle>
                            <mat-datepicker #accountClosePicker />
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
                        <h2>Account Holders</h2>
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
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.hasAccountHolders'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="
                            addAccountHolder('startingActions', saIndex)
                          ">
                          @for (
                            holder of saAction.controls.accountHolders.controls;
                            track holder.value._id;
                            let holderIndex = $index
                          ) {
                            <div [formGroupName]="holderIndex" class="w-100">
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
                                <div class="row row-cols-1 row-cols-md-2">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-partyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey" />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-surname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="surname"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-givenName'
                                    ">
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-otherOrInitial'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-nameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                            [attr.data-testid]="
                              'startingActions-' +
                              saIndex +
                              '-accountHolders-add'
                            ">
                            <mat-icon>add</mat-icon> Add Account Holder
                          </button>
                        </div>
                        <!-- Source of Funds Section -->
                        <h2>Source of Funds</h2>
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
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.wasSofInfoObtained'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addSourceOfFunds(saIndex)">
                          @for (
                            source of saAction.controls.sourceOfFunds.controls;
                            track source.value._id;
                            let fundsIndex = $index
                          ) {
                            <div [formGroupName]="fundsIndex" class="w-100">
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
                                <div class="row row-cols-1 row-cols-md-2">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-sourceOfFunds-' +
                                      fundsIndex +
                                      '-partyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey" />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-surname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="surname"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-givenName'
                                    ">
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-otherOrInitial'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-nameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      [disabled]="this.isBulkEdit"
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
                                      [disabled]="this.isBulkEdit"
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
                            [attr.data-testid]="
                              'startingActions-' +
                              saIndex +
                              '-sourceOfFunds-add'
                            ">
                            <mat-icon>add</mat-icon> Add Source of Funds
                          </button>
                        </div>
                        <!-- Conductors Section -->
                        <h2>Conductors</h2>
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
                          [appControlToggle]="
                            'startingActions.' +
                            saIndex +
                            '.wasCondInfoObtained'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addConductor(saIndex)">
                          @for (
                            conductor of saAction.controls.conductors.controls;
                            track conductor.value._id;
                            let condIndex = $index
                          ) {
                            <div [formGroupName]="condIndex" class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>Conductor #{{ condIndex + 1 }}</h3>
                                    <button
                                      type="button"
                                      mat-icon-button
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
                                <div class="row row-cols-1 row-cols-md-2">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'startingActions-' +
                                      saIndex +
                                      '-conductors-' +
                                      condIndex +
                                      '-partyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey" />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-surname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="surname"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-givenName'
                                    ">
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-otherOrInitial'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-nameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                  [appControlToggle]="
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
                                    track behalf.value._id;
                                    let behalfIndex = $index
                                  ) {
                                    <div
                                      [formGroupName]="behalfIndex"
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
                                          class="row row-cols-1 row-cols-md-2">
                                          <mat-form-field
                                            class="col"
                                            [attr.data-testid]="
                                              'startingActions-' +
                                              saIndex +
                                              '-conductors-' +
                                              condIndex +
                                              '-onBehalfOf-' +
                                              behalfIndex +
                                              '-partyKey'
                                            ">
                                            <mat-label>Party Key</mat-label>
                                            <input
                                              matInput
                                              formControlName="partyKey" />
                                            <button
                                              [disabled]="this.isBulkEdit"
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
                                              '-surname'
                                            ">
                                            <mat-label>Surname</mat-label>
                                            <input
                                              matInput
                                              formControlName="surname"
                                              appValidateOnParentChanges />
                                            <button
                                              [disabled]="this.isBulkEdit"
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
                                              '-givenName'
                                            ">
                                            <mat-label>GivenName</mat-label>
                                            <input
                                              matInput
                                              formControlName="givenName"
                                              appValidateOnParentChanges />
                                            <button
                                              [disabled]="this.isBulkEdit"
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
                                              '-otherOrInitial'
                                            ">
                                            <mat-label
                                              >Other or Initial</mat-label
                                            >
                                            <input
                                              matInput
                                              formControlName="otherOrInitial"
                                              appValidateOnParentChanges />
                                            <button
                                              [disabled]="this.isBulkEdit"
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
                                              '-nameOfEntity'
                                            ">
                                            <mat-label
                                              >Name of Entity</mat-label
                                            >
                                            <input
                                              matInput
                                              formControlName="nameOfEntity"
                                              appValidateOnParentChanges />
                                            <button
                                              [disabled]="this.isBulkEdit"
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
            <!-- Completing Actions Tab -->
            <mat-tab>
              <ng-template mat-tab-label>
                <h3 class="mb-0">Completing Actions</h3>
                <mat-icon
                  class="error-icon mx-1"
                  [class.error-icon-show]="showCompletingActionsErrorIcon"
                  color="error"
                  >error_outline</mat-icon
                >
              </ng-template>
              <div class="d-flex flex-column align-items-end gap-3 mt-3">
                <button
                  type="button"
                  mat-raised-button
                  color="primary"
                  (click)="addCompletingAction()"
                  class="mx-1"
                  [attr.data-testid]="'completingActions-add'">
                  <mat-icon>add</mat-icon> Add Completing Action
                </button>
                <div
                  formArrayName="completingActions"
                  class="w-100 d-flex flex-column gap-3 mb-5">
                  @for (
                    caAction of editForm.controls.completingActions.controls;
                    track caAction.value._id;
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
                              [appControlToggle]="
                                'completingActions.' +
                                caIndex +
                                '.detailsOfDispo'
                              "
                              appControlToggleValue="Other" />
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
                            }
                          </mat-form-field>
                          <mat-form-field
                            class="col"
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-branch'
                            ">
                            <mat-label>Branch</mat-label>
                            <input matInput formControlName="branch" />
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
                              [appControlToggle]="
                                'completingActions.' + caIndex + '.accountType'
                              "
                              appControlToggleValue="Other" />
                            <button
                              [disabled]="this.isBulkEdit"
                              type="button"
                              appClearField
                              mat-icon-button
                              matSuffix>
                              <mat-icon>clear</mat-icon>
                            </button>
                            <mat-error>This field is required</mat-error>
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
                          class="row row-cols-1 row-cols-md-2 row-cols-xxl-3">
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
                              appTransactionDate />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="accountOpenPicker"></mat-datepicker-toggle>
                            <mat-datepicker #accountOpenPicker />
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
                              appTransactionDate
                              appValidateOnParentChanges />
                            <mat-datepicker-toggle
                              matIconSuffix
                              [for]="
                                accountClosePicker
                              "></mat-datepicker-toggle>
                            <mat-datepicker #accountClosePicker />
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
                        <h2>Account Holders</h2>
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
                          [appControlToggle]="
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
                            track holder.value._id;
                            let holderIndex = $index
                          ) {
                            <div [formGroupName]="holderIndex" class="w-100">
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
                                <div class="row row-cols-1 row-cols-md-2">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-accountHolders-' +
                                      holderIndex +
                                      '-partyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey" />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-surname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="surname"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-givenName'
                                    ">
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-otherOrInitial'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-nameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                            [attr.data-testid]="
                              'completingActions-' +
                              caIndex +
                              '-accountHolders-add'
                            ">
                            <mat-icon>add</mat-icon> Add Account Holder
                          </button>
                        </div>
                        <!-- Involved In Section -->
                        <h2>Other Involved Subjects</h2>
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
                          [appControlToggle]="
                            'completingActions.' +
                            caIndex +
                            '.wasAnyOtherSubInvolved'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addInvolvedIn(caIndex)">
                          @for (
                            involved of caAction.controls.involvedIn.controls;
                            track involved.value._id;
                            let invIndex = $index
                          ) {
                            <div [formGroupName]="invIndex" class="w-100">
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
                                <div class="row row-cols-1 row-cols-md-2">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-involvedIn-' +
                                      invIndex +
                                      '-partyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey" />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-surname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="surname"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-givenName'
                                    ">
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-otherOrInitial'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-nameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      [disabled]="this.isBulkEdit"
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
                                      [disabled]="this.isBulkEdit"
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
                            [attr.data-testid]="
                              'completingActions-' + caIndex + '-involvedIn-add'
                            ">
                            <mat-icon>add</mat-icon> Add Involved Subject
                          </button>
                        </div>
                        <!-- Beneficiaries Section -->
                        <h2>Beneficiaries</h2>
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
                          [appControlToggle]="
                            'completingActions.' +
                            caIndex +
                            '.wasBenInfoObtained'
                          "
                          [isBulkEdit]="isBulkEdit"
                          (addControlGroup)="addBeneficiary(caIndex)">
                          @for (
                            beneficiary of caAction.controls.beneficiaries
                              .controls;
                            track beneficiary.value._id;
                            let benIndex = $index
                          ) {
                            <div [formGroupName]="benIndex" class="w-100">
                              <mat-expansion-panel [expanded]="true">
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>Beneficiary #{{ benIndex + 1 }}</h3>
                                    <button
                                      type="button"
                                      mat-icon-button
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
                                <div class="row row-cols-1 row-cols-md-2">
                                  <mat-form-field
                                    class="col"
                                    [attr.data-testid]="
                                      'completingActions-' +
                                      caIndex +
                                      '-beneficiaries-' +
                                      benIndex +
                                      '-partyKey'
                                    ">
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey" />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-surname'
                                    ">
                                    <mat-label>Surname</mat-label>
                                    <input
                                      matInput
                                      formControlName="surname"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-givenName'
                                    ">
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-otherOrInitial'
                                    ">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
                                      '-nameOfEntity'
                                    ">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
                                      appValidateOnParentChanges />
                                    <button
                                      [disabled]="this.isBulkEdit"
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
          <pre class="overlay-pre">
            Form values: {{ editForm.value | json }}
          </pre
          >
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
export class EditFormComponent implements AfterViewChecked {
  private snackbarQ = inject(SnackbarQueueService);

  readonly editType = input.required<EditFormEditType>();
  protected readonly editType$ = toObservable(this.editType);

  protected auditVersionControl = new FormControl<number>(NaN, {
    nonNullable: true,
  });

  protected readonly editForm$ = this.editType$.pipe(
    combineLatestWith(
      this.auditVersionControl.valueChanges.pipe(startWith(NaN)),
    ),
    map(([editType, auditVersion]) => {
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
          const txn = ChangeLog.applyChangeLogs(
            editType.payload,
            editType.payload.changeLogs.filter(
              (log) => log.eTag! <= auditVersion,
            ),
          );
          return this.createEditForm({
            txn,
            options: { editType: 'AUDIT_REQUEST', disabled: true },
          });
        }
      }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private editForm: EditFormType | null = null;
  private editFormValueBefore: EditFormValueType | null = null;
  _ = this.editForm$
    .pipe(takeUntilDestroyed())
    // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
    .subscribe((form) => {
      this.editForm = form;
    });

  protected auditVersionOptions$ = this.editType$.pipe(
    filter(({ type }) => type === 'AUDIT_REQUEST'),
    map(({ payload }) =>
      (payload as StrTransactionWithChangeLogs).changeLogs.filter(
        (log) => log.path !== '/highlightColor',
      ),
    ),
    tap((changes) =>
      this.auditVersionControl.setValue(changes.at(-1)?.eTag ?? 0),
    ),
    map((changes) => {
      const verMap = new Map([[0, 0]]);

      changes.forEach((log) => {
        if (Array.from(verMap.values()).includes(log.eTag!)) return verMap;

        let lastLabelIndex = [...verMap].at(-1)![0];
        return verMap.set(++lastLabelIndex, log.eTag!);
      });

      return Array.from(verMap.entries()).map(([key, val]) => ({
        label: `v${String(key)}`,
        value: val,
      }));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected readonly editFormHasChanges$ = this.editForm$.pipe(
    switchMap((form) => {
      // Store initial value when form changes
      this.editFormValueBefore = structuredClone(form?.getRawValue() ?? null);

      return form.valueChanges.pipe(
        startWith(form.getRawValue()),
        map(() => {
          const editFormVal = form.getRawValue()!;
          return !isEqualWith(
            editFormVal,
            this.editFormValueBefore,
            (val1, val2, indexOrKey) => {
              const isEmpty = (val: unknown) => val == null || val === '';

              if (isEmpty(val1) && isEmpty(val2)) return true;

              if (indexOrKey === '_id') return true;

              if (
                this.editType().type === 'BULK_SAVE' &&
                isDepProp(indexOrKey as ChangeLog.DepPropType)
              )
                return true;

              return undefined;
            },
          );
        }),
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
  protected caseRecordStore = inject(CaseRecordStore);
  protected isSaved = false;

  protected onSave(): void {
    // console.log(
    //   '🚀 ~ EditFormComponent ~ onSubmit ~ this.userForm!.getRawValue():',
    //   this.editForm!.getRawValue(),
    // );

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
        editFormValue: this.editForm!.getRawValue(),
      });
    }

    if (editType.type === 'BULK_SAVE') {
      this.caseRecordStore.qSaveEditForm({
        editType: 'BULK_SAVE',
        editFormValue: this.editForm!.value,
        selectionIds: editType.payload,
      });
    }
  }

  createEditForm({
    txn,
    options,
  }: {
    txn?:
      | WithETag<StrTransactionWithChangeLogs>
      | StrTransactionWithChangeLogs
      | null;
    options: { editType: EditType; disabled?: boolean };
  }) {
    const { editType, disabled = false } = options;
    const createEmptyArrays = editType === 'BULK_SAVE';

    const editForm = new FormGroup(
      {
        eTag: new FormControl<number>({
          value: txn?.changeLogs.at(-1)?.eTag ?? 0,
          disabled,
        }),
        wasTxnAttempted: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'wasTxnAttempted',
            txn?.wasTxnAttempted,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        wasTxnAttemptedReason: new FormControl(
          { value: txn?.wasTxnAttemptedReason || '', disabled },
          Validators.required,
        ),
        dateOfTxn: new FormControl({ value: txn?.dateOfTxn || '', disabled }, [
          Validators.required,
          dateValidator(),
        ]),
        timeOfTxn: new FormControl(
          { value: txn?.timeOfTxn || '', disabled },
          Validators.required,
        ),
        hasPostingDate: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'hasPostingDate',
            txn?.hasPostingDate,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        dateOfPosting: new FormControl(
          { value: txn?.dateOfPosting || '', disabled },
          [Validators.required, dateValidator()],
        ),
        timeOfPosting: new FormControl(
          { value: txn?.timeOfPosting || '', disabled },
          Validators.required,
        ),
        methodOfTxn: new FormControl(
          { value: txn?.methodOfTxn || '', disabled },
          Validators.required,
          this.methodOfTxnValidator(),
        ),
        methodOfTxnOther: new FormControl(
          { value: txn?.methodOfTxnOther || '', disabled },
          Validators.required,
        ),
        reportingEntityTxnRefNo: new FormControl({
          value: txn?.reportingEntityTxnRefNo!,
          disabled,
        }),
        purposeOfTxn: new FormControl({
          value: txn?.purposeOfTxn || '',
          disabled,
        }),
        reportingEntityLocationNo: new FormControl(
          { value: txn?.reportingEntityLocationNo || '', disabled },
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(5),
          ],
        ),
        startingActions: new FormArray(
          txn?.startingActions?.map((action) =>
            this.createStartingActionGroup({
              action,
              options: { editType, disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createStartingActionGroup({
                    options: { editType, disabled },
                  }),
                ]
              : []),
        ),
        completingActions: new FormArray(
          txn?.completingActions?.map((action) =>
            this.createCompletingActionGroup({
              action,
              options: { editType, disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createCompletingActionGroup({
                    options: { editType, disabled },
                  }),
                ]
              : []),
        ),
        highlightColor: new FormControl(txn?.highlightColor ?? ''),
      },
      { updateOn: 'change' },
    ) satisfies FormGroup<TypedForm<WithETag<StrTxnEditForm>>>;

    return editForm;
  }

  // --------------------------
  // Form Group Creation Methods
  // --------------------------
  createStartingActionGroup({
    action,
    options,
  }: {
    action?: StartingAction;
    options: { editType: EditType; disabled: boolean };
  }) {
    const { editType, disabled } = options;
    const createEmptyArrays = editType === 'BULK_SAVE';

    const sAction = action;
    if (sAction?.accountHolders)
      sAction.hasAccountHolders = sAction.accountHolders.length > 0;

    const saGroup = new FormGroup(
      {
        _id: new FormControl({
          value: action?._id ?? getFormGroupId(),
          disabled: false,
        }),
        directionOfSA: new FormControl(
          {
            value: action?.directionOfSA || '',
            disabled,
          },
          [Validators.required],
          this.directionOfSAValidator(),
        ),
        typeOfFunds: new FormControl(
          {
            value: action?.typeOfFunds || '',
            disabled,
          },
          [Validators.required],
          this.typeOfFundsValidator(),
        ),
        typeOfFundsOther: new FormControl(
          { value: action?.typeOfFundsOther || '', disabled },
          Validators.required,
        ),
        amount: new FormControl(
          { value: action?.amount || null, disabled },
          Validators.required,
        ),
        currency: new FormControl(
          { value: action?.currency || '', disabled },
          [],
          this.amountCurrencyValidator(),
        ),
        fiuNo: new FormControl({ value: action?.fiuNo || '', disabled }, [
          accountInfoValidator(),
        ]),
        branch: new FormControl({ value: action?.branch || '', disabled }, [
          Validators.minLength(5),
          Validators.maxLength(5),
        ]),
        account: new FormControl({ value: action?.account || '', disabled }),
        accountType: new FormControl(
          {
            value: action?.accountType || '',
            disabled,
          },
          [],
          this.accountTypeValidator(),
        ),
        accountTypeOther: new FormControl(
          { value: action?.accountTypeOther || '', disabled },
          Validators.required,
        ),
        accountOpen: new FormControl({
          value: action?.accountOpen || '',
          disabled,
        }),
        accountClose: new FormControl(
          {
            value: action?.accountClose || '',
            disabled,
          },
          [accountCloseDateValidator()],
        ),
        accountStatus: new FormControl(
          {
            value: action?.accountStatus || '',
            disabled,
          },
          [],
          [this.accountStatusValidator()],
        ),
        howFundsObtained: new FormControl({
          value: action?.howFundsObtained || '',
          disabled,
        }),
        accountCurrency: new FormControl(
          {
            value: action?.accountCurrency || '',
            disabled,
          },
          [],
          this.accountCurrencyValidator(),
        ),
        hasAccountHolders: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'hasAccountHolders',
            action?.hasAccountHolders,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        accountHolders: new FormArray(
          action?.accountHolders?.map((holder) =>
            this.createAccountHolderGroup({
              holder,
              options: { disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createAccountHolderGroup({
                    options: { disabled },
                  }),
                ]
              : []),
        ),
        wasSofInfoObtained: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'wasSofInfoObtained',
            action?.wasSofInfoObtained,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        sourceOfFunds: new FormArray(
          action?.sourceOfFunds?.map((source) =>
            this.createSourceOfFundsGroup({
              source,
              options: { disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createSourceOfFundsGroup({
                    options: { disabled },
                  }),
                ]
              : []),
        ),
        wasCondInfoObtained: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'wasCondInfoObtained',
            action?.wasCondInfoObtained,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        conductors: new FormArray(
          action?.conductors?.map((conductor) =>
            this.createConductorGroup({
              conductor,
              options: { editType, disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createConductorGroup({
                    options: { editType, disabled },
                  }),
                ]
              : []),
        ),
      },
      [
        accountHolderValidator(),
        sourceOfFundsValidator(),
        conductorValidator(),
      ],
    ) satisfies FormGroup<
      TypedForm<RecursiveOmit<StartingAction, keyof ConductorNpdData>>
    >;

    if (disabled) {
      saGroup.controls.accountHolders.disable();
      saGroup.controls.sourceOfFunds.disable();
      saGroup.controls.conductors.disable();
    }

    return saGroup;
  }

  createCompletingActionGroup({
    action,
    options,
  }: {
    action?: CompletingAction;
    options: { editType: EditType; disabled: boolean };
  }) {
    const { editType, disabled } = options;
    const createEmptyArrays = editType === 'BULK_SAVE';

    const cAction = action;
    if (cAction?.accountHolders)
      cAction.hasAccountHolders = cAction.accountHolders.length > 0;

    const caGroup = new FormGroup(
      {
        _id: new FormControl({
          value: action?._id ?? getFormGroupId(),
          disabled: false,
        }),
        detailsOfDispo: new FormControl(
          {
            value: action?.detailsOfDispo || '',
            disabled,
          },
          [],
          this.detailsOfDispositionValidator(),
        ),
        detailsOfDispoOther: new FormControl(
          { value: action?.detailsOfDispoOther || '', disabled },
          Validators.required,
        ),
        amount: new FormControl(
          { value: action?.amount || null, disabled },
          Validators.required,
        ),
        currency: new FormControl(
          { value: action?.currency || '', disabled },
          [],
          this.amountCurrencyValidator(),
        ),
        exchangeRate: new FormControl({
          value: action?.exchangeRate || null,
          disabled,
        }),
        valueInCad: new FormControl({
          value: action?.valueInCad || null,
          disabled,
        }),
        fiuNo: new FormControl({ value: action?.fiuNo || '', disabled }, [
          accountInfoValidator(),
        ]),
        branch: new FormControl({ value: action?.branch || '', disabled }, [
          Validators.minLength(5),
          Validators.maxLength(5),
        ]),
        account: new FormControl({ value: action?.account || '', disabled }),
        accountType: new FormControl(
          {
            value: action?.accountType || '',
            disabled,
          },
          [],
          this.accountTypeValidator(),
        ),
        accountTypeOther: new FormControl(
          { value: action?.accountTypeOther || '', disabled },
          Validators.required,
        ),
        accountCurrency: new FormControl(
          {
            value: action?.accountCurrency || '',
            disabled,
          },
          [],
          this.accountCurrencyValidator(),
        ),
        accountOpen: new FormControl({
          value: action?.accountOpen || '',
          disabled,
        }),
        accountClose: new FormControl(
          {
            value: action?.accountClose || '',
            disabled,
          },
          [accountCloseDateValidator()],
        ),
        accountStatus: new FormControl(
          {
            value: action?.accountStatus || '',
            disabled,
          },
          [],
          this.accountStatusValidator(),
        ),
        hasAccountHolders: new FormControl({
          value: action?.hasAccountHolders ?? null,
          disabled,
        }),
        accountHolders: new FormArray(
          action?.accountHolders?.map((holder) =>
            this.createAccountHolderGroup({
              holder,
              options: { disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createAccountHolderGroup({
                    options: { disabled },
                  }),
                ]
              : []),
        ),
        wasAnyOtherSubInvolved: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'wasAnyOtherSubInvolved',
            action?.wasAnyOtherSubInvolved,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        involvedIn: new FormArray(
          action?.involvedIn?.map((involved) =>
            this.createInvolvedInGroup({
              involved,
              options: { disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createInvolvedInGroup({
                    options: { disabled },
                  }),
                ]
              : []),
        ),
        wasBenInfoObtained: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'wasBenInfoObtained',
            action?.wasBenInfoObtained,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        beneficiaries: new FormArray(
          action?.beneficiaries?.map((beneficiary) =>
            this.createBeneficiaryGroup({
              beneficiary,
              options: { disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createBeneficiaryGroup({
                    options: { disabled },
                  }),
                ]
              : []),
        ),
      },
      [accountHolderValidator(), involedInValidator(), beneficiaryValidator()],
    ) satisfies FormGroup<TypedForm<CompletingAction>>;

    if (disabled) {
      caGroup.controls.accountHolders.disable();
      caGroup.controls.involvedIn.disable();
      caGroup.controls.beneficiaries.disable();
    }

    return caGroup;
  }

  private createAccountHolderGroup({
    holder,
    options,
  }: {
    holder?: AccountHolder;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({
        value: holder?._id ?? getFormGroupId(),
        disabled: false,
      }),
      partyKey: new FormControl({ value: holder?.partyKey || '', disabled }),
      givenName: new FormControl({ value: holder?.givenName || '', disabled }, [
        personOrEntityValidator(),
      ]),
      otherOrInitial: new FormControl(
        {
          value: holder?.otherOrInitial || '',
          disabled,
        },
        [personOrEntityValidator()],
      ),
      surname: new FormControl(
        { value: holder?.surname || '', disabled },

        [personOrEntityValidator()],
      ),
      nameOfEntity: new FormControl(
        {
          value: holder?.nameOfEntity || '',
          disabled,
        },

        [personOrEntityValidator()],
      ),
    }) satisfies FormGroup<TypedForm<AccountHolder>>;
  }

  private createSourceOfFundsGroup({
    source,
    options,
  }: {
    source?: SourceOfFunds;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({
        value: source?._id ?? getFormGroupId(),
        disabled: false,
      }),
      partyKey: new FormControl({ value: source?.partyKey || '', disabled }),
      givenName: new FormControl({ value: source?.givenName || '', disabled }),
      otherOrInitial: new FormControl({
        value: source?.otherOrInitial || '',
        disabled,
      }),
      surname: new FormControl({ value: source?.surname || '', disabled }),
      nameOfEntity: new FormControl({
        value: source?.nameOfEntity || '',
        disabled,
      }),
      accountNumber: new FormControl({
        value: source?.accountNumber || '',
        disabled,
      }),
      identifyingNumber: new FormControl({
        value: source?.identifyingNumber || '',
        disabled,
      }),
    }) satisfies FormGroup<TypedForm<SourceOfFunds>>;
  }

  private createConductorGroup({
    conductor,
    options,
  }: {
    conductor?: Conductor;
    options: { editType: EditType; disabled: boolean };
  }) {
    const { editType, disabled } = options;

    const condGroup = new FormGroup({
      _id: new FormControl({
        value: conductor?._id ?? getFormGroupId(),
        disabled: false,
      }),
      partyKey: new FormControl({ value: conductor?.partyKey || '', disabled }),
      givenName: new FormControl({
        value: conductor?.givenName || '',
        disabled,
      }),
      otherOrInitial: new FormControl({
        value: conductor?.otherOrInitial || '',
        disabled,
      }),
      surname: new FormControl({ value: conductor?.surname || '', disabled }),
      nameOfEntity: new FormControl({
        value: conductor?.nameOfEntity || '',
        disabled,
      }),
      wasConductedOnBehalf: new FormControl({
        value: conductor?.wasConductedOnBehalf ?? false,
        disabled,
      }),
      // note do not create empty arrays as this toggle is not tied to a appToggleEditField (bulk edit)
      onBehalfOf: new FormArray(
        conductor?.onBehalfOf?.map((behalf) =>
          this.createOnBehalfOfGroup({
            behalf,
            options: { disabled },
          }),
        ) || [],
      ),
    }) satisfies FormGroup<
      TypedForm<RecursiveOmit<Conductor, keyof ConductorNpdData>>
    >;

    if (disabled) {
      condGroup.controls.onBehalfOf.disable();
    }

    return condGroup;
  }

  private createOnBehalfOfGroup({
    behalf,
    options,
  }: {
    behalf?: OnBehalfOf;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl({
        value: behalf?._id ?? getFormGroupId(),
        disabled: false,
      }),
      partyKey: new FormControl({ value: behalf?.partyKey || '', disabled }),
      givenName: new FormControl({ value: behalf?.givenName || '', disabled }),
      otherOrInitial: new FormControl({
        value: behalf?.otherOrInitial || '',
        disabled,
      }),
      surname: new FormControl({ value: behalf?.surname || '', disabled }),
      nameOfEntity: new FormControl({
        value: behalf?.nameOfEntity || '',
        disabled,
      }),
    }) satisfies FormGroup<TypedForm<OnBehalfOf>>;
  }

  private createInvolvedInGroup({
    involved,
    options,
  }: {
    involved?: InvolvedIn;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({
        value: involved?._id ?? getFormGroupId(),
        disabled: false,
      }),
      partyKey: new FormControl({ value: involved?.partyKey || '', disabled }),
      givenName: new FormControl({
        value: involved?.givenName || '',
        disabled,
      }),
      otherOrInitial: new FormControl({
        value: involved?.otherOrInitial || '',
        disabled,
      }),
      surname: new FormControl({ value: involved?.surname || '', disabled }),
      nameOfEntity: new FormControl({
        value: involved?.nameOfEntity || '',
        disabled,
      }),
      accountNumber: new FormControl({
        value: involved?.accountNumber || '',
        disabled,
      }),
      identifyingNumber: new FormControl({
        value: involved?.identifyingNumber || '',
        disabled,
      }),
    }) satisfies FormGroup<TypedForm<InvolvedIn>>;
  }

  private createBeneficiaryGroup({
    beneficiary,
    options,
  }: {
    beneficiary?: Beneficiary;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl({
        value: beneficiary?._id ?? getFormGroupId(),
        disabled: false,
      }),
      partyKey: new FormControl({
        value: beneficiary?.partyKey || '',
        disabled,
      }),
      givenName: new FormControl({
        value: beneficiary?.givenName || '',
        disabled,
      }),
      otherOrInitial: new FormControl({
        value: beneficiary?.otherOrInitial || '',
        disabled,
      }),
      surname: new FormControl({ value: beneficiary?.surname || '', disabled }),
      nameOfEntity: new FormControl({
        value: beneficiary?.nameOfEntity || '',
        disabled,
      }),
    }) satisfies FormGroup<TypedForm<Beneficiary>>;
  }

  // ----------------------
  // Array Management
  // ----------------------
  // Starting Actions
  protected addStartingAction(): void {
    if (this.editForm!.controls.startingActions.disabled) return;
    if (this.isAudit) return;

    const newSaGroup = this.createStartingActionGroup({
      options: { editType: this.editType().type, disabled: this.isBulkEdit },
    });

    this.editForm!.controls.startingActions.push(newSaGroup);
  }

  protected removeStartingAction(index: number): void {
    const hasMoreThanOneSA =
      this.editForm!.controls.startingActions.controls.length > 1;

    if (this.editForm!.controls.startingActions.disabled) return;
    if (!hasMoreThanOneSA) return;
    if (this.isAudit) return;

    this.editForm!.controls.startingActions.removeAt(index);
  }

  // Completing Actions
  protected addCompletingAction(): void {
    if (this.editForm!.controls.completingActions.disabled) return;

    if (this.isAudit) return;

    const newCaGroup = this.createCompletingActionGroup({
      options: { editType: this.editType().type, disabled: this.isBulkEdit },
    });
    this.editForm!.controls.completingActions.push(newCaGroup);
  }

  protected removeCompletingAction(index: number): void {
    const hasMoreThanOneCA =
      this.editForm!.controls.completingActions.controls.length > 1;

    if (this.editForm!.controls.completingActions.disabled) return;
    if (!hasMoreThanOneCA) return;
    if (this.isAudit) return;

    this.editForm!.controls.completingActions.removeAt(index);
  }

  // Account Hodlers SA/CA
  protected addAccountHolder(
    actionControlName: keyof StrTransaction,
    actionIndex: number,
  ): void {
    const action = (
      this.editForm!.get(actionControlName) as unknown as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders!.disabled) return;
    if (!action.controls.hasAccountHolders.value) return;
    if (this.isAudit) return;

    const newAccountHolderGroup = this.createAccountHolderGroup({
      options: { disabled: false },
    });
    action.controls.accountHolders!.push(newAccountHolderGroup);
  }

  protected removeAccountHolder(
    actionControlName: keyof StrTransaction,
    actionIndex: number,
    index: number,
  ): void {
    const action = (
      this.editForm!.get(actionControlName) as unknown as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders.value.length === 1) return;
    if (action.controls.accountHolders!.disabled) return;
    if (this.isAudit) return;

    action.controls.accountHolders!.removeAt(index);
  }

  // Source of Funds
  protected addSourceOfFunds(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;
    if (!startingAction.controls.wasSofInfoObtained.value) return;
    if (this.isAudit) return;

    const newSourceOfFundsGroup = this.createSourceOfFundsGroup({
      options: { disabled: false },
    });
    startingAction.controls.sourceOfFunds.push(newSourceOfFundsGroup);
  }

  protected removeSourceOfFunds(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.value.length === 1) return;
    if (startingAction.controls.sourceOfFunds.disabled) return;
    if (this.isAudit) return;

    startingAction.controls.sourceOfFunds.removeAt(index);
  }

  // Conductors
  protected addConductor(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.conductors.disabled) return;
    if (!startingAction.controls.wasCondInfoObtained.value) return;
    if (this.isAudit) return;

    const newSAConductorGroup = this.createConductorGroup({
      options: { editType: this.editType().type, disabled: false },
    });
    startingAction.controls.conductors.push(newSAConductorGroup);
  }

  protected removeConductor(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.conductors.value.length === 1) return;
    if (startingAction.controls.conductors.disabled) return;
    if (this.isAudit) return;

    startingAction.controls.conductors.removeAt(index);
  }

  // On Behalf Of
  protected addOnBehalfOf(saIndex: number, conductorIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (
      startingAction.controls.conductors.at(conductorIndex).controls.onBehalfOf
        .disabled
    )
      return;
    if (
      !startingAction.controls.conductors.at(conductorIndex).controls
        .wasConductedOnBehalf.value
    )
      return;
    if (this.isAudit) return;

    const newBehalfOfGroup = this.createOnBehalfOfGroup({
      options: { disabled: false },
    });
    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.push(newBehalfOfGroup);
  }

  protected removeOnBehalfOf(
    saIndex: number,
    conductorIndex: number,
    index: number,
  ): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (
      startingAction.controls.conductors.at(conductorIndex).controls.onBehalfOf
        .value.length === 1
    )
      return;
    if (
      startingAction.controls.conductors.at(conductorIndex).controls.onBehalfOf
        .disabled
    )
      return;
    if (this.isAudit) return;

    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.removeAt(index);
  }

  // Involved In (Completing Action)
  protected addInvolvedIn(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;
    if (!completingAction.controls.wasAnyOtherSubInvolved.value) return;
    if (this.isAudit) return;

    const newInvolvedInGroup = this.createInvolvedInGroup({
      options: { disabled: false },
    });
    completingAction.controls.involvedIn!.push(newInvolvedInGroup);
  }

  protected removeInvolvedIn(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn.value.length === 1) return;
    if (completingAction.controls.involvedIn!.disabled) return;
    if (this.isAudit) return;

    completingAction.controls.involvedIn!.removeAt(index);
  }

  // Beneficiaries
  protected addBeneficiary(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;
    if (!completingAction.controls.wasBenInfoObtained.value) return;
    if (this.isAudit) return;

    const newBeneficiaryGroup = this.createBeneficiaryGroup({
      options: { disabled: false },
    });
    completingAction.controls.beneficiaries!.push(newBeneficiaryGroup);
  }

  protected removeBeneficiary(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries.value.length === 1) return;
    if (completingAction.controls.beneficiaries!.disabled) return;
    if (this.isAudit) return;

    completingAction.controls.beneficiaries!.removeAt(index);
  }

  private formOptionsService = inject(FormOptionsService);
  isFormOptionsLoading = true;
  formOptions$ = this.formOptionsService.formOptions$.pipe(
    finalize(() => {
      this.isFormOptionsLoading = false;
    }),
  );

  /**
   * Async validator for methodOfTxn field
   */
  methodOfTxnValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'methodOfTxn',
          );
        }),
      );
    };
  }

  /**
   * Async validator for typeOfFunds field
   */
  typeOfFundsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'typeOfFunds',
          );
        }),
      );
    };
  }

  /**
   * Async validator for amountCurrency field
   */
  amountCurrencyValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'amountCurrency',
          );
        }),
      );
    };
  }

  /**
   * Async validator for accountType field
   */
  accountTypeValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'accountType',
          );
        }),
      );
    };
  }

  /**
   * Async validator for accountCurrency field
   */
  accountCurrencyValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'accountCurrency',
          );
        }),
      );
    };
  }

  /**
   * Async validator for accountStatus field
   */
  accountStatusValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'accountStatus',
          );
        }),
      );
    };
  }

  /**
   * Async validator for directionOfSA field
   */
  directionOfSAValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'directionOfSA',
          );
        }),
      );
    };
  }

  /**
   * Async validator for detailsOfDisposition field
   */
  detailsOfDispositionValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'detailsOfDisposition',
          );
        }),
      );
    };
  }

  /**
   * Generic validation method for form options fields
   */
  static validateFormOptions(
    value: string,
    formOptions: FormOptions,
    optionsKey: keyof FormOptions,
  ): InvalidFormOptionsErrors | null {
    const validValues = Object.keys(formOptions[optionsKey]);

    if (!validValues.includes(value)) {
      return {
        [`invalid${optionsKey.charAt(0).toUpperCase()}${optionsKey.slice(1)}` as InvalidFormOptionsErrorKeys]:
          {
            value: value,
            validValues,
          },
      } as InvalidFormOptionsErrors;
    }

    return null;
  }

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected navigateBack() {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }

  // template helpers
  protected get isSingleEdit() {
    return this.editType().type === 'SINGLE_SAVE';
  }
  protected get isBulkEdit() {
    return this.editType().type === 'BULK_SAVE';
  }
  protected get isAudit() {
    return this.editType().type === 'AUDIT_REQUEST';
  }
  protected get showTransactionDetailsErrorIcon() {
    if (this.isBulkEdit) return !this.editForm!.valid && this.editForm!.dirty;
    return !this.editForm!.valid;
  }
  protected get showStartingActionsErrorIcon() {
    if (this.isBulkEdit)
      return (
        !this.editForm!.controls.startingActions.valid &&
        this.editForm!.controls.startingActions.dirty
      );
    return !this.editForm!.controls.startingActions.valid;
  }
  protected get showCompletingActionsErrorIcon() {
    if (this.isBulkEdit)
      return (
        !this.editForm!.controls.completingActions.valid &&
        this.editForm!.controls.completingActions.dirty
      );
    return !this.editForm!.controls.completingActions.valid;
  }

  protected get selectedTransactionsForBulkEditLength() {
    const editType = this.editType();
    if (editType.type !== 'BULK_SAVE') {
      return -1;
    }
    return editType.payload.length;
  }
  protected get selectedTransactionsForBulkEditDisplayText() {
    return `${this.selectedTransactionsForBulkEditLength} transaction${
      this.selectedTransactionsForBulkEditLength !== 1 ? 's' : ''
    } selected`;
  }
}

function dateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { value } = control;

    if (!control.value) return null;

    if (!isValidDate(value)) return { invalidDate: true };

    return null;
  };
}

export function isValidDate(value: string) {
  const parsedDate = TransactionDateDirective.parse(value);
  if (!isValid(parsedDate)) {
    return false;
  }
  return true;
}

function accountInfoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actionControl = control.parent as FormGroup<
      TypedForm<
        RecursiveOmit<StartingAction, keyof ConductorNpdData> | CompletingAction
      >
    > | null;

    if (!actionControl) return null;

    console.assert(
      isFormGroup(actionControl),
      'Assert parent control is action group',
    );

    if (hasMissingAccountInfo(actionControl.value)) {
      return { missingAccountInfo: 'Missing account info' };
    }
    return null;
  };
}

function conductorValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const saControl = control as FormGroup<
      TypedForm<RecursiveOmit<StartingAction, keyof ConductorNpdData>>
    >;
    const value = saControl.value as RecursiveOmit<
      StartingAction,
      keyof ConductorNpdData
    >;

    if (!value) return null;

    setError(
      saControl.controls.wasCondInfoObtained,
      {
        missingConductorInfo: true,
      },
      () => hasMissingConductorInfo(value),
    );

    return null;
  };
}

// todo:
function accountHolderValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return null;
  };
}

// todo:
function sourceOfFundsValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return null;
  };
}

// todo:
function involedInValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return null;
  };
}

// todo:
function beneficiaryValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return null;
  };
}

function accountCloseDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actionControl = control.parent as FormGroup<
      TypedForm<
        RecursiveOmit<StartingAction, keyof ConductorNpdData> & CompletingAction
      >
    > | null;

    if (!actionControl) return null;

    console.assert(
      isFormGroup(actionControl),
      'Assert parent control is action group',
    );

    const value = actionControl.value as RecursiveOmit<
      StartingAction,
      keyof ConductorNpdData
    >;

    if (!value) return null;

    if (
      actionControl.controls.accountStatus.value === 'Closed' &&
      !actionControl.controls.accountClose.value
    ) {
      return { required: true };
    }

    return null;
  };
}

function personOrEntityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const subjectGroupCtrl = control.parent as FormGroup<
      TypedForm<AccountHolder>
    > | null;

    if (!subjectGroupCtrl) return null;

    console.assert(
      isFormGroup(subjectGroupCtrl),
      'Assert parent control is subject group',
    );

    const value = subjectGroupCtrl.value as RecursiveOmit<
      StartingAction,
      keyof ConductorNpdData
    >;

    if (!value) return null;

    if (
      !hasPersonName(subjectGroupCtrl.value as AccountHolder) &&
      !hasEntityName(subjectGroupCtrl.value as AccountHolder)
    ) {
      return { required: true };
    }

    return null;
  };
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
      if (!strTransaction) throw new Error('Transaction not found');
      return {
        type: 'SINGLE_SAVE',
        payload: structuredClone(
          strTransaction,
        ) as StrTransactionWithChangeLogs,
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
      if (!strTransaction) throw new Error('Transaction not found');
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

function getFormGroupId() {
  return crypto.randomUUID();
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
>;

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

type EditType = EditFormEditType extends { type: infer T } ? T : never;

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

type InvalidFormOptionsErrors = {
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
