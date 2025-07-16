import { CommonModule } from "@angular/common";
import {
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
} from "@angular/core";
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { map, Subject, switchMap, takeUntil, tap } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormField,
  MatFormFieldDefaultOptions,
} from "@angular/material/form-field";
import { MatTabsModule } from "@angular/material/tabs";
import { MAT_CARD_CONFIG, MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatButtonModule } from "@angular/material/button";
import { CrossTabEditService } from "../cross-tab-edit.service";
import {
  ChangeLog,
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "../change-log.service";
import { ActivatedRoute } from "@angular/router";
import { removePageFromOpenTabs } from "../single-tab.guard";
import { ClearFieldDirective } from "./clear-field.directive";
import { ToggleEditFieldDirective } from "./toggle-edit-field.directive";
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
} from "../table/table.component";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { ControlToggleDirective } from "./control-toggle.directive";
import { MatToolbarModule } from "@angular/material/toolbar";
import { TransactionDateDirective } from "./transaction-date.directive";
import { TransactionTimeDirective } from "./transaction-time.directive";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: "app-edit-form",
  imports: [
    CommonModule,
    MatFormField,
    MatTabsModule,
    MatCardModule,
    MatInputModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    ToggleEditFieldDirective,
    ClearFieldDirective,
    MatCheckboxModule,
    ControlToggleDirective,
    MatToolbarModule,
    TransactionDateDirective,
    TransactionTimeDirective,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: "outline",
        floatLabel: "auto",
      } as MatFormFieldDefaultOptions,
    },
    {
      provide: MAT_CARD_CONFIG,
      useValue: { appearance: "outlined" },
    },
  ],
  template: `
    <!-- str-txn-form.component.html -->
    <mat-toolbar>
      <div class="d-flex justify-content-between align-items-center">
        <h1>
          STR Transaction Form
          {{ this.strTxnsBeforeBulkEdit ? " - Bulk Edit" : "" }}
        </h1>
      </div>
    </mat-toolbar>
    <div class="container form-field-density mat-typography">
      <form
        *ngIf="strTxnForm"
        [formGroup]="strTxnForm"
        (ngSubmit)="onSubmit()"
        [class.bulk-edit-form]="this.strTxnsBeforeBulkEdit"
      >
        <mat-toolbar class="justify-content-end">
          <button mat-raised-button color="primary" type="submit">
            Submit
          </button>
        </mat-toolbar>
        <!-- Main Tabs -->
        <mat-tab-group>
          <!-- Transaction Details Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span>Transaction Details</span>
              <mat-icon
                *ngIf="!this.strTxnForm.valid && this.strTxnForm.dirty"
                color="error"
                >error_outline</mat-icon
              >
            </ng-template>
            <div>
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Transaction Information</mat-card-title>
                </mat-card-header>
                <mat-card-content class="mt-5">
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
                *ngIf="
                  !this.strTxnForm.controls.startingActions.valid &&
                  this.strTxnForm.controls.startingActions.dirty
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
                    let saAction of this.strTxnForm.controls.startingActions
                      .controls;
                    let saIndex = index
                  "
                  [formGroupName]="saIndex"
                >
                  <mat-expansion-panel [expanded]="true">
                    <mat-expansion-panel-header>
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
                        <select
                          matNativeControl
                          formControlName="directionOfSA"
                        >
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
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
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
                        <input matInput formControlName="branch" />
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
                        <input matInput formControlName="account" />
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
                        <select matNativeControl formControlName="accountType">
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
                      (addControlGroup)="addAccountHolder('startingActions', saIndex)"
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
                          let source of saAction.controls.sourceOfFunds
                            .controls;
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
                          let conductor of saAction.controls.conductors
                            .controls;
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
                              <input
                                matInput
                                type="url"
                                formControlName="url"
                              />
                            </mat-form-field>
                          </div>

                          <h3>On Behalf Of</h3>

                          <div class="row">
                            <mat-checkbox
                              formControlName="wasConductedOnBehalf"
                            >
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
                                    <mat-label>Link to Subject</mat-label>
                                    <input
                                      matInput
                                      formControlName="linkToSub"
                                    />
                                  </mat-form-field>

                                  <mat-form-field class="col">
                                    <mat-label>Client Number</mat-label>
                                    <input
                                      matInput
                                      formControlName="clientNo"
                                    />
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
                *ngIf="
                  !this.strTxnForm.controls.completingActions.valid &&
                  this.strTxnForm.controls.completingActions.dirty
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
                    let caAction of this.strTxnForm.controls.completingActions
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
                        <select
                          matNativeControl
                          formControlName="detailsOfDispo"
                        >
                          <option value="Deposit to account">
                            Deposit to account
                          </option>
                          <option value="Cash Withdrawal">
                            Cash Withdrawal
                          </option>
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
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
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
                        <input matInput formControlName="branch" />
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
                        <input matInput formControlName="account" />
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
                        <select matNativeControl formControlName="accountType">
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
                      (addControlGroup)="addAccountHolder('completingActions', caIndex)"
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
                              <input
                                matInput
                                type="url"
                                formControlName="url"
                              />
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
        <!-- <pre class="overlay-pre">
Form values: {{ strTxnForm.value | json }}</pre
        > -->
      </form>
    </div>
  `,
  styleUrls: ["./edit-form.component.scss"],
})
export class EditFormComponent implements OnInit, OnDestroy {
  strTxnBeforeEdit: WithVersion<StrTxn> | null = null;
  strTxnsBeforeBulkEdit: WithVersion<StrTxn>[] | null = null;
  validatorParams = {
    maxBirthDate: new Date(),
    passwordLenMin: 6,
    usernameLenMin: 4,
    phonePatterns: {
      us: /^(\+?\d{1,2}\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/,
    },
    postalCodeLenMax: 12,
    stateCodeLenMax: 3,
  };

  strTxnForm: StrTxnFormType = null!;
  private sessionId: string = null!;
  constructor(
    private crossTabEditService: CrossTabEditService,
    private changeLogService: ChangeLogService<StrTxn>,
    private activatedRoute: ActivatedRoute,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.activatedRoute.params
      .pipe(
        takeUntil(this.destroy$),
        map((params) => params["sessionId"] as string),
        tap((sessionId) => {
          this.sessionId = sessionId;
        }),
        switchMap((sessionId) =>
          this.crossTabEditService
            .getEditRequestBySessionId(sessionId)
            .pipe(takeUntil(this.destroy$)),
        ),
      )
      .subscribe(({ type, payload }) => {
        if (type === "EDIT_REQUEST") {
          this.strTxnBeforeEdit = payload;
          this.createStrTxnForm({ txn: payload });
        }
        if (type === "BULK_EDIT_REQUEST") {
          this.strTxnsBeforeBulkEdit = payload;
          this.createStrTxnForm({ createEmptyArrays: true });
        }
        this.strTxnForm.markAllAsTouched();
      });
  }
  private readonly destroy$ = new Subject<void>();

  @HostListener("window:beforeunload", ["$event"])
  ngOnDestroy = (($event: Event) => {
    this.destroy$.next();
    this.destroy$.complete();

    removePageFromOpenTabs(this.route.snapshot);
  }) as () => void;

  private createStrTxnForm({
    txn,
    createEmptyArrays = false,
  }: {
    txn?: WithVersion<StrTxn> | null;
    createEmptyArrays?: boolean;
  }) {
    this.strTxnForm = new FormGroup({
      _version: new FormControl<number>(txn?._version || 0),
      _mongoid: new FormControl(txn?._mongoid || `mtxn-${uuidv4()}`),
      wasTxnAttempted: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "wasTxnAttempted",
          txn?.wasTxnAttempted,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      wasTxnAttemptedReason: new FormControl(
        txn?.wasTxnAttemptedReason || "",
        Validators.required,
      ),
      dateOfTxn: new FormControl(txn?.dateOfTxn || "", Validators.required),
      timeOfTxn: new FormControl(txn?.timeOfTxn || "", Validators.required),
      hasPostingDate: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "hasPostingDate",
          txn?.hasPostingDate,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      dateOfPosting: new FormControl(
        txn?.dateOfPosting || "",
        Validators.required,
      ),
      timeOfPosting: new FormControl(
        txn?.timeOfPosting || "",
        Validators.required,
      ),
      methodOfTxn: new FormControl(txn?.methodOfTxn || "", Validators.required),
      methodOfTxnOther: new FormControl(
        txn?.methodOfTxnOther || "",
        Validators.required,
      ),
      reportingEntityTxnRefNo: new FormControl(
        txn?.reportingEntityTxnRefNo || "",
      ),
      purposeOfTxn: new FormControl(txn?.purposeOfTxn || ""),
      reportingEntityLocationNo: new FormControl(
        txn?.reportingEntityLocationNo || "",
        [Validators.required, Validators.minLength(5), Validators.maxLength(5)],
      ),
      startingActions: new FormArray(
        txn?.startingActions?.map((action) =>
          this.createStartingActionGroup({ action }),
        ) ||
          (createEmptyArrays
            ? [this.createStartingActionGroup({ createEmptyArrays })]
            : []),
      ),
      completingActions: new FormArray(
        txn?.completingActions?.map((action) =>
          this.createCompletingActionGroup({ action }),
        ) ||
          (createEmptyArrays
            ? [this.createCompletingActionGroup({ createEmptyArrays })]
            : []),
      ),
    });

    if (createEmptyArrays) {
      this.strTxnForm.disable();
    }
  }

  // --------------------------
  // Form Group Creation Methods
  // --------------------------
  private createStartingActionGroup({
    action,
    createEmptyArrays = false,
  }: { action?: StartingAction; createEmptyArrays?: boolean } = {}): FormGroup {
    if (action?.accountHolders)
      action.hasAccountHolders = action.accountHolders.length > 0;

    return new FormGroup({
      _id: new FormControl(action?._id || uuidv4()),
      directionOfSA: new FormControl(action?.directionOfSA || ""),
      typeOfFunds: new FormControl(action?.typeOfFunds || ""),
      typeOfFundsOther: new FormControl(
        action?.typeOfFundsOther || "",
        Validators.required,
      ),
      amount: new FormControl(action?.amount || null),
      currency: new FormControl(action?.currency || ""),
      fiuNo: new FormControl(action?.fiuNo || ""),
      branch: new FormControl(action?.branch || ""),
      account: new FormControl(action?.account || ""),
      accountType: new FormControl(action?.accountType || ""),
      accountTypeOther: new FormControl(
        action?.accountTypeOther || "",
        Validators.required,
      ),
      accountOpen: new FormControl(action?.accountOpen || ""),
      accountClose: new FormControl(action?.accountClose || ""),
      accountStatus: new FormControl(action?.accountStatus || ""),
      howFundsObtained: new FormControl(action?.howFundsObtained || ""),
      accountCurrency: new FormControl(action?.accountCurrency || ""),
      hasAccountHolders: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "hasAccountHolders",
          action?.hasAccountHolders,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup(holder),
        ) || (createEmptyArrays ? [this.createAccountHolderGroup()] : []),
      ),
      wasSofInfoObtained: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "wasSofInfoObtained",
          action?.wasSofInfoObtained,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      sourceOfFunds: new FormArray(
        action?.sourceOfFunds?.map((source) =>
          this.createSourceOfFundsGroup(source),
        ) || (createEmptyArrays ? [this.createSourceOfFundsGroup()] : []),
      ),
      wasCondInfoObtained: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "wasCondInfoObtained",
          action?.wasCondInfoObtained,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      conductors: new FormArray(
        action?.conductors?.map((conductor) =>
          this.createConductorGroup({ conductor }),
        ) || (createEmptyArrays ? [this.createConductorGroup()] : []),
      ),
    });
  }

  private createCompletingActionGroup({
    action,
    createEmptyArrays = false,
  }: {
    action?: CompletingAction;
    createEmptyArrays?: boolean;
  } = {}): FormGroup {
    if (action?.accountHolders)
      action.hasAccountHolders = action.accountHolders.length > 0;

    return new FormGroup({
      _id: new FormControl(action?._id || uuidv4()),
      detailsOfDispo: new FormControl(action?.detailsOfDispo || ""),
      detailsOfDispoOther: new FormControl(
        action?.detailsOfDispoOther || "",
        Validators.required,
      ),
      amount: new FormControl(action?.amount || null),
      currency: new FormControl(action?.currency || ""),
      exchangeRate: new FormControl(action?.exchangeRate || null),
      valueInCad: new FormControl(action?.valueInCad || null),
      fiuNo: new FormControl(action?.fiuNo || ""),
      branch: new FormControl(action?.branch || ""),
      account: new FormControl(action?.account || ""),
      accountType: new FormControl(action?.accountType || ""),
      accountTypeOther: new FormControl(
        action?.accountTypeOther || "",
        Validators.required,
      ),
      accountCurrency: new FormControl(action?.accountCurrency || ""),
      accountOpen: new FormControl(action?.accountOpen || ""),
      accountClose: new FormControl(action?.accountClose || ""),
      accountStatus: new FormControl(action?.accountStatus || ""),
      hasAccountHolders: new FormControl(action?.hasAccountHolders || null),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup(holder),
        ) || (createEmptyArrays ? [this.createAccountHolderGroup()] : []),
      ),
      wasAnyOtherSubInvolved: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "wasAnyOtherSubInvolved",
          action?.wasAnyOtherSubInvolved,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      involvedIn: new FormArray(
        action?.involvedIn?.map((inv) => this.createInvolvedInGroup(inv)) ||
          (createEmptyArrays ? [this.createInvolvedInGroup()] : []),
      ),
      wasBenInfoObtained: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "wasBenInfoObtained",
          action?.wasBenInfoObtained,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      beneficiaries: new FormArray(
        action?.beneficiaries?.map((ben) => this.createBeneficiaryGroup(ben)) ||
          (createEmptyArrays ? [this.createBeneficiaryGroup()] : []),
      ),
    });
  }

  private createAccountHolderGroup(holder?: AccountHolder): FormGroup {
    return new FormGroup({
      _id: new FormControl(holder?._id || uuidv4()),
      linkToSub: new FormControl(holder?.linkToSub || "", Validators.required),
    });
  }

  private createSourceOfFundsGroup(source?: SourceOfFunds): FormGroup {
    return new FormGroup({
      _id: new FormControl(source?._id || uuidv4()),
      linkToSub: new FormControl(source?.linkToSub || "", Validators.required),
      accountNumber: new FormControl(source?.accountNumber || ""),
      policyNumber: new FormControl(source?.policyNumber || ""),
      identifyingNumber: new FormControl(source?.identifyingNumber || ""),
    });
  }

  private createConductorGroup({
    conductor,
  }: { conductor?: Conductor } = {}): FormGroup {
    return new FormGroup({
      _id: new FormControl(conductor?._id || uuidv4()),
      linkToSub: new FormControl(
        conductor?.linkToSub || "",
        Validators.required,
      ),
      clientNo: new FormControl(conductor?.clientNo || ""),
      email: new FormControl(conductor?.email || ""),
      url: new FormControl(conductor?.url || ""),
      wasConductedOnBehalf: new FormControl(
        this.changeLogService.getInitValForDepPropToggle(
          "wasConductedOnBehalf",
          conductor?.wasConductedOnBehalf,
          !!this.strTxnsBeforeBulkEdit,
        ),
      ),
      onBehalfOf: new FormArray(
        conductor?.onBehalfOf?.map((behalf) =>
          this.createOnBehalfOfGroup(behalf),
        ) || [],
      ),
    });
  }

  private createOnBehalfOfGroup(behalf?: OnBehalfOf): FormGroup {
    return new FormGroup({
      linkToSub: new FormControl(behalf?.linkToSub || "", Validators.required),
      clientNo: new FormControl(behalf?.clientNo || ""),
      email: new FormControl(behalf?.email || ""),
      url: new FormControl(behalf?.url || ""),
      relationToCond: new FormControl(behalf?.relationToCond || ""),
      relationToCondOther: new FormControl(
        behalf?.relationToCondOther || "",
        Validators.required,
      ),
    });
  }

  private createInvolvedInGroup(involved?: InvolvedIn): FormGroup {
    return new FormGroup({
      _id: new FormControl(involved?._id || uuidv4()),
      linkToSub: new FormControl(
        involved?.linkToSub || "",
        Validators.required,
      ),
      accountNumber: new FormControl(involved?.accountNumber || ""),
      policyNumber: new FormControl(involved?.policyNumber || ""),
      identifyingNumber: new FormControl(involved?.identifyingNumber || ""),
    });
  }

  private createBeneficiaryGroup(beneficiary?: Beneficiary): FormGroup {
    return new FormGroup({
      _id: new FormControl(beneficiary?._id || uuidv4()),
      linkToSub: new FormControl(
        beneficiary?.linkToSub || "",
        Validators.required,
      ),
      clientNo: new FormControl(beneficiary?.clientNo || null),
      email: new FormControl(beneficiary?.email || ""),
      url: new FormControl(beneficiary?.url || ""),
    });
  }

  // ----------------------
  // Array Management
  // ----------------------
  // Starting Actions
  addStartingAction(isBulk: boolean): void {
    const newSaGroup = this.createStartingActionGroup({
      createEmptyArrays: isBulk,
    });
    this.strTxnForm.controls.startingActions.push(newSaGroup);
    this.strTxnForm.controls.startingActions.markAllAsTouched();

    if (isBulk) newSaGroup.disable();
  }

  removeStartingAction(index: number): void {
    this.strTxnForm.controls.startingActions.removeAt(index);
  }

  // Completing Actions
  addCompletingAction(isBulk: boolean): void {
    const newCaGroup = this.createCompletingActionGroup({
      createEmptyArrays: isBulk,
    });
    this.strTxnForm.controls.completingActions.push(newCaGroup);
    this.strTxnForm.controls.completingActions.markAllAsTouched();

    if (isBulk) newCaGroup.disable();
  }

  removeCompletingAction(index: number): void {
    this.strTxnForm.controls.completingActions.removeAt(index);
  }

  /**
   * Account Holders (within StartingAction/CompletingAction)
   *
   * @param {keyof StrTxn} actionControlName
   * @param {number} actionIndex
   */
  addAccountHolder(actionControlName: keyof StrTxn, actionIndex: number): void {
    const action = (
      this.strTxnForm.get(actionControlName) as any as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders!.disabled) return;
    if (!action.controls.hasAccountHolders.value) return;

    action.controls.accountHolders!.push(this.createAccountHolderGroup());
    action.controls.accountHolders!.markAllAsTouched();
  }

  removeAccountHolder(
    actionControlName: keyof StrTxn,
    actionIndex: number,
    index: number,
  ): void {
    const action = (
      this.strTxnForm.get(actionControlName) as any as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders!.disabled) return;

    action.controls.accountHolders!.removeAt(index);
  }

  // Source of Funds
  addSourceOfFunds(saIndex: number): void {
    const startingAction = this.strTxnForm.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;
    if (!startingAction.controls.wasSofInfoObtained.value) return;

    startingAction.controls.sourceOfFunds.push(this.createSourceOfFundsGroup());
    startingAction.controls.sourceOfFunds.markAllAsTouched();
  }

  removeSourceOfFunds(saIndex: number, index: number): void {
    const startingAction = this.strTxnForm.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;

    startingAction.controls.sourceOfFunds.removeAt(index);
  }

  // Conductors
  addConductor(saIndex: number): void {
    const startingAction = this.strTxnForm.controls.startingActions.at(saIndex);

    if (startingAction.controls.conductors.disabled) return;
    if (!startingAction.controls.wasCondInfoObtained.value) return;

    startingAction.controls.conductors.push(this.createConductorGroup());
    startingAction.controls.conductors.markAllAsTouched();
  }

  removeConductor(saIndex: number, index: number): void {
    const startingAction = this.strTxnForm.controls.startingActions.at(saIndex);
    if (startingAction.controls.conductors.disabled) return;

    startingAction.controls.conductors.removeAt(index);
  }

  // On Behalf Of
  addOnBehalfOf(saIndex: number, conductorIndex: number): void {
    const startingAction = this.strTxnForm.controls.startingActions.at(saIndex);

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
      .controls.onBehalfOf.push(this.createOnBehalfOfGroup());
    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.markAllAsTouched();
  }

  removeOnBehalfOf(
    saIndex: number,
    conductorIndex: number,
    index: number,
  ): void {
    const startingAction = this.strTxnForm.controls.startingActions.at(saIndex);

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
      this.strTxnForm.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;
    if (!completingAction.controls.wasAnyOtherSubInvolved.value) return;

    completingAction.controls.involvedIn!.push(this.createInvolvedInGroup());
    completingAction.controls.involvedIn!.markAllAsTouched();
  }

  removeInvolvedIn(caIndex: number, index: number): void {
    const completingAction =
      this.strTxnForm.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;

    completingAction.controls.involvedIn!.removeAt(index);
  }

  // Beneficiaries
  addBeneficiary(caIndex: number): void {
    const completingAction =
      this.strTxnForm.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;
    if (!completingAction.controls.wasBenInfoObtained.value) return;

    completingAction.controls.beneficiaries!.push(
      this.createBeneficiaryGroup(),
    );
    completingAction.controls.beneficiaries!.markAllAsTouched();
  }

  removeBeneficiary(caIndex: number, index: number): void {
    const completingAction =
      this.strTxnForm.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;

    completingAction.controls.beneficiaries!.removeAt(index);
  }

  snackBar = inject(MatSnackBar);

  // ----------------------
  // Form Submission
  // ----------------------
  isSubmitted = false;
  onSubmit(): void {
    console.log(
      "🚀 ~ EditFormComponent ~ onSubmit ~ this.userForm!.value:",
      this.strTxnForm!.value,
    );
    if (this.isSubmitted && !!this.strTxnsBeforeBulkEdit) {
      this.snackBar.open(
        "Edits already saved please close this tab!",
        "Dismiss",
        {
          duration: 5000,
        },
      );
      return;
    }
    if (!this.strTxnsBeforeBulkEdit) {
      const changes: ChangeLogWithoutVersion[] = [];
      this.changeLogService.compareProperties(
        this.strTxnBeforeEdit,
        this.strTxnForm!.value,
        changes,
      );
      this.crossTabEditService.saveEditResponseToLocalStorage(this.sessionId, {
        type: "EDIT_RESULT",
        payload: {
          strTxnId: this.strTxnBeforeEdit!._mongoid,
          changeLogs: changes,
        },
      });
      this.strTxnBeforeEdit = this.strTxnForm
        .value as any as WithVersion<StrTxn>;
    } else {
      this.crossTabEditService.saveEditResponseToLocalStorage(this.sessionId, {
        type: "BULK_EDIT_RESULT",
        payload: this.strTxnsBeforeBulkEdit.map((txnBefore) => {
          const changes: ChangeLogWithoutVersion[] = [];
          this.changeLogService.compareProperties(
            txnBefore,
            this.strTxnForm.getRawValue(),
            changes,
            { discriminator: "index" },
          );
          return { changeLogs: changes, strTxnId: txnBefore._mongoid };
        }),
      });
    }
    this.snackBar.open("Edits saved!", "Dismiss", {
      duration: 5000,
    });
    this.isSubmitted = true;
  }
}
type TypedForm<T> = {
  [K in keyof T]: Exclude<T[K], undefined> extends Array<infer U>
    ? FormArray<
        U extends object ? FormGroup<TypedForm<U>> : FormControl<U | null>
      >
    : T[K] extends object
      ? FormGroup<TypedForm<T[K]>>
      : FormControl<T[K] | null>;
};

type StrTxnFormType = FormGroup<TypedForm<WithVersion<StrTxn>>>;
