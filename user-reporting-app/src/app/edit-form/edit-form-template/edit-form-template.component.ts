import { v4 as uuidv4 } from "uuid";
import {
  AfterViewInit,
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { MatFormField } from "@angular/material/form-field";
import { ClearFieldDirective } from "../clear-field.directive";
import { ControlToggleDirective } from "../control-toggle.directive";
import { ToggleEditFieldDirective } from "../toggle-edit-field.directive";
import { TransactionDateDirective } from "../transaction-date.directive";
import { TransactionTimeDirective } from "../transaction-time.directive";
import { CommonModule } from "@angular/common";
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatChipsModule } from "@angular/material/chips";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDividerModule } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatTabsModule } from "@angular/material/tabs";
import { MatToolbarModule } from "@angular/material/toolbar";
import {
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "../../change-log.service";
import {
  AccountHolder,
  Beneficiary,
  CompletingAction,
  Conductor,
  InvolvedIn,
  OnBehalfOf,
  SourceOfFunds,
  StartingAction,
  StrTxn,
} from "../../table/table.component";
import { StrTxnFormType, TypedForm } from "../edit-form.component";
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  AuditRequestPayload,
  CrossTabEditService,
  EditTabReqResType,
  EditTabReqResTypeLiterals,
} from "../../cross-tab-edit.service";
import {
  combineLatest,
  delay,
  filter,
  map,
  Observable,
  shareReplay,
  Subject,
  take,
  tap,
} from "rxjs";
import { MatOptionModule } from "@angular/material/core";
import { MatSelectModule } from "@angular/material/select";
import { startWith, takeUntil } from "rxjs/operators";

@Component({
  selector: "app-edit-form-template",
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TransactionDateDirective,
    TransactionTimeDirective,
    ControlToggleDirective,
    ToggleEditFieldDirective,
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
  ],
  template: ` <div class="container form-field-density mat-typography">
    <mat-toolbar class="justify-content-end">
      <ng-container *ngIf="editReqType !== 'AUDIT_REQUEST'; else auditDropdown">
        <button
          mat-raised-button
          color="primary"
          type="submit"
          (click)="onSubmit()"
        >
          Submit
        </button>
      </ng-container>
      <ng-template #auditDropdown>
        <!-- Standalone Dropdown, not part of strTxnForm -->
        <mat-form-field>
          <mat-select placeholder="Version" [formControl]="auditVersionControl">
            <mat-option
              *ngFor="let option of auditVersionOptions$ | async"
              [value]="option.value"
            >
              {{ option.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </ng-template>
    </mat-toolbar>
    <form
      *ngIf="strTxnForm$ | async as strTxnForm"
      [formGroup]="strTxnForm"
      (ngSubmit)="onSubmit()"
      [class.bulk-edit-form]="strTxnsBeforeBulkEdit"
      class="edit-form"
    >
      <!-- Main Tabs -->
      <mat-tab-group>
        <!-- Transaction Details Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span>Transaction Details</span>
            <mat-icon
              class="error-icon mx-1"
              [class.error-icon-show]="!strTxnForm.valid && strTxnForm.dirty"
              color="error"
              >error_outline</mat-icon
            >
          </ng-template>
          <div>
            <mat-card>
              <mat-card-header class="mb-3">
                <mat-card-title>Transaction Information</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="row row-cols-1 row-cols-md-2">
                  <mat-form-field class="col-xl-4">
                    <mat-label>Date of Transaction</mat-label>
                    <input
                      matInput
                      formControlName="dateOfTxn"
                      [matDatepicker]="dateOfTxnPicker"
                      appTransactionDate
                    />
                    <mat-datepicker-toggle
                      matIconSuffix
                      [for]="dateOfTxnPicker"
                    ></mat-datepicker-toggle>
                    <mat-datepicker #dateOfTxnPicker />
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appClearField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>backspace</mat-icon>
                    </button>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </mat-form-field>

                  <mat-form-field class="col-xl-4">
                    <mat-label>Time of Transaction</mat-label>
                    <input
                      matInput
                      formControlName="timeOfTxn"
                      type="time"
                      step="1"
                      appTransactionTime
                    />
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appClearField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>backspace</mat-icon>
                    </button>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </mat-form-field>

                  <div class="col-xl-4 d-flex">
                    <mat-checkbox
                      formControlName="hasPostingDate"
                      class="col-auto"
                    >
                      Has Posting Date?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="hasPostingDate"
                      mat-icon-button
                      matSuffix
                      class="col-auto"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3">
                  <mat-form-field class="col">
                    <mat-label>Date of Posting</mat-label>
                    <input
                      matInput
                      formControlName="dateOfPosting"
                      [matDatepicker]="dateOfPostingPicker"
                      appTransactionDate
                      appControlToggle="hasPostingDate"
                    />
                    <mat-datepicker-toggle
                      matIconSuffix
                      [for]="dateOfPostingPicker"
                    ></mat-datepicker-toggle>
                    <mat-datepicker #dateOfPostingPicker />
                  </mat-form-field>

                  <mat-form-field class="col">
                    <mat-label>Time of Posting</mat-label>
                    <input
                      matInput
                      formControlName="timeOfPosting"
                      type="time"
                      step="1"
                      appTransactionTime
                      appControlToggle="hasPostingDate"
                    />
                  </mat-form-field>
                </div>

                <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3">
                  <mat-form-field class="col">
                    <mat-label>Method of Transaction</mat-label>
                    <select matNativeControl formControlName="methodOfTxn">
                      <option value="ABM">ABM</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Online">Online</option>
                      <option value="Other">Other</option>
                    </select>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appClearField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>backspace</mat-icon>
                    </button>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </mat-form-field>

                  <mat-form-field class="col">
                    <mat-label>Other Method of Transaction</mat-label>
                    <input
                      matInput
                      formControlName="methodOfTxnOther"
                      appControlToggle="methodOfTxn"
                      appControlToggleValue="Other"
                    />
                  </mat-form-field>
                </div>

                <div class="row row-cols-1">
                  <div class="col-12 col-xl-4 d-flex">
                    <mat-checkbox
                      formControlName="wasTxnAttempted"
                      class="col-auto"
                    >
                      Was Transaction Attempted?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="wasTxnAttempted"
                      mat-icon-button
                      matSuffix
                      class="col-auto"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>

                  <mat-form-field class="col-12 col-xl-8">
                    <mat-label>Reason transaction was not completed</mat-label>
                    <input
                      matInput
                      formControlName="wasTxnAttemptedReason"
                      appControlToggle="wasTxnAttempted"
                    />
                  </mat-form-field>
                </div>

                <div class="row row-cols-md-3">
                  <mat-form-field class="col-md-8">
                    <mat-label>Purpose of Transaction</mat-label>
                    <input matInput formControlName="purposeOfTxn" />
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appClearField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>backspace</mat-icon>
                    </button>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </mat-form-field>
                </div>
                <div class="row row-cols-md-3">
                  <mat-form-field class="col-md-4">
                    <mat-label>Reporting Entity Location</mat-label>
                    <input
                      matInput
                      formControlName="reportingEntityLocationNo"
                    />
                  </mat-form-field>
                  <mat-form-field class="col-md-8">
                    <mat-label>Reporting Entity Ref No</mat-label>
                    <input
                      matInput
                      formControlName="reportingEntityTxnRefNo"
                      readonly="true"
                    />
                  </mat-form-field>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Starting Actions Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span>Starting Actions</span>
            <mat-icon
              class="error-icon mx-1"
              [class.error-icon-show]="
                !strTxnForm.controls.startingActions.valid &&
                strTxnForm.controls.startingActions.dirty
              "
              color="error"
              >error_outline</mat-icon
            >
          </ng-template>
          <div class="d-flex flex-column align-items-end">
            <button
              type="button"
              mat-raised-button
              color="primary"
              (click)="addStartingAction(!!this.strTxnsBeforeBulkEdit)"
              class="m-2"
            >
              <mat-icon>add</mat-icon> Add Starting Action
            </button>

            <div
              formArrayName="startingActions"
              class="w-100 d-flex flex-column gap-3"
            >
              <div
                *ngFor="
                  let saAction of strTxnForm.controls.startingActions.controls;
                  let saIndex = index
                "
                [formGroupName]="saIndex"
              >
                <mat-expansion-panel [expanded]="true">
                  <mat-expansion-panel-header class="mb-3">
                    <mat-panel-title class="d-flex align-items-center"
                      ><h1>Starting Action #{{ saIndex + 1 }}</h1>
                      <button
                        type="button"
                        mat-icon-button
                        (click)="removeStartingAction(saIndex)"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>Direction</mat-label>
                      <select matNativeControl formControlName="directionOfSA">
                        <option value="In">In</option>
                        <option value="Out">Out</option>
                        <!-- Options here -->
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Type of Funds</mat-label>
                      <select matNativeControl formControlName="typeOfFunds">
                        <option value="Funds Withdrawal">
                          Funds Withdrawal
                        </option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Domestic Funds Transfer">
                          Domestic Funds Transfer
                        </option>
                        <option value="Email Monel Transfer">
                          Email Monel Transfer
                        </option>
                        <option value="Other">Other</option>
                        <!-- Options here -->
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Other Type of Funds</mat-label>
                      <input
                        matInput
                        formControlName="typeOfFundsOther"
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.typeOfFunds'
                        "
                        appControlToggleValue="Other"
                      />
                    </mat-form-field>
                  </div>

                  <!-- Amount Section -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>Amount</mat-label>
                      <input matInput type="number" formControlName="amount" />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col">
                      <mat-label>Currency</mat-label>
                      <select matNativeControl formControlName="currency">
                        <option value=""></option>
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Information -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>FIU Number</mat-label>
                      <input matInput formControlName="fiuNo" />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col">
                      <mat-label>Branch</mat-label>
                      <input
                        matInput
                        formControlName="branch"
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col">
                      <mat-label>Account Number</mat-label>
                      <input
                        matInput
                        formControlName="account"
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Information -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>Account Type</mat-label>
                      <select
                        matNativeControl
                        formControlName="accountType"
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      >
                        <option value=""></option>
                        <option value="Business">Business</option>
                        <option value="Casino">Casino</option>
                        <option value="Personal">Personal</option>
                        <option value="Other">Other</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Other Account Type</mat-label>
                      <input
                        matInput
                        formControlName="accountTypeOther"
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.accountType'
                        "
                        appControlToggleValue="Other"
                      />
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Account Currency</mat-label>
                      <select
                        matNativeControl
                        formControlName="accountCurrency"
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      >
                        <option value=""></option>
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Account Status</mat-label>
                      <select
                        matNativeControl
                        formControlName="accountStatus"
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      >
                        <option value=""></option>
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Dorment">Dorment</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Open/Close -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-3">
                    <mat-form-field class="col">
                      <mat-label>Account Open Date</mat-label>
                      <input
                        matInput
                        formControlName="accountOpen"
                        [matDatepicker]="accountOpenPicker"
                        appTransactionDate
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      />
                      <mat-datepicker-toggle
                        matIconSuffix
                        [for]="accountOpenPicker"
                      ></mat-datepicker-toggle>
                      <mat-datepicker #accountOpenPicker />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col">
                      <mat-label>Account Close Date</mat-label>
                      <input
                        matInput
                        formControlName="accountClose"
                        [matDatepicker]="accountClosePicker"
                        appTransactionDate
                        [appControlToggle]="
                          'startingActions.' + saIndex + '.accountStatus'
                        "
                        appControlToggleValue="Closed"
                        [appControlRequired]="true"
                      />

                      <mat-datepicker-toggle
                        matIconSuffix
                        [for]="accountClosePicker"
                      ></mat-datepicker-toggle>
                      <mat-datepicker #accountClosePicker />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <div class="row">
                    <mat-form-field class="col-12">
                      <mat-label>How Funds Were Obtained</mat-label>
                      <textarea
                        matInput
                        formControlName="howFundsObtained"
                        rows="2"
                      ></textarea>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Holders Section -->
                  <h2>Account Holders</h2>
                  <div class="row">
                    <mat-checkbox
                      class="col"
                      formControlName="hasAccountHolders"
                    >
                      Has account holders?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="hasAccountHolders"
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>

                  <div
                    formArrayName="accountHolders"
                    class="d-flex flex-column align-items-end"
                    [appControlToggle]="
                      'startingActions.' + saIndex + '.hasAccountHolders'
                    "
                    (addControlGroup)="
                      addAccountHolder('startingActions', saIndex)
                    "
                  >
                    <mat-card class="w-100 border-0">
                      <div class="row row-cols-1 row-md-cols-2">
                        <div
                          *ngFor="
                            let holder of saAction.controls.accountHolders
                              ?.controls;
                            let holderIndex = index
                          "
                          [formGroupName]="holderIndex"
                          class="col-md-6 my-2"
                        >
                          <div class="row">
                            <mat-form-field class="col">
                              <mat-label>Link to Subject</mat-label>
                              <input matInput formControlName="linkToSub" />
                            </mat-form-field>
                            <button
                              type="button"
                              mat-icon-button
                              (click)="
                                removeAccountHolder(
                                  'startingActions',
                                  saIndex,
                                  holderIndex
                                )
                              "
                              class="col-auto"
                            >
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        </div>
                      </div>
                    </mat-card>

                    <button
                      type="button"
                      mat-raised-button
                      color="primary"
                      (click)="addAccountHolder('startingActions', saIndex)"
                    >
                      <mat-icon>add</mat-icon> Add Account Holder
                    </button>
                  </div>

                  <!-- Source of Funds Section -->
                  <h2>Source of Funds</h2>
                  <div class="row">
                    <mat-checkbox
                      class="col"
                      formControlName="wasSofInfoObtained"
                    >
                      Was Source of Funds Info Obtained?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="wasSofInfoObtained"
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>

                  <div
                    formArrayName="sourceOfFunds"
                    class="d-flex flex-column align-items-end gap-3"
                    [appControlToggle]="
                      'startingActions.' + saIndex + '.wasSofInfoObtained'
                    "
                    (addControlGroup)="addSourceOfFunds(saIndex)"
                  >
                    <div
                      *ngFor="
                        let source of saAction.controls.sourceOfFunds.controls;
                        let fundsIndex = index
                      "
                      [formGroupName]="fundsIndex"
                      class="w-100"
                    >
                      <mat-expansion-panel [expanded]="true">
                        <mat-expansion-panel-header>
                          <mat-panel-title class="d-flex align-items-center"
                            ><h3>Source of Funds #{{ fundsIndex + 1 }}</h3>
                            <button
                              type="button"
                              mat-icon-button
                              (click)="removeSourceOfFunds(saIndex, fundsIndex)"
                            >
                              <mat-icon>delete</mat-icon>
                            </button>
                          </mat-panel-title>
                        </mat-expansion-panel-header>

                        <div class="row row-cols-1 row-cols-md-2">
                          <mat-form-field class="col">
                            <mat-label>Link to Subject</mat-label>
                            <input matInput formControlName="linkToSub" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Account Number</mat-label>
                            <input matInput formControlName="accountNumber" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Policy Number</mat-label>
                            <input matInput formControlName="policyNumber" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Identifying Number</mat-label>
                            <input
                              matInput
                              formControlName="identifyingNumber"
                            />
                          </mat-form-field>
                        </div>
                      </mat-expansion-panel>
                    </div>
                    <button
                      type="button"
                      mat-raised-button
                      color="primary"
                      (click)="addSourceOfFunds(saIndex)"
                    >
                      <mat-icon>add</mat-icon> Add Source of Funds
                    </button>
                  </div>

                  <!-- Conductors Section -->
                  <h2>Conductors</h2>
                  <div class="row">
                    <mat-checkbox
                      class="col"
                      formControlName="wasCondInfoObtained"
                    >
                      Was Conductor Info Obtained?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="wasCondInfoObtained"
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>

                  <div
                    formArrayName="conductors"
                    class="d-flex flex-column align-items-end gap-3"
                    [appControlToggle]="
                      'startingActions.' + saIndex + '.wasCondInfoObtained'
                    "
                    (addControlGroup)="addConductor(saIndex)"
                  >
                    <div
                      *ngFor="
                        let conductor of saAction.controls.conductors.controls;
                        let condIndex = index
                      "
                      [formGroupName]="condIndex"
                      class="w-100"
                    >
                      <mat-expansion-panel [expanded]="true">
                        <mat-expansion-panel-header>
                          <mat-panel-title class="d-flex align-items-center"
                            ><h3>Conductor #{{ condIndex + 1 }}</h3>
                            <button
                              type="button"
                              mat-icon-button
                              (click)="removeConductor(saIndex, condIndex)"
                            >
                              <mat-icon>delete</mat-icon>
                            </button>
                          </mat-panel-title>
                        </mat-expansion-panel-header>

                        <div class="row row-cols-1 row-cols-md-2">
                          <mat-form-field class="col">
                            <mat-label>Link to Subject</mat-label>
                            <input matInput formControlName="linkToSub" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Client Number</mat-label>
                            <input matInput formControlName="clientNo" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Email</mat-label>
                            <input
                              matInput
                              type="email"
                              formControlName="email"
                            />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>URL</mat-label>
                            <input matInput type="url" formControlName="url" />
                          </mat-form-field>
                        </div>

                        <h3>On Behalf Of</h3>

                        <div class="row">
                          <mat-checkbox formControlName="wasConductedOnBehalf">
                            Was Conducted On Behalf Of Others?
                          </mat-checkbox>
                        </div>

                        <!-- On Behalf Of Subsection -->
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
                          (addControlGroup)="addOnBehalfOf(saIndex, condIndex)"
                        >
                          <div
                            *ngFor="
                              let behalf of conductor.controls.onBehalfOf
                                .controls;
                              let behalfIndex = index
                            "
                            [formGroupName]="behalfIndex"
                            class="w-100"
                          >
                            <mat-expansion-panel [expanded]="true">
                              <mat-expansion-panel-header>
                                <mat-panel-title
                                  class="d-flex align-items-center"
                                  ><h3>On Behalf Of #{{ behalfIndex + 1 }}</h3>
                                  <button
                                    type="button"
                                    mat-icon-button
                                    (click)="
                                      removeOnBehalfOf(
                                        saIndex,
                                        condIndex,
                                        behalfIndex
                                      )
                                    "
                                  >
                                    <mat-icon>delete</mat-icon>
                                  </button>
                                </mat-panel-title>
                              </mat-expansion-panel-header>

                              <div class="row row-cols-1 row-cols-md-2">
                                <mat-form-field class="col">
                                  <mat-label>Link to Subject</mat-label>
                                  <input matInput formControlName="linkToSub" />
                                </mat-form-field>

                                <mat-form-field class="col">
                                  <mat-label>Client Number</mat-label>
                                  <input matInput formControlName="clientNo" />
                                </mat-form-field>

                                <mat-form-field class="col">
                                  <mat-label>Email</mat-label>
                                  <input
                                    matInput
                                    type="email"
                                    formControlName="email"
                                  />
                                </mat-form-field>

                                <mat-form-field class="col">
                                  <mat-label>URL</mat-label>
                                  <input
                                    matInput
                                    type="url"
                                    formControlName="url"
                                  />
                                </mat-form-field>

                                <mat-form-field class="col">
                                  <mat-label>Relation to Conductor</mat-label>
                                  <select
                                    matNativeControl
                                    formControlName="relationToCond"
                                  >
                                    <option value="Accountant">
                                      Accountant
                                    </option>
                                    <option value="Agent">Agent</option>
                                    <option value="Borrower">Borrower</option>
                                    <option value="Broker">Broker</option>
                                    <option value="Joint/Secondary Owner">
                                      Joint/Secondary Owner
                                    </option>
                                    <option value="Employer">Employer</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </mat-form-field>

                                <mat-form-field class="col">
                                  <mat-label>Other Relation</mat-label>
                                  <input
                                    matInput
                                    formControlName="relationToCondOther"
                                    [appControlToggle]="
                                      'startingActions.' +
                                      saIndex +
                                      '.conductors.' +
                                      condIndex +
                                      '.onBehalfOf.' +
                                      behalfIndex +
                                      '.relationToCond'
                                    "
                                    appControlToggleValue="Other"
                                  />
                                </mat-form-field>
                              </div>
                            </mat-expansion-panel>
                          </div>
                          <button
                            type="button"
                            mat-raised-button
                            color="primary"
                            (click)="addOnBehalfOf(saIndex, condIndex)"
                          >
                            <mat-icon>add</mat-icon> Add On Behalf Of
                          </button>
                        </div>
                      </mat-expansion-panel>
                    </div>
                    <button
                      type="button"
                      mat-raised-button
                      color="primary"
                      (click)="addConductor(saIndex)"
                    >
                      <mat-icon>add</mat-icon> Add Conductor
                    </button>
                  </div>
                </mat-expansion-panel>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Completing Actions Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span>Completing Actions</span>
            <mat-icon
              class="error-icon mx-1"
              [class.error-icon-show]="
                !strTxnForm.controls.completingActions.valid &&
                strTxnForm.controls.completingActions.dirty
              "
              color="error"
              >error_outline</mat-icon
            >
          </ng-template>
          <div class="d-flex flex-column align-items-end">
            <button
              type="button"
              mat-raised-button
              color="primary"
              (click)="addCompletingAction(!!this.strTxnsBeforeBulkEdit)"
              class="m-2"
            >
              <mat-icon>add</mat-icon> Add Completing Action
            </button>

            <div
              formArrayName="completingActions"
              class="w-100 d-flex flex-column gap-3"
            >
              <div
                *ngFor="
                  let caAction of strTxnForm.controls.completingActions
                    .controls;
                  let caIndex = index
                "
                [formGroupName]="caIndex"
              >
                <mat-expansion-panel [expanded]="true">
                  <mat-expansion-panel-header>
                    <mat-panel-title class="d-flex align-items-center"
                      ><h1>Completing Action #{{ caIndex + 1 }}</h1>
                      <button
                        type="button"
                        mat-icon-button
                        (click)="removeCompletingAction(caIndex)"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  <!-- Disposition Details -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>Details of Disposition</mat-label>
                      <select matNativeControl formControlName="detailsOfDispo">
                        <option value="Deposit to account">
                          Deposit to account
                        </option>
                        <option value="Cash Withdrawal">Cash Withdrawal</option>
                        <option value="Issued Cheque">Issued Cheque</option>
                        <option value="Outgoing Email Transfer">
                          Outgoing Email Transfer
                        </option>
                        <option value="Other">Other</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Other Details of Disposition</mat-label>
                      <input
                        matInput
                        formControlName="detailsOfDispoOther"
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.detailsOfDispo'
                        "
                        appControlToggleValue="Other"
                      />
                    </mat-form-field>
                  </div>

                  <!-- Amount Section -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>Amount</mat-label>
                      <input matInput type="number" formControlName="amount" />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Currency</mat-label>
                      <select matNativeControl formControlName="currency">
                        <option value=""></option>
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                        <!-- Add other currencies -->
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Exchange Rate</mat-label>
                      <input
                        matInput
                        type="number"
                        formControlName="exchangeRate"
                      />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Value in CAD</mat-label>
                      <input
                        matInput
                        type="number"
                        formControlName="valueInCad"
                      />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Information -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>FIU Number</mat-label>
                      <input matInput formControlName="fiuNo" />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col">
                      <mat-label>Branch</mat-label>
                      <input
                        matInput
                        formControlName="branch"
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col">
                      <mat-label>Account Number</mat-label>
                      <input
                        matInput
                        formControlName="account"
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Information -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                    <mat-form-field class="col">
                      <mat-label>Account Type</mat-label>
                      <select
                        matNativeControl
                        formControlName="accountType"
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      >
                        <option value=""></option>
                        <option value="Business">Business</option>
                        <option value="Casino">Casino</option>
                        <option value="Personal">Personal</option>
                        <option value="Other">Other</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Other Account Type</mat-label>
                      <input
                        matInput
                        formControlName="accountTypeOther"
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.accountType'
                        "
                        appControlToggleValue="Other"
                      />
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Account Currency</mat-label>
                      <select
                        matNativeControl
                        formControlName="accountCurrency"
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      >
                        <option value=""></option>
                        <option value="CAD">CAD</option>
                        <option value="USD">USD</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Account Status</mat-label>
                      <select
                        matNativeControl
                        formControlName="accountStatus"
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      >
                        <option value=""></option>
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Dormant">Dormant</option>
                      </select>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Open/Close -->
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-3">
                    <mat-form-field class="col">
                      <mat-label>Account Open Date</mat-label>
                      <input
                        matInput
                        formControlName="accountOpen"
                        [matDatepicker]="accountOpenPicker"
                        appTransactionDate
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.fiuNo'
                        "
                        appControlToggleValue="010"
                        [appControlRequired]="true"
                      />

                      <mat-datepicker-toggle
                        matIconSuffix
                        [for]="accountOpenPicker"
                      ></mat-datepicker-toggle>
                      <mat-datepicker #accountOpenPicker />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col">
                      <mat-label>Account Close Date</mat-label>
                      <input
                        matInput
                        formControlName="accountClose"
                        [matDatepicker]="accountClosePicker"
                        appTransactionDate
                        [appControlToggle]="
                          'completingActions.' + caIndex + '.accountStatus'
                        "
                        appControlToggleValue="Closed"
                        [appControlRequired]="true"
                      />

                      <mat-datepicker-toggle
                        matIconSuffix
                        [for]="accountClosePicker"
                      ></mat-datepicker-toggle>
                      <mat-datepicker #accountClosePicker />
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.strTxnsBeforeBulkEdit"
                        type="button"
                        appToggleEditField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>edit</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>

                  <!-- Account Holders Section -->
                  <h2>Account Holders</h2>
                  <div class="row">
                    <mat-checkbox
                      class="col"
                      formControlName="hasAccountHolders"
                    >
                      Has account holders?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="hasAccountHolders"
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>

                  <div
                    formArrayName="accountHolders"
                    class="d-flex flex-column align-items-end"
                    [appControlToggle]="
                      'completingActions.' + caIndex + '.hasAccountHolders'
                    "
                    (addControlGroup)="
                      addAccountHolder('completingActions', caIndex)
                    "
                  >
                    <mat-card class="w-100 border-0">
                      <div class="row row-cols-1 row-md-cols-2">
                        <div
                          *ngFor="
                            let holder of caAction.controls.accountHolders
                              ?.controls;
                            let holderIndex = index
                          "
                          [formGroupName]="holderIndex"
                          class="col-md-6 my-2"
                        >
                          <div class="row">
                            <mat-form-field class="col">
                              <mat-label>Link to Subject</mat-label>
                              <input matInput formControlName="linkToSub" />
                            </mat-form-field>
                            <button
                              type="button"
                              mat-icon-button
                              (click)="
                                removeAccountHolder(
                                  'completingActions',
                                  caIndex,
                                  holderIndex
                                )
                              "
                              class="col-auto"
                            >
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        </div>
                      </div>
                    </mat-card>

                    <button
                      type="button"
                      mat-raised-button
                      color="primary"
                      (click)="addAccountHolder('completingActions', caIndex)"
                    >
                      <mat-icon>add</mat-icon> Add Account Holder
                    </button>
                  </div>

                  <!-- Involved In Section -->
                  <h2>Other Involved Subjects</h2>
                  <div class="row">
                    <mat-checkbox
                      class="col"
                      formControlName="wasAnyOtherSubInvolved"
                    >
                      Was any other subject involved?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="wasAnyOtherSubInvolved"
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>

                  <div
                    formArrayName="involvedIn"
                    class="d-flex flex-column align-items-end gap-3"
                    [appControlToggle]="
                      'completingActions.' + caIndex + '.wasAnyOtherSubInvolved'
                    "
                    (addControlGroup)="addInvolvedIn(caIndex)"
                  >
                    <div
                      *ngFor="
                        let involved of caAction.controls.involvedIn?.controls;
                        let invIndex = index
                      "
                      [formGroupName]="invIndex"
                      class="w-100"
                    >
                      <mat-expansion-panel [expanded]="true">
                        <mat-expansion-panel-header>
                          <mat-panel-title class="d-flex align-items-center"
                            ><h3>Involved Subject #{{ invIndex + 1 }}</h3>
                            <button
                              type="button"
                              mat-icon-button
                              (click)="removeInvolvedIn(caIndex, invIndex)"
                            >
                              <mat-icon>delete</mat-icon>
                            </button>
                          </mat-panel-title>
                        </mat-expansion-panel-header>

                        <div class="row row-cols-1 row-cols-md-2">
                          <mat-form-field class="col">
                            <mat-label>Link to Subject</mat-label>
                            <input matInput formControlName="linkToSub" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Account Number</mat-label>
                            <input matInput formControlName="accountNumber" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Policy Number</mat-label>
                            <input matInput formControlName="policyNumber" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Identifying Number</mat-label>
                            <input
                              matInput
                              formControlName="identifyingNumber"
                            />
                          </mat-form-field>
                        </div>
                      </mat-expansion-panel>
                    </div>
                    <button
                      type="button"
                      mat-raised-button
                      color="primary"
                      (click)="addInvolvedIn(caIndex)"
                    >
                      <mat-icon>add</mat-icon> Add Involved Subject
                    </button>
                  </div>

                  <!-- Beneficiaries Section -->
                  <h2>Beneficiaries</h2>
                  <div class="row">
                    <mat-checkbox
                      class="col"
                      formControlName="wasBenInfoObtained"
                    >
                      Was Beneficiary Info Obtained?
                    </mat-checkbox>
                    <button
                      [disabled]="!this.strTxnsBeforeBulkEdit"
                      type="button"
                      appToggleEditField="wasBenInfoObtained"
                      mat-icon-button
                      matSuffix
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>

                  <div
                    formArrayName="beneficiaries"
                    class="d-flex flex-column align-items-end gap-3"
                    [appControlToggle]="
                      'completingActions.' + caIndex + '.wasBenInfoObtained'
                    "
                    (addControlGroup)="addBeneficiary(caIndex)"
                  >
                    <div
                      *ngFor="
                        let beneficiary of caAction.controls.beneficiaries
                          ?.controls;
                        let benIndex = index
                      "
                      [formGroupName]="benIndex"
                      class="w-100"
                    >
                      <mat-expansion-panel [expanded]="true">
                        <mat-expansion-panel-header>
                          <mat-panel-title class="d-flex align-items-center"
                            ><h3>Beneficiary #{{ benIndex + 1 }}</h3>
                            <button
                              type="button"
                              mat-icon-button
                              (click)="removeBeneficiary(caIndex, benIndex)"
                            >
                              <mat-icon>delete</mat-icon>
                            </button>
                          </mat-panel-title>
                        </mat-expansion-panel-header>

                        <div class="row row-cols-1 row-cols-md-2">
                          <mat-form-field class="col">
                            <mat-label>Link to Subject</mat-label>
                            <input matInput formControlName="linkToSub" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Client Number</mat-label>
                            <input matInput formControlName="clientNo" />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>Email</mat-label>
                            <input
                              matInput
                              type="email"
                              formControlName="email"
                            />
                          </mat-form-field>

                          <mat-form-field class="col">
                            <mat-label>URL</mat-label>
                            <input matInput type="url" formControlName="url" />
                          </mat-form-field>
                        </div>
                      </mat-expansion-panel>
                    </div>
                    <button
                      type="button"
                      mat-raised-button
                      color="primary"
                      (click)="addBeneficiary(caIndex)"
                    >
                      <mat-icon>add</mat-icon> Add Beneficiary
                    </button>
                  </div>
                </mat-expansion-panel>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
      <!-- <pre class="overlay-pre">Form values: {{ strTxnForm.value | json }}</pre> -->
    </form>
  </div>`,
  styleUrl: "./edit-form-template.component.scss",
})
export class EditFormTemplateComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input({ required: true }) editReq$: Observable<
    { sessionId: string } & EditTabReqResType
  > | null = null;

  strTxnForm$: Observable<StrTxnFormType> = null!;
  readonly strTxnBeforeEdit: WithVersion<StrTxn> | null = null;
  readonly strTxnsBeforeBulkEdit: WithVersion<StrTxn>[] | null = null;
  readonly sessionId: string = null!;
  readonly editReqType: EditTabReqResTypeLiterals = null!;

  snackBar = inject(MatSnackBar);
  constructor(
    private crossTabEditService: CrossTabEditService,
    private changeLogService: ChangeLogService<StrTxn>,
  ) {}
  ngAfterViewInit(): void {
    combineLatest([this.strTxnForm$, this.editReq$!])
      .pipe(
        takeUntil(this.destroy$),
        delay(0),
        map(([form, { type }]) => {
          if (type === "AUDIT_REQUEST") {
            form.disable();

            const sActions = form.controls.startingActions;
            const cActions = form.controls.completingActions;
            sActions.controls.forEach((sa) => {
              Object.values(sa.controls).forEach((control) => {
                control.disable();
              });
            });
            cActions.controls.forEach((sa) => {
              Object.values(sa.controls).forEach((control) => {
                control.disable();
              });
            });
          }
        }),
      )
      .subscribe();
  }
  private destroy$ = new Subject<void>();
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngOnInit(): void {
    this.strTxnForm$ = combineLatest([
      this.editReq$!,
      this.auditVersionControl.valueChanges.pipe(startWith(0)),
    ]).pipe(
      takeUntil(this.destroy$),
      map(([{ sessionId, type, payload }, auditVersion]) => {
        (this.sessionId as string) = sessionId;
        (this.editReqType as EditTabReqResTypeLiterals) = type;
        if (type === "EDIT_REQUEST") {
          (this.strTxnBeforeEdit as WithVersion<StrTxn>) = payload;
          return this.createStrTxnForm({
            txn: payload,
            options: { disabled: false },
          });
        }
        if (type === "BULK_EDIT_REQUEST") {
          (this.strTxnsBeforeBulkEdit as WithVersion<StrTxn>[]) = payload;
          return this.createStrTxnForm({
            options: { isBulkEdit: true, disabled: true },
          });
        }
        if (type === "AUDIT_REQUEST") {
          return this.createStrTxnForm({
            txn: this.changeLogService.applyChanges(
              payload.auditTxnv0WithVersion,
              payload.auditTxnChangeLogs.filter(
                (log) => log.version <= auditVersion,
              ),
            ),
            options: { disabled: true },
          });
        }
        return null!;
      }),
      tap((form) => form.markAllAsTouched()),
      shareReplay(1),
    );

    this.auditVersionOptions$ = this.editReq$!.pipe(
      take(1),
      filter(({ type }) => type === "AUDIT_REQUEST"),
      tap(() => this.auditVersionControl.setValue(0)),
      map(({ payload }) => {
        const verMap = new Map([[0, 0]]);
        (payload as AuditRequestPayload).auditTxnChangeLogs
          .filter((log) => log.path !== "highlightColor")
          .reduce((acc, log) => {
            if (Array.from(acc.values()).includes(log.version)) return acc;

            let lastLabelIndex = [...acc].at(-1)![0];
            return acc.set(++lastLabelIndex, log.version);
          }, verMap);

        return Array.from(verMap.entries()).map(([key, val]) => ({
          label: `v${String(key)}`,
          value: val,
        }));
      }),
    );
  }

  // ----------------------
  // Form Submission
  // ----------------------
  isSubmitted = false;
  onSubmit(): void {
    // console.log(
    //   "🚀 ~ EditFormComponent ~ onSubmit ~ this.userForm!.value:",
    //   this.strTxnForm!.value,
    // );
    const isBulkEditSubmitted =
      this.isSubmitted && !!this.strTxnsBeforeBulkEdit;

    if (isBulkEditSubmitted) {
      this.snackBar.open(
        "Edits already saved please close this tab!",
        "Dismiss",
        {
          duration: 5000,
        },
      );
      return;
    }
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      if (!this.strTxnsBeforeBulkEdit) {
        const changes: ChangeLogWithoutVersion[] = [];
        this.changeLogService.compareProperties(
          this.strTxnBeforeEdit,
          form.value,
          changes,
        );
        this.crossTabEditService.saveEditResponseToLocalStorage(
          this.sessionId,
          {
            type: "EDIT_RESULT",
            payload: {
              strTxnId: this.strTxnBeforeEdit!._mongoid,
              changeLogs: changes,
            },
          },
        );
        (this.strTxnBeforeEdit as WithVersion<StrTxn>) =
          form.value as any as WithVersion<StrTxn>;
      } else {
        this.crossTabEditService.saveEditResponseToLocalStorage(
          this.sessionId,
          {
            type: "BULK_EDIT_RESULT",
            payload: this.strTxnsBeforeBulkEdit.map((txnBefore) => {
              const changes: ChangeLogWithoutVersion[] = [];
              this.changeLogService.compareProperties(
                txnBefore,
                form.getRawValue(),
                changes,
                { discriminator: "index" },
              );
              return { changeLogs: changes, strTxnId: txnBefore._mongoid };
            }),
          },
        );
      }
      this.snackBar.open("Edits saved!", "Dismiss", {
        duration: 5000,
      });
      this.isSubmitted = true;
    });
  }

  public createStrTxnForm({
    txn,
    options,
  }: {
    txn?: WithVersion<StrTxn> | StrTxn | null;
    options: { isBulkEdit?: boolean; disabled: boolean };
  }): StrTxnFormType {
    const { isBulkEdit: createEmptyArrays = false, disabled } = options;

    const strTxnForm = new FormGroup({
      _version: new FormControl<number>({
        value: (txn as { _version: number })?._version || 0,
        disabled,
      }),
      _mongoid: new FormControl({
        value: txn?._mongoid || `mtxn-${uuidv4()}`,
        disabled,
      }),
      wasTxnAttempted: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "wasTxnAttempted",
          txn?.wasTxnAttempted,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      wasTxnAttemptedReason: new FormControl(
        { value: txn?.wasTxnAttemptedReason || "", disabled },
        Validators.required,
      ),
      dateOfTxn: new FormControl(
        { value: txn?.dateOfTxn || "", disabled },
        Validators.required,
      ),
      timeOfTxn: new FormControl(
        { value: txn?.timeOfTxn || "", disabled },
        Validators.required,
      ),
      hasPostingDate: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "hasPostingDate",
          txn?.hasPostingDate,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      dateOfPosting: new FormControl(
        { value: txn?.dateOfPosting || "", disabled },
        Validators.required,
      ),
      timeOfPosting: new FormControl(
        { value: txn?.timeOfPosting || "", disabled },
        Validators.required,
      ),
      methodOfTxn: new FormControl(
        { value: txn?.methodOfTxn || "", disabled },
        Validators.required,
      ),
      methodOfTxnOther: new FormControl(
        { value: txn?.methodOfTxnOther || "", disabled },
        Validators.required,
      ),
      reportingEntityTxnRefNo: new FormControl({
        value: txn?.reportingEntityTxnRefNo || "",
        disabled,
      }),
      purposeOfTxn: new FormControl({
        value: txn?.purposeOfTxn || "",
        disabled,
      }),
      reportingEntityLocationNo: new FormControl(
        { value: txn?.reportingEntityLocationNo || "", disabled },
        [Validators.required, Validators.minLength(5), Validators.maxLength(5)],
      ),
      startingActions: new FormArray(
        txn?.startingActions?.map((action) =>
          this.createStartingActionGroup({ action, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [
                this.createStartingActionGroup({
                  options: { createEmptyArrays, disabled },
                }),
              ]
            : []),
      ),
      completingActions: new FormArray(
        txn?.completingActions?.map((action) =>
          this.createCompletingActionGroup({ action, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [
                this.createCompletingActionGroup({
                  options: { createEmptyArrays, disabled },
                }),
              ]
            : []),
      ),
    });

    return strTxnForm;
  }

  // --------------------------
  // Form Group Creation Methods
  // --------------------------
  private createStartingActionGroup({
    action,
    options,
  }: {
    action?: StartingAction;
    options: { createEmptyArrays?: boolean; disabled: boolean };
  }): FormGroup {
    const { createEmptyArrays = false, disabled } = options;

    if (action?.accountHolders)
      action.hasAccountHolders = action.accountHolders.length > 0;

    return new FormGroup({
      _id: new FormControl({ value: action?._id || uuidv4(), disabled }),
      directionOfSA: new FormControl({
        value: action?.directionOfSA || "",
        disabled,
      }),
      typeOfFunds: new FormControl({
        value: action?.typeOfFunds || "",
        disabled,
      }),
      typeOfFundsOther: new FormControl(
        { value: action?.typeOfFundsOther || "", disabled },
        Validators.required,
      ),
      amount: new FormControl(
        { value: action?.amount || null, disabled },
        Validators.required,
      ),
      currency: new FormControl({ value: action?.currency || "", disabled }),
      fiuNo: new FormControl({ value: action?.fiuNo || "", disabled }),
      branch: new FormControl({ value: action?.branch || "", disabled }, [
        Validators.minLength(5),
        Validators.maxLength(5),
      ]),
      account: new FormControl({ value: action?.account || "", disabled }),
      accountType: new FormControl({
        value: action?.accountType || "",
        disabled,
      }),
      accountTypeOther: new FormControl(
        { value: action?.accountTypeOther || "", disabled },
        Validators.required,
      ),
      accountOpen: new FormControl({
        value: action?.accountOpen || "",
        disabled,
      }),
      accountClose: new FormControl({
        value: action?.accountClose || "",
        disabled,
      }),
      accountStatus: new FormControl({
        value: action?.accountStatus || "",
        disabled,
      }),
      howFundsObtained: new FormControl({
        value: action?.howFundsObtained || "",
        disabled,
      }),
      accountCurrency: new FormControl({
        value: action?.accountCurrency || "",
        disabled,
      }),
      hasAccountHolders: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "hasAccountHolders",
          action?.hasAccountHolders,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup({ holder, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [this.createAccountHolderGroup({ options: { disabled } })]
            : []),
      ),
      wasSofInfoObtained: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "wasSofInfoObtained",
          action?.wasSofInfoObtained,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      sourceOfFunds: new FormArray(
        action?.sourceOfFunds?.map((source) =>
          this.createSourceOfFundsGroup({ source, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [this.createSourceOfFundsGroup({ options: { disabled } })]
            : []),
      ),
      wasCondInfoObtained: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "wasCondInfoObtained",
          action?.wasCondInfoObtained,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      conductors: new FormArray(
        action?.conductors?.map((conductor) =>
          this.createConductorGroup({ conductor, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [this.createConductorGroup({ options: { disabled } })]
            : []),
      ),
    });
  }

  private createCompletingActionGroup({
    action,
    options,
  }: {
    action?: CompletingAction;
    options: { createEmptyArrays?: boolean; disabled: boolean };
  }): FormGroup {
    const { createEmptyArrays = false, disabled } = options;

    if (action?.accountHolders)
      action.hasAccountHolders = action.accountHolders.length > 0;

    return new FormGroup({
      _id: new FormControl({ value: action?._id || uuidv4(), disabled }),
      detailsOfDispo: new FormControl({
        value: action?.detailsOfDispo || "",
        disabled,
      }),
      detailsOfDispoOther: new FormControl(
        { value: action?.detailsOfDispoOther || "", disabled },
        Validators.required,
      ),
      amount: new FormControl(
        { value: action?.amount || null, disabled },
        Validators.required,
      ),
      currency: new FormControl({ value: action?.currency || "", disabled }),
      exchangeRate: new FormControl({
        value: action?.exchangeRate || null,
        disabled,
      }),
      valueInCad: new FormControl({
        value: action?.valueInCad || null,
        disabled,
      }),
      fiuNo: new FormControl({ value: action?.fiuNo || "", disabled }),
      branch: new FormControl({ value: action?.branch || "", disabled }, [
        Validators.minLength(5),
        Validators.maxLength(5),
      ]),
      account: new FormControl({ value: action?.account || "", disabled }),
      accountType: new FormControl({
        value: action?.accountType || "",
        disabled,
      }),
      accountTypeOther: new FormControl(
        { value: action?.accountTypeOther || "", disabled },
        Validators.required,
      ),
      accountCurrency: new FormControl({
        value: action?.accountCurrency || "",
        disabled,
      }),
      accountOpen: new FormControl({
        value: action?.accountOpen || "",
        disabled,
      }),
      accountClose: new FormControl({
        value: action?.accountClose || "",
        disabled,
      }),
      accountStatus: new FormControl({
        value: action?.accountStatus || "",
        disabled,
      }),
      hasAccountHolders: new FormControl({
        value: action?.hasAccountHolders || null,
        disabled,
      }),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup({ holder, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [this.createAccountHolderGroup({ options: { disabled } })]
            : []),
      ),
      wasAnyOtherSubInvolved: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "wasAnyOtherSubInvolved",
          action?.wasAnyOtherSubInvolved,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      involvedIn: new FormArray(
        action?.involvedIn?.map((involved) =>
          this.createInvolvedInGroup({ involved, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [this.createInvolvedInGroup({ options: { disabled } })]
            : []),
      ),
      wasBenInfoObtained: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "wasBenInfoObtained",
          action?.wasBenInfoObtained,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      beneficiaries: new FormArray(
        action?.beneficiaries?.map((beneficiary) =>
          this.createBeneficiaryGroup({ beneficiary, options: { disabled } }),
        ) ||
          (createEmptyArrays
            ? [this.createBeneficiaryGroup({ options: { disabled } })]
            : []),
      ),
    });
  }

  private createAccountHolderGroup({
    holder,
    options,
  }: {
    holder?: AccountHolder;
    options: { disabled: boolean };
  }): FormGroup {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({ value: holder?._id || uuidv4(), disabled }),
      linkToSub: new FormControl(
        { value: holder?.linkToSub || "", disabled },
        Validators.required,
      ),
    });
  }

  private createSourceOfFundsGroup({
    source,
    options,
  }: {
    source?: SourceOfFunds;
    options: { disabled: boolean };
  }): FormGroup {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({ value: source?._id || uuidv4(), disabled }),
      linkToSub: new FormControl(
        { value: source?.linkToSub || "", disabled },
        Validators.required,
      ),
      accountNumber: new FormControl({
        value: source?.accountNumber || "",
        disabled,
      }),
      policyNumber: new FormControl({
        value: source?.policyNumber || "",
        disabled,
      }),
      identifyingNumber: new FormControl({
        value: source?.identifyingNumber || "",
        disabled,
      }),
    });
  }

  private createConductorGroup({
    conductor,
    options,
  }: {
    conductor?: Conductor;
    options: { disabled: boolean };
  }): FormGroup {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl({ value: conductor?._id || uuidv4(), disabled }),
      linkToSub: new FormControl(
        { value: conductor?.linkToSub || "", disabled },
        Validators.required,
      ),
      clientNo: new FormControl({ value: conductor?.clientNo || "", disabled }),
      email: new FormControl({ value: conductor?.email || "", disabled }),
      url: new FormControl({ value: conductor?.url || "", disabled }),
      wasConductedOnBehalf: new FormControl({
        value: this.changeLogService.getInitValForDepPropToggle(
          "wasConductedOnBehalf",
          conductor?.wasConductedOnBehalf,
          this.editReqType === "BULK_EDIT_REQUEST",
          this.editReqType === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      onBehalfOf: new FormArray(
        conductor?.onBehalfOf?.map((behalf) =>
          this.createOnBehalfOfGroup({ behalf, options: { disabled } }),
        ) || [],
      ),
    });
  }

  private createOnBehalfOfGroup({
    behalf,
    options,
  }: {
    behalf?: OnBehalfOf;
    options: { disabled: boolean };
  }): FormGroup {
    const { disabled } = options;

    return new FormGroup({
      linkToSub: new FormControl(
        { value: behalf?.linkToSub || "", disabled },
        Validators.required,
      ),
      clientNo: new FormControl({ value: behalf?.clientNo || "", disabled }),
      email: new FormControl({ value: behalf?.email || "", disabled }),
      url: new FormControl({ value: behalf?.url || "", disabled }),
      relationToCond: new FormControl({
        value: behalf?.relationToCond || "",
        disabled,
      }),
      relationToCondOther: new FormControl(
        { value: behalf?.relationToCondOther || "", disabled },
        Validators.required,
      ),
    });
  }

  private createInvolvedInGroup({
    involved,
    options,
  }: {
    involved?: InvolvedIn;
    options: { disabled: boolean };
  }): FormGroup {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({ value: involved?._id || uuidv4(), disabled }),
      linkToSub: new FormControl(
        { value: involved?.linkToSub || "", disabled },
        Validators.required,
      ),
      accountNumber: new FormControl({
        value: involved?.accountNumber || "",
        disabled,
      }),
      policyNumber: new FormControl({
        value: involved?.policyNumber || "",
        disabled,
      }),
      identifyingNumber: new FormControl({
        value: involved?.identifyingNumber || "",
        disabled,
      }),
    });
  }

  private createBeneficiaryGroup({
    beneficiary,
    options,
  }: {
    beneficiary?: Beneficiary;
    options: { disabled: boolean };
  }): FormGroup {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl({ value: beneficiary?._id || uuidv4(), disabled }),
      linkToSub: new FormControl(
        { value: beneficiary?.linkToSub || "", disabled },
        Validators.required,
      ),
      clientNo: new FormControl({
        value: beneficiary?.clientNo || null,
        disabled,
      }),
      email: new FormControl({ value: beneficiary?.email || "", disabled }),
      url: new FormControl({ value: beneficiary?.url || "", disabled }),
    });
  }

  // ----------------------
  // Array Management
  // ----------------------
  // Starting Actions
  addStartingAction(isBulk: boolean): void {
    const newSaGroup = this.createStartingActionGroup({
      options: { createEmptyArrays: isBulk, disabled: false },
    });
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      if (form.controls.startingActions.disabled) return;

      form.controls.startingActions.push(newSaGroup);
      form.controls.startingActions.markAllAsTouched();

      if (isBulk) newSaGroup.disable();
    });
  }

  removeStartingAction(index: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      if (form.controls.startingActions.disabled) return;

      form.controls.startingActions.removeAt(index);
    });
  }

  // Completing Actions
  addCompletingAction(isBulk: boolean): void {
    const newCaGroup = this.createCompletingActionGroup({
      options: { createEmptyArrays: isBulk, disabled: false },
    });
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      if (form.controls.completingActions.disabled) return;

      form.controls.completingActions.push(newCaGroup);
      form.controls.completingActions.markAllAsTouched();

      if (isBulk) newCaGroup.disable();
    });
  }

  removeCompletingAction(index: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      if (form.controls.completingActions.disabled) return;

      form.controls.completingActions.removeAt(index);
    });
  }

  addAccountHolder(actionControlName: keyof StrTxn, actionIndex: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const action = (
        form.get(actionControlName) as any as
          | FormArray<FormGroup<TypedForm<StartingAction>>>
          | FormArray<FormGroup<TypedForm<CompletingAction>>>
      ).at(actionIndex);

      if (action.controls.accountHolders!.disabled) return;
      if (!action.controls.hasAccountHolders.value) return;

      action.controls.accountHolders!.push(
        this.createAccountHolderGroup({ options: { disabled: false } }),
      );
      action.controls.accountHolders!.markAllAsTouched();
    });
  }

  removeAccountHolder(
    actionControlName: keyof StrTxn,
    actionIndex: number,
    index: number,
  ): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const action = (
        form.get(actionControlName) as any as
          | FormArray<FormGroup<TypedForm<StartingAction>>>
          | FormArray<FormGroup<TypedForm<CompletingAction>>>
      ).at(actionIndex);

      if (action.controls.accountHolders!.disabled) return;

      action.controls.accountHolders!.removeAt(index);
    });
  }

  // Source of Funds
  addSourceOfFunds(saIndex: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const startingAction = form.controls.startingActions.at(saIndex);

      if (startingAction.controls.sourceOfFunds.disabled) return;
      if (!startingAction.controls.wasSofInfoObtained.value) return;

      startingAction.controls.sourceOfFunds.push(
        this.createSourceOfFundsGroup({ options: { disabled: false } }),
      );
      startingAction.controls.sourceOfFunds.markAllAsTouched();
    });
  }

  removeSourceOfFunds(saIndex: number, index: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const startingAction = form.controls.startingActions.at(saIndex);

      if (startingAction.controls.sourceOfFunds.disabled) return;

      startingAction.controls.sourceOfFunds.removeAt(index);
    });
  }

  // Conductors
  addConductor(saIndex: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const startingAction = form.controls.startingActions.at(saIndex);

      if (startingAction.controls.conductors.disabled) return;
      if (!startingAction.controls.wasCondInfoObtained.value) return;

      startingAction.controls.conductors.push(
        this.createConductorGroup({ options: { disabled: false } }),
      );
      startingAction.controls.conductors.markAllAsTouched();
    });
  }

  removeConductor(saIndex: number, index: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const startingAction = form.controls.startingActions.at(saIndex);
      if (startingAction.controls.conductors.disabled) return;

      startingAction.controls.conductors.removeAt(index);
    });
  }

  // On Behalf Of
  addOnBehalfOf(saIndex: number, conductorIndex: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const startingAction = form.controls.startingActions.at(saIndex);

      if (
        startingAction.controls.conductors.at(conductorIndex).controls
          .onBehalfOf.disabled
      )
        return;
      if (
        !startingAction.controls.conductors.at(conductorIndex).controls
          .wasConductedOnBehalf.value
      )
        return;

      startingAction.controls.conductors
        .at(conductorIndex)
        .controls.onBehalfOf.push(
          this.createOnBehalfOfGroup({ options: { disabled: false } }),
        );
      startingAction.controls.conductors
        .at(conductorIndex)
        .controls.onBehalfOf.markAllAsTouched();
    });
  }

  removeOnBehalfOf(
    saIndex: number,
    conductorIndex: number,
    index: number,
  ): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const startingAction = form.controls.startingActions.at(saIndex);

      if (
        startingAction.controls.conductors.at(conductorIndex).controls
          .onBehalfOf.disabled
      )
        return;

      startingAction.controls.conductors
        .at(conductorIndex)
        .controls.onBehalfOf.removeAt(index);
    });
  }

  // Involved In (Completing Action)
  addInvolvedIn(caIndex: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const completingAction = form.controls.completingActions.at(caIndex);

      if (completingAction.controls.involvedIn!.disabled) return;
      if (!completingAction.controls.wasAnyOtherSubInvolved.value) return;

      completingAction.controls.involvedIn!.push(
        this.createInvolvedInGroup({ options: { disabled: false } }),
      );
      completingAction.controls.involvedIn!.markAllAsTouched();
    });
  }

  removeInvolvedIn(caIndex: number, index: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const completingAction = form.controls.completingActions.at(caIndex);

      if (completingAction.controls.involvedIn!.disabled) return;

      completingAction.controls.involvedIn!.removeAt(index);
    });
  }

  // Beneficiaries
  addBeneficiary(caIndex: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const completingAction = form.controls.completingActions.at(caIndex);

      if (completingAction.controls.beneficiaries!.disabled) return;
      if (!completingAction.controls.wasBenInfoObtained.value) return;

      completingAction.controls.beneficiaries!.push(
        this.createBeneficiaryGroup({ options: { disabled: false } }),
      );
      completingAction.controls.beneficiaries!.markAllAsTouched();
    });
  }

  removeBeneficiary(caIndex: number, index: number): void {
    this.strTxnForm$.pipe(take(1)).subscribe((form) => {
      const completingAction = form.controls.completingActions.at(caIndex);

      if (completingAction.controls.beneficiaries!.disabled) return;

      completingAction.controls.beneficiaries!.removeAt(index);
    });
  }

  auditVersionControl = new FormControl<number>(null!, { nonNullable: true });
  auditVersionOptions$: Observable<{ value: number; label: string }[]> = null!;
}
