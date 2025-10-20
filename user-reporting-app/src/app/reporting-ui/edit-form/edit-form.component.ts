import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
} from "@angular/core";
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
import { ErrorStateMatcher, MatOptionModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDividerModule } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormField } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTabsModule } from "@angular/material/tabs";
import { MatToolbarModule } from "@angular/material/toolbar";
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from "@angular/router";
import { v4 as uuidv4 } from "uuid";
import {
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "../../change-log.service";
import { SessionDataService, StrTxnEdited } from "../../session-data.service";
import { PreemptiveErrorStateMatcher } from "../../transaction-search/transaction-search.component";
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
  StrTxn,
  StrTxnFlowOfFunds,
} from "../reporting-ui-table/reporting-ui-table.component";
import { ClearFieldDirective } from "./clear-field.directive";
import { ToggleEditFieldDirective } from "./toggle-edit-field.directive";
import { TransactionDateDirective } from "./transaction-date.directive";
import { TransactionDetailsPanelComponent } from "./transaction-details-panel/transaction-details-panel.component";
import { TransactionTimeDirective } from "./transaction-time.directive";
import { ControlToggleDirective } from "./control-toggle.directive";

@Component({
  selector: "app-edit-form",
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
  template: `
    <app-transaction-details-panel
      *ngIf="isSingleEdit"
      [singleStrTransaction]="$any(editType.payload)"
    />
    <div class="container form-field-density px-0">
      <mat-toolbar class="justify-content-end my-3 px-0">
        <!-- <ng-container
          *ngIf="isNotAudit; else auditDropdown"
        > -->
        <ng-container *ngIf="isNotAudit">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            (click)="onSave()"
          >
            Save
          </button>
        </ng-container>
        <!-- <ng-template #auditDropdown>
          <!-- Standalone Dropdown, not part of editForm --
          <mat-form-field>
            <mat-select
              placeholder="Version"
              [formControl]="auditVersionControl"
            >
              <mat-option
                *ngFor="let option of auditVersionOptions$ | async"
                [value]="option.value"
              >
                {{ option.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </ng-template> -->
      </mat-toolbar>
      <form
        *ngIf="editForm"
        [formGroup]="editForm"
        (ngSubmit)="onSave()"
        [class.bulk-edit-form]="isBulkEdit"
        class="edit-form"
      >
        <!-- Main Tabs -->
        <mat-tab-group class="gap-3">
          <!-- Transaction Details Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <h3 class="mb-0">Transaction Details</h3>
              <mat-icon
                class="error-icon mx-1"
                [class.error-icon-show]="!editForm.valid && editForm.dirty"
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
                        [disabled]="!this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.isBulkEdit"
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
                        [disabled]="!this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.isBulkEdit"
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
                        [disabled]="!this.isBulkEdit"
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
                        <option
                          *ngFor="let key of methodOfTxnOptionsKeys"
                          [value]="methodOfTxnOptions[key]"
                        >
                          {{ key }}
                        </option>
                      </select>
                      <button
                        [disabled]="!this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.isBulkEdit"
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
                        [disabled]="!this.isBulkEdit"
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
                      <mat-label
                        >Reason transaction was not completed</mat-label
                      >
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
                        [disabled]="!this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>backspace</mat-icon>
                      </button>
                      <button
                        [disabled]="!this.isBulkEdit"
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
              <h3 class="mb-0">Starting Actions</h3>
              <mat-icon
                class="error-icon mx-1"
                [class.error-icon-show]="
                  !editForm.controls.startingActions.valid &&
                  editForm.controls.startingActions.dirty
                "
                color="error"
                >error_outline</mat-icon
              >
            </ng-template>
            <div class="d-flex flex-column align-items-end gap-3 mt-3">
              <button
                type="button"
                mat-raised-button
                color="primary"
                (click)="addStartingAction(!!this.isBulkEdit)"
                class="mx-1"
              >
                <mat-icon>add</mat-icon> Add Starting Action
              </button>
              <div
                formArrayName="startingActions"
                class="w-100 d-flex flex-column gap-3"
              >
                <div
                  *ngFor="
                    let saAction of editForm.controls.startingActions.controls;
                    let saIndex = index
                  "
                  [formGroupName]="saIndex"
                >
                  <mat-expansion-panel [expanded]="true">
                    <mat-expansion-panel-header class="my-3">
                      <mat-panel-title class="d-flex align-items-center gap-2"
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
                        <select
                          matNativeControl
                          formControlName="directionOfSA"
                        >
                          <option
                            *ngFor="let key of directionOfSAOptionsKeys"
                            [value]="directionOfSAOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of typeofFundsOptionsKeys"
                            [value]="typeofFundsOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
                        />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of amountCurrencyOptionsKeys"
                            [value]="amountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of accountTypeOptionsKeys"
                            [value]="accountTypeOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of accountCurrencyOptionsKeys"
                            [value]="accountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of accountStatusOptionsKeys"
                            [value]="accountStatusOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                        [disabled]="!this.isBulkEdit"
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
                      class="d-flex flex-column align-items-end gap-3"
                      [appControlToggle]="
                        'startingActions.' + saIndex + '.hasAccountHolders'
                      "
                      (addControlGroup)="
                        addAccountHolder('startingActions', saIndex)
                      "
                    >
                      <div
                        *ngFor="
                          let holder of saAction.controls.accountHolders
                            ?.controls;
                          let holderIndex = index
                        "
                        [formGroupName]="holderIndex"
                        class="w-100"
                      >
                        <mat-expansion-panel [expanded]="true">
                          <mat-expansion-panel-header class="my-2">
                            <mat-panel-title
                              class="d-flex align-items-center gap-2"
                              ><h3>Account Holder #{{ holderIndex + 1 }}</h3>
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
                              >
                                <mat-icon>delete</mat-icon>
                              </button>
                            </mat-panel-title>
                          </mat-expansion-panel-header>
                          <div class="row row-cols-1 row-cols-md-2">
                            <mat-form-field class="col">
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                            </mat-form-field>
                          </div>
                        </mat-expansion-panel>
                      </div>
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
                        [disabled]="!this.isBulkEdit"
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
                          let source of saAction.controls.sourceOfFunds
                            .controls;
                          let fundsIndex = index
                        "
                        [formGroupName]="fundsIndex"
                        class="w-100"
                      >
                        <mat-expansion-panel [expanded]="true">
                          <mat-expansion-panel-header class="my-2">
                            <mat-panel-title
                              class="d-flex align-items-center gap-2"
                              ><h3>Source of Funds #{{ fundsIndex + 1 }}</h3>
                              <button
                                type="button"
                                mat-icon-button
                                (click)="
                                  removeSourceOfFunds(saIndex, fundsIndex)
                                "
                              >
                                <mat-icon>delete</mat-icon>
                              </button>
                            </mat-panel-title>
                          </mat-expansion-panel-header>
                          <div class="row row-cols-1 row-cols-md-2">
                            <mat-form-field class="col">
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Account Number</mat-label>
                              <input matInput formControlName="accountNumber" />
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
                        [disabled]="!this.isBulkEdit"
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
                          let conductor of saAction.controls.conductors
                            .controls;
                          let condIndex = index
                        "
                        [formGroupName]="condIndex"
                        class="w-100"
                      >
                        <mat-expansion-panel [expanded]="true">
                          <mat-expansion-panel-header class="my-2">
                            <mat-panel-title
                              class="d-flex align-items-center gap-2"
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
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                            </mat-form-field>
                          </div>

                          <!-- On Behalf Of Subsection -->
                          <h3>On Behalf Of</h3>
                          <div class="row">
                            <mat-checkbox
                              formControlName="wasConductedOnBehalf"
                            >
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
                            "
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
                                <mat-expansion-panel-header class="my-2">
                                  <mat-panel-title
                                    class="d-flex align-items-center gap-2"
                                    ><h3>
                                      On Behalf Of #{{ behalfIndex + 1 }}
                                    </h3>
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
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey"
                                    />
                                  </mat-form-field>

                                  <mat-form-field class="col">
                                    <mat-label>Surname</mat-label>
                                    <input matInput formControlName="surname" />
                                  </mat-form-field>

                                  <mat-form-field class="col">
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                    />
                                  </mat-form-field>

                                  <mat-form-field class="col">
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                    />
                                  </mat-form-field>

                                  <mat-form-field class="col">
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
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
              <h3 class="mb-0">Completing Actions</h3>
              <mat-icon
                class="error-icon mx-1"
                [class.error-icon-show]="
                  !editForm.controls.completingActions.valid &&
                  editForm.controls.completingActions.dirty
                "
                color="error"
                >error_outline</mat-icon
              >
            </ng-template>
            <div class="d-flex flex-column align-items-end gap-3 mt-3">
              <button
                type="button"
                mat-raised-button
                color="primary"
                (click)="addCompletingAction(!!this.isBulkEdit)"
                class="mx-1"
              >
                <mat-icon>add</mat-icon> Add Completing Action
              </button>

              <div
                formArrayName="completingActions"
                class="w-100 d-flex flex-column gap-3"
              >
                <div
                  *ngFor="
                    let caAction of editForm.controls.completingActions
                      .controls;
                    let caIndex = index
                  "
                  [formGroupName]="caIndex"
                >
                  <mat-expansion-panel [expanded]="true">
                    <mat-expansion-panel-header class="my-3">
                      <mat-panel-title class="d-flex align-items-center gap-2"
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
                        <select
                          matNativeControl
                          formControlName="detailsOfDispo"
                        >
                          <option
                            *ngFor="let key of detailsOfDispositionOptionsKeys"
                            [value]="detailsOfDispositionOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
                        />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of amountCurrencyOptionsKeys"
                            [value]="amountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of accountTypeOptionsKeys"
                            [value]="accountTypeOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of accountCurrencyOptionsKeys"
                            [value]="accountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          <option
                            *ngFor="let key of accountStatusOptionsKeys"
                            [value]="accountStatusOptions[key]"
                          >
                            {{ key }}
                          </option>
                        </select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>backspace</mat-icon>
                        </button>
                        <button
                          [disabled]="!this.isBulkEdit"
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
                        [disabled]="!this.isBulkEdit"
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
                      class="d-flex flex-column align-items-end gap-3"
                      [appControlToggle]="
                        'completingActions.' + caIndex + '.hasAccountHolders'
                      "
                      (addControlGroup)="
                        addAccountHolder('completingActions', caIndex)
                      "
                    >
                      <div
                        *ngFor="
                          let holder of caAction.controls.accountHolders
                            ?.controls;
                          let holderIndex = index
                        "
                        [formGroupName]="holderIndex"
                        class="w-100"
                      >
                        <mat-expansion-panel [expanded]="true">
                          <mat-expansion-panel-header class="my-2">
                            <mat-panel-title
                              class="d-flex align-items-center gap-2"
                              ><h3>Account Holder #{{ holderIndex + 1 }}</h3>
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
                              >
                                <mat-icon>delete</mat-icon>
                              </button>
                            </mat-panel-title>
                          </mat-expansion-panel-header>
                          <div class="row row-cols-1 row-cols-md-2">
                            <mat-form-field class="col">
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                            </mat-form-field>
                          </div>
                        </mat-expansion-panel>
                      </div>

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
                        [disabled]="!this.isBulkEdit"
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
                        'completingActions.' +
                        caIndex +
                        '.wasAnyOtherSubInvolved'
                      "
                      (addControlGroup)="addInvolvedIn(caIndex)"
                    >
                      <div
                        *ngFor="
                          let involved of caAction.controls.involvedIn
                            ?.controls;
                          let invIndex = index
                        "
                        [formGroupName]="invIndex"
                        class="w-100"
                      >
                        <mat-expansion-panel [expanded]="true">
                          <mat-expansion-panel-header class="my-2">
                            <mat-panel-title
                              class="d-flex align-items-center gap-2"
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
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
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
                        [disabled]="!this.isBulkEdit"
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
                          <mat-expansion-panel-header class="my-2">
                            <mat-panel-title
                              class="d-flex align-items-center gap-2"
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
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                            </mat-form-field>

                            <mat-form-field class="col">
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
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
        <pre class="overlay-pre">Form values: {{ editForm.value | json }}</pre>
      </form>
    </div>
  `,
  styleUrl: "./edit-form.component.scss",
  providers: [
    { provide: ErrorStateMatcher, useClass: PreemptiveErrorStateMatcher },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFormComponent implements OnInit {
  @Input()
  readonly editType!: EditFormEditType;
  get isSingleEdit() {
    return this.editType.type === "SINGLE_EDIT";
  }
  get isBulkEdit() {
    return this.editType.type === "BULK_EDIT";
  }
  get isNotAudit() {
    return this.editType.type !== "AUDIT_REQUEST";
  }

  editForm: ReturnType<
    typeof EditFormComponent.prototype.createEditForm
  > | null = null;
  private singleStrTransactionBeforeEdit:
    | ReturnType<typeof EditFormComponent.prototype.createEditForm>["value"]
    | null = null;

  ngOnInit(): void {
    if (this.editType.type === "SINGLE_EDIT") {
      this.editForm = this.createEditForm({
        txn: this.editType.payload,
        options: { disabled: false },
      });
      this.singleStrTransactionBeforeEdit = structuredClone(
        this.editForm.value,
      );
    }
  }

  private changeLogService: ChangeLogService<StrTxnEdited> =
    inject(ChangeLogService);
  private snackBar = inject(MatSnackBar);

  // ----------------------
  // Form Submission
  // ----------------------
  isSaved = false;
  onSave(): void {
    // console.log(
    //   "🚀 ~ EditFormComponent ~ onSubmit ~ this.userForm!.value:",
    //   this.editForm!.value,
    // );
    const isBulkEditSaved = this.isSaved && this.editType.type === "BULK_EDIT";

    if (isBulkEditSaved) {
      this.snackBar.open(
        "Edits already saved please close this tab!",
        "Dismiss",
        {
          duration: 5000,
        },
      );
      return;
    }

    if (this.editType.type === "SINGLE_EDIT") {
      const changes: ChangeLogWithoutVersion[] = [];
      this.changeLogService.compareProperties(
        this.singleStrTransactionBeforeEdit,
        this.editForm!.value,
        changes,
      );

      this.singleStrTransactionBeforeEdit = structuredClone(
        this.editForm!.value,
      );
    }

    // this.editForm$.pipe(take(1)).subscribe((form) => {
    //   if (!this.isBulkEdit) {
    //     this.crossTabEditService.saveEditResponseToLocalStorage(
    //       this.sessionId,
    //       {
    //         type: "EDIT_RESULT",
    //         payload: {
    //           strTxnId: this.strTxnBeforeEdit!._mongoid,
    //           changeLogs: changes,
    //         },
    //       },
    //     );
    //   } else {
    //     this.crossTabEditService.saveEditResponseToLocalStorage(
    //       this.sessionId,
    //       {
    //         type: "BULK_EDIT_RESULT",
    //         payload: this.strTxnBeforeBulkEdit.map((txnBefore) => {
    //           const changes: ChangeLogWithoutVersion[] = [];
    //           this.changeLogService.compareProperties(
    //             txnBefore,
    //             form.getRawValue(),
    //             changes,
    //             { discriminator: "index" },
    //           );
    //           return { changeLogs: changes, strTxnId: txnBefore._mongoid };
    //         }),
    //       },
    //     );
    //   }
    this.snackBar.open("Edits saved!", "Dismiss", {
      duration: 5000,
    });
    this.isSaved = true;
  }

  public createEditForm({
    txn,
    options,
  }: {
    txn?: WithVersion<StrTxn> | StrTxn | null;
    options: { isBulkEdit?: boolean; disabled: boolean };
  }) {
    const { isBulkEdit: createEmptyArrays = false, disabled } = options;

    const editForm = new FormGroup({
      _version: new FormControl<number>({
        value: (txn as { _version: number })?._version || 0,
        disabled,
      }),
      wasTxnAttempted: new FormControl({
        value: this.changeLogService.getInitValForDependentPropToggle(
          "wasTxnAttempted",
          txn?.wasTxnAttempted,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
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
        value: this.changeLogService.getInitValForDependentPropToggle(
          "hasPostingDate",
          txn?.hasPostingDate,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
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
        value: txn?.reportingEntityTxnRefNo!,
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
    }) satisfies FormGroup<TypedForm<WithVersion<StrTxnEditForm>>>;

    return editForm;
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
  }) {
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
        value: this.changeLogService.getInitValForDependentPropToggle(
          "hasAccountHolders",
          action?.hasAccountHolders,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
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
        value: this.changeLogService.getInitValForDependentPropToggle(
          "wasSofInfoObtained",
          action?.wasSofInfoObtained,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
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
        value: this.changeLogService.getInitValForDependentPropToggle(
          "wasCondInfoObtained",
          action?.wasCondInfoObtained,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
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
    }) satisfies FormGroup<
      TypedForm<RecursiveOmit<StartingAction, keyof ConductorNpdData>>
    >;
  }

  private createCompletingActionGroup({
    action,
    options,
  }: {
    action?: CompletingAction;
    options: { createEmptyArrays?: boolean; disabled: boolean };
  }) {
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
        value: action?.hasAccountHolders ?? null,
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
        value: this.changeLogService.getInitValForDependentPropToggle(
          "wasAnyOtherSubInvolved",
          action?.wasAnyOtherSubInvolved,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
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
        value: this.changeLogService.getInitValForDependentPropToggle(
          "wasBenInfoObtained",
          action?.wasBenInfoObtained,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
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
    }) satisfies FormGroup<TypedForm<CompletingAction>>;
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
        value: holder?._id || uuidv4(),
        disabled,
      }),
      partyKey: new FormControl(
        { value: holder?.partyKey || "", disabled },
        Validators.required,
      ),
      givenName: new FormControl(
        { value: holder?.givenName || "", disabled },
        Validators.required,
      ),
      otherOrInitial: new FormControl(
        { value: holder?.otherOrInitial || "", disabled },
        Validators.required,
      ),
      surname: new FormControl(
        { value: holder?.surname || "", disabled },
        Validators.required,
      ),
      nameOfEntity: new FormControl(
        { value: holder?.nameOfEntity || "", disabled },
        Validators.required,
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
      _id: new FormControl({ value: source?._id || uuidv4(), disabled }),
      partyKey: new FormControl(
        { value: source?.partyKey || "", disabled },
        Validators.required,
      ),
      givenName: new FormControl(
        { value: source?.givenName || "", disabled },
        Validators.required,
      ),
      otherOrInitial: new FormControl(
        { value: source?.otherOrInitial || "", disabled },
        Validators.required,
      ),
      surname: new FormControl(
        { value: source?.surname || "", disabled },
        Validators.required,
      ),
      nameOfEntity: new FormControl(
        { value: source?.nameOfEntity || "", disabled },
        Validators.required,
      ),
      accountNumber: new FormControl(
        { value: source?.accountNumber || "", disabled },
        Validators.required,
      ),
      identifyingNumber: new FormControl(
        { value: source?.identifyingNumber || "", disabled },
        Validators.required,
      ),
    }) satisfies FormGroup<TypedForm<SourceOfFunds>>;
  }

  private createConductorGroup({
    conductor,
    options,
  }: {
    conductor?: Conductor;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl({ value: conductor?._id || uuidv4(), disabled }),
      partyKey: new FormControl(
        { value: conductor?.partyKey || "", disabled },
        Validators.required,
      ),
      givenName: new FormControl(
        { value: conductor?.givenName || "", disabled },
        Validators.required,
      ),
      otherOrInitial: new FormControl(
        { value: conductor?.otherOrInitial || "", disabled },
        Validators.required,
      ),
      surname: new FormControl(
        { value: conductor?.surname || "", disabled },
        Validators.required,
      ),
      nameOfEntity: new FormControl(
        { value: conductor?.nameOfEntity || "", disabled },
        Validators.required,
      ),
      wasConductedOnBehalf: new FormControl({
        value: this.changeLogService.getInitValForDependentPropToggle(
          "wasConductedOnBehalf",
          conductor?.wasConductedOnBehalf,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      onBehalfOf: new FormArray(
        conductor?.onBehalfOf?.map((behalf) =>
          this.createOnBehalfOfGroup({ behalf, options: { disabled } }),
        ) || [],
      ),
    }) satisfies FormGroup<
      TypedForm<RecursiveOmit<Conductor, keyof ConductorNpdData>>
    >;
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
      _id: new FormControl({ value: behalf?._id || uuidv4(), disabled }),
      partyKey: new FormControl(
        { value: behalf?.partyKey || "", disabled },
        Validators.required,
      ),
      givenName: new FormControl(
        { value: behalf?.givenName || "", disabled },
        Validators.required,
      ),
      otherOrInitial: new FormControl(
        { value: behalf?.otherOrInitial || "", disabled },
        Validators.required,
      ),
      surname: new FormControl(
        { value: behalf?.surname || "", disabled },
        Validators.required,
      ),
      nameOfEntity: new FormControl(
        { value: behalf?.nameOfEntity || "", disabled },
        Validators.required,
      ),
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
      _id: new FormControl({ value: involved?._id || uuidv4(), disabled }),
      partyKey: new FormControl(
        { value: involved?.partyKey || "", disabled },
        Validators.required,
      ),
      givenName: new FormControl(
        { value: involved?.givenName || "", disabled },
        Validators.required,
      ),
      otherOrInitial: new FormControl(
        { value: involved?.otherOrInitial || "", disabled },
        Validators.required,
      ),
      surname: new FormControl(
        { value: involved?.surname || "", disabled },
        Validators.required,
      ),
      nameOfEntity: new FormControl(
        { value: involved?.nameOfEntity || "", disabled },
        Validators.required,
      ),
      accountNumber: new FormControl({
        value: involved?.accountNumber || "",
        disabled,
      }),
      identifyingNumber: new FormControl({
        value: involved?.identifyingNumber || "",
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
      _id: new FormControl({ value: beneficiary?._id || uuidv4(), disabled }),
      partyKey: new FormControl(
        { value: beneficiary?.partyKey || "", disabled },
        Validators.required,
      ),
      givenName: new FormControl(
        { value: beneficiary?.givenName || "", disabled },
        Validators.required,
      ),
      otherOrInitial: new FormControl(
        { value: beneficiary?.otherOrInitial || "", disabled },
        Validators.required,
      ),
      surname: new FormControl(
        { value: beneficiary?.surname || "", disabled },
        Validators.required,
      ),
      nameOfEntity: new FormControl(
        { value: beneficiary?.nameOfEntity || "", disabled },
        Validators.required,
      ),
    }) satisfies FormGroup<TypedForm<Beneficiary>>;
  }

  // ----------------------
  // Array Management
  // ----------------------
  // Starting Actions
  addStartingAction(isBulk: boolean): void {
    const newSaGroup = this.createStartingActionGroup({
      options: { createEmptyArrays: isBulk, disabled: false },
    });
    if (this.editForm!.controls.startingActions.disabled) return;

    this.editForm!.controls.startingActions.push(newSaGroup);
    this.editForm!.controls.startingActions.markAllAsTouched();

    if (isBulk) newSaGroup.disable();
  }

  removeStartingAction(index: number): void {
    if (this.editForm!.controls.startingActions.disabled) return;

    this.editForm!.controls.startingActions.removeAt(index);
  }

  // Completing Actions
  addCompletingAction(isBulk: boolean): void {
    const newCaGroup = this.createCompletingActionGroup({
      options: { createEmptyArrays: isBulk, disabled: false },
    });
    if (this.editForm!.controls.completingActions.disabled) return;

    this.editForm!.controls.completingActions.push(newCaGroup);
    this.editForm!.controls.completingActions.markAllAsTouched();

    if (isBulk) newCaGroup.disable();
  }

  removeCompletingAction(index: number): void {
    if (this.editForm!.controls.completingActions.disabled) return;

    this.editForm!.controls.completingActions.removeAt(index);
  }

  // Account Hodlers SA/CA
  addAccountHolder(actionControlName: keyof StrTxn, actionIndex: number): void {
    const action = (
      this.editForm!.get(actionControlName) as any as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders!.disabled) return;
    if (!action.controls.hasAccountHolders.value) return;

    action.controls.accountHolders!.push(
      this.createAccountHolderGroup({ options: { disabled: false } }),
    );
    action.controls.accountHolders!.markAllAsTouched();
  }

  removeAccountHolder(
    actionControlName: keyof StrTxn,
    actionIndex: number,
    index: number,
  ): void {
    const action = (
      this.editForm!.get(actionControlName) as any as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders!.disabled) return;

    action.controls.accountHolders!.removeAt(index);
  }

  // Source of Funds
  addSourceOfFunds(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;
    if (!startingAction.controls.wasSofInfoObtained.value) return;

    startingAction.controls.sourceOfFunds.push(
      this.createSourceOfFundsGroup({ options: { disabled: false } }),
    );
    startingAction.controls.sourceOfFunds.markAllAsTouched();
  }

  removeSourceOfFunds(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;

    startingAction.controls.sourceOfFunds.removeAt(index);
  }

  // Conductors
  addConductor(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.conductors.disabled) return;
    if (!startingAction.controls.wasCondInfoObtained.value) return;

    startingAction.controls.conductors.push(
      this.createConductorGroup({ options: { disabled: false } }),
    );
    startingAction.controls.conductors.markAllAsTouched();
  }

  removeConductor(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);
    if (startingAction.controls.conductors.disabled) return;

    startingAction.controls.conductors.removeAt(index);
  }

  // On Behalf Of
  addOnBehalfOf(saIndex: number, conductorIndex: number): void {
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

    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.push(
        this.createOnBehalfOfGroup({ options: { disabled: false } }),
      );
    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.markAllAsTouched();
  }

  removeOnBehalfOf(
    saIndex: number,
    conductorIndex: number,
    index: number,
  ): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (
      startingAction.controls.conductors.at(conductorIndex).controls.onBehalfOf
        .disabled
    )
      return;

    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.removeAt(index);
  }

  // Involved In (Completing Action)
  addInvolvedIn(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;
    if (!completingAction.controls.wasAnyOtherSubInvolved.value) return;

    completingAction.controls.involvedIn!.push(
      this.createInvolvedInGroup({ options: { disabled: false } }),
    );
    completingAction.controls.involvedIn!.markAllAsTouched();
  }

  removeInvolvedIn(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;

    completingAction.controls.involvedIn!.removeAt(index);
  }

  // Beneficiaries
  addBeneficiary(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;
    if (!completingAction.controls.wasBenInfoObtained.value) return;

    completingAction.controls.beneficiaries!.push(
      this.createBeneficiaryGroup({ options: { disabled: false } }),
    );
    completingAction.controls.beneficiaries!.markAllAsTouched();
  }

  removeBeneficiary(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;

    completingAction.controls.beneficiaries!.removeAt(index);
  }

  get methodOfTxnOptionsKeys() {
    return Object.keys(EditFormComponent.methodOfTxnOptions);
  }
  get methodOfTxnOptions() {
    return EditFormComponent.methodOfTxnOptions;
  }
  static methodOfTxnOptions: Record<string, string> = {
    "": "",
    ABM: "ABM",
    "In-Person": "In-Person",
    Online: "Online",
    Other: "Other",
  };

  get typeofFundsOptionsKeys() {
    return Object.keys(EditFormComponent.typeOfFundsOptions);
  }
  get typeofFundsOptions() {
    return EditFormComponent.typeOfFundsOptions;
  }
  static typeOfFundsOptions: Record<string, string> = {
    "": "",
    "Funds Withdrawal": "Funds Withdrawal",
    Cash: "Cash",
    Cheque: "Cheque",
    "Domestic Funds Transfer": "Domestic Funds Transfer",
    "Email Monel Transfer": "Email Monel Transfer",
    Other: "Other",
  };

  get accountTypeOptionsKeys() {
    return Object.keys(EditFormComponent.accountTypeOptions);
  }
  get accountTypeOptions() {
    return EditFormComponent.accountTypeOptions;
  }
  static accountTypeOptions: Record<string, string> = {
    "": "",
    Business: "Business",
    Casino: "Casino",
    Personal: "Personal",
    Other: "Other",
  };

  get amountCurrencyOptionsKeys() {
    return Object.keys(EditFormComponent.amountCurrencyOptions);
  }
  get amountCurrencyOptions() {
    return EditFormComponent.amountCurrencyOptions;
  }
  static amountCurrencyOptions: Record<string, string> = {
    "": "",
    CAD: "CAD",
    USD: "USD",
  };

  get accountCurrencyOptionsKeys() {
    return Object.keys(EditFormComponent.accountCurrencyOptions);
  }
  get accountCurrencyOptions() {
    return EditFormComponent.accountCurrencyOptions;
  }
  static accountCurrencyOptions: Record<string, string> = {
    "": "",
    CAD: "CAD",
    USD: "USD",
  };

  get accountStatusOptionsKeys() {
    return Object.keys(EditFormComponent.accountStatusOptions);
  }
  get accountStatusOptions() {
    return EditFormComponent.accountStatusOptions;
  }
  static accountStatusOptions: Record<string, string> = {
    "": "",
    Active: "Active",
    Closed: "Closed",
    Inactive: "Inactive",
    Dorment: "Dorment",
  };

  get directionOfSAOptionsKeys() {
    return Object.keys(EditFormComponent.directionOfSAOptions);
  }
  get directionOfSAOptions() {
    return EditFormComponent.directionOfSAOptions;
  }
  static directionOfSAOptions: Record<string, string> = {
    "": "",
    In: "In",
    Out: "Out",
  };

  get detailsOfDispositionOptionsKeys() {
    return Object.keys(EditFormComponent.detailsOfDispositionOptions);
  }
  get detailsOfDispositionOptions() {
    return EditFormComponent.detailsOfDispositionOptions;
  }
  static detailsOfDispositionOptions: Record<string, string> = {
    "": "",
    "Deposit to account": "Deposit to account",
    "Cash Withdrawal": "Cash Withdrawal",
    "Issued Cheque": "Issued Cheque",
    "Outgoing Email Transfer": "Outgoing Email Transfer",
    Other: "Other",
  };

  navigateBack() {
    throw new Error("Method not implemented.");
  }
}

export const singleEditResolver: ResolveFn<EditFormEditType> = (
  route: ActivatedRouteSnapshot,
  _: RouterStateSnapshot,
) => {
  return {
    type: "SINGLE_EDIT",
    payload: inject(
      SessionDataService,
    ).sessionStateValue.strTransactionsEdited.find(
      (txn) => route.params["txnId"] === txn.flowOfFundsAmlTransactionId,
    )!,
  };
};

export type TypedForm<T> = {
  [K in keyof T]-?: Exclude<T[K], undefined | null> extends Array<infer U>
    ? FormArray<
        U extends object ? FormGroup<TypedForm<U>> : FormControl<U | null>
      >
    : Exclude<T[K], undefined | null> extends object
      ? FormGroup<TypedForm<T[K]>>
      : FormControl<Exclude<T[K], undefined> | null>;
};

type StrTxnEditForm = RecursiveOmit<
  StrTxn,
  | keyof StrTxnFlowOfFunds
  | "highlightColor"
  | keyof ConductorNpdData
  | "_hiddenFullName"
  | "_hiddenSaAmount"
>;

export type EditFormEditType =
  | {
      type: "SINGLE_EDIT";
      payload: StrTxnEdited;
    }
  | {
      type: "BULK_EDIT";
      payload: StrTxnEdited[];
    }
  | {
      type: "AUDIT_REQUEST";
      payload: StrTxnEdited;
    };

// export type EditFormEditTypeType = EditFormEditType extends { type: infer T }
//   ? T
//   : never;

// export type EditFormEditType =
//   | {
//       type: "EDIT_REQUEST";
//       payload: StrTxnEdited;
//     }
//   | {
//       type: "EDIT_RESULT";
//       payload: EditTabChangeLogsRes;
//     }
//   | {
//       type: "BULK_EDIT_REQUEST";
//       payload: StrTxnEdited[];
//     }
//   | {
//       type: "BULK_EDIT_RESULT";
//       payload: EditTabChangeLogsRes[];
//     }
//   | {
//       type: "AUDIT_REQUEST";
//       payload: StrTxnEdited;
//     };

// note does not properly omit keys from union types
type RecursiveOmit<T, K extends PropertyKey> = T extends object
  ? Omit<{ [P in keyof T]: RecursiveOmit<T[P], K> }, K>
  : T;
