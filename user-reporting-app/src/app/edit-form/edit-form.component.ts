import { CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
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
  WithVersion,
} from "../change-log.service";
import { ActivatedRoute } from "@angular/router";
import { removePageFromOpenTabs } from "../single-tab.guard";
import { ClearFieldDirective } from "./clear-field.directive";
import { ResetFieldDirective } from "./reset-field.directive";
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
    ClearFieldDirective,
    ResetFieldDirective,
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
          <mat-tab label="Transaction Details">
            <div>
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Transaction Information</mat-card-title>
                </mat-card-header>
                <mat-card-content class="mt-5">
                  <div class="row row-cols-md-4">
                    <mat-form-field class="col">
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
                    </mat-form-field>

                    <mat-form-field class="col">
                      <mat-label>Time of Transaction</mat-label>
                      <input
                        matInput
                        formControlName="timeOfTxn"
                        type="time"
                        step="1"
                        appTransactionTime
                      />
                    </mat-form-field>

                    <mat-checkbox formControlName="hasPostingDate" class="col">
                      Has Posting Date?
                    </mat-checkbox>
                  </div>

                  <div class="row row-cols-md-4">
                    <mat-form-field class="col">
                      <mat-label>Date of Posting</mat-label>
                      <input
                        matInput
                        formControlName="dateOfPosting"
                        [matDatepicker]="dateOfPostingPicker"
                        appTransactionDate
                        [appControlToggle]="'hasPostingDate'"
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
                        [appControlToggle]="'hasPostingDate'"
                      />
                    </mat-form-field>
                  </div>

                  <div class="row">
                    <mat-form-field class="col-md-3">
                      <mat-label>Method of Transaction</mat-label>
                      <select matNativeControl formControlName="methodOfTxn">
                        <option value="ABM">ABM</option>
                        <option value="In-Person">In-Person</option>
                        <option value="Online">Online</option>
                        <option value="Other">Other</option>
                      </select>
                    </mat-form-field>

                    <mat-form-field class="col-md-9">
                      <mat-label>Specify Method of Transaction</mat-label>
                      <input
                        matInput
                        formControlName="methodOfTxnOther"
                        [appControlToggle]="'methodOfTxn'"
                        [appControlToggleValue]="'Other'"
                      />
                    </mat-form-field>
                  </div>

                  <div class="row">
                    <mat-checkbox
                      formControlName="wasTxnAttempted"
                      class="col-md-2"
                    >
                      Was Transaction Attempted?
                    </mat-checkbox>

                    <mat-form-field class="col-md-10">
                      <mat-label
                        >Reason transaction was not completed</mat-label
                      >
                      <input
                        matInput
                        formControlName="wasTxnAttemptedReason"
                        [appControlToggle]="'wasTxnAttempted'"
                      />
                    </mat-form-field>
                  </div>

                  <div class="row row-cols-md-1">
                    <mat-form-field class="col">
                      <mat-label>Purpose of Transaction</mat-label>
                      <input matInput formControlName="purposeOfTxn" />
                    </mat-form-field>

                    <mat-form-field class="col">
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
          <mat-tab label="Starting Actions">
            <div class="d-flex flex-column align-items-end">
              <button
                type="button"
                mat-raised-button
                color="primary"
                (click)="addStartingAction()"
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

                    <div class="row row-cols-4">
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
                      </mat-form-field>

                      <mat-form-field class="col">
                        <mat-label>Specify Other</mat-label>
                        <input
                          matInput
                          formControlName="typeOfFundsOther"
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.typeOfFunds'
                          "
                          [appControlToggleValue]="'Other'"
                        />
                      </mat-form-field>
                    </div>

                    <div class="row row-cols-4">
                      <mat-form-field class="col">
                        <mat-label>Amount</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
                        />
                      </mat-form-field>
                      <mat-form-field class="col">
                        <mat-label>Currency</mat-label>
                        <select matNativeControl formControlName="currency">
                          <option value=""></option>
                          <option value="CAD">CAD</option>
                          <option value="USD">USD</option>
                        </select>
                      </mat-form-field>
                    </div>

                    <div class="row row-cols-4">
                      <mat-form-field class="col">
                        <mat-label>FIU Number</mat-label>
                        <input matInput formControlName="fiuNo" />
                      </mat-form-field>
                      <mat-form-field class="col">
                        <mat-label>Branch</mat-label>
                        <input matInput formControlName="branch" />
                      </mat-form-field>
                      <mat-form-field class="col">
                        <mat-label>Account Number</mat-label>
                        <input matInput formControlName="account" />
                      </mat-form-field>
                    </div>

                    <div class="row row-cols-4">
                      <mat-form-field class="col">
                        <mat-label>Account Type</mat-label>
                        <select matNativeControl formControlName="accountType">
                          <option value=""></option>
                          <option value="Business">Business</option>
                          <option value="Casino">Casino</option>
                          <option value="Personal">Personal</option>
                          <option value="Other">Other</option>
                        </select>
                      </mat-form-field>

                      <mat-form-field class="col">
                        <mat-label>Specify Other</mat-label>
                        <input
                          matInput
                          formControlName="accountTypeOther"
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.accountType'
                          "
                          [appControlToggleValue]="'Other'"
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
                      </mat-form-field>
                    </div>

                    <div class="row row-cols-4">
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
                      </mat-form-field>
                    </div>

                    <!-- Account Holders Section -->
                    <h2>Account Holders</h2>
                    <div
                      formArrayName="accountHolders"
                      class="d-flex flex-column align-items-end"
                    >
                      <mat-card class="w-100 border-0">
                        <div class="row row-cols-2">
                          <div
                            *ngFor="
                              let holder of saAction.controls.accountHolders
                                ?.controls;
                              let holderIndex = index
                            "
                            [formGroupName]="holderIndex"
                            class="col my-2"
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
                    </div>

                    <div
                      formArrayName="sourceOfFunds"
                      class="d-flex flex-column align-items-end gap-3"
                      [appControlToggle]="
                        'startingActions.' + saIndex + '.wasSofInfoObtained'
                      "
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
                    </div>

                    <div
                      formArrayName="conductors"
                      class="d-flex flex-column align-items-end gap-3"
                      [appControlToggle]="
                        'startingActions.' + saIndex + '.wasCondInfoObtained'
                      "
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
                                    <mat-label
                                      >Specify Other Relation</mat-label
                                    >
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
                                      [appControlToggleValue]="'Other'"
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
          <mat-tab label="Completing Actions">
            <div class="d-flex flex-column align-items-end">
              <button
                type="button"
                mat-raised-button
                color="primary"
                (click)="addCompletingAction()"
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
                    <div class="row row-cols-4">
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
                      </mat-form-field>

                      <mat-form-field class="col">
                        <mat-label>Specify Other</mat-label>
                        <input
                          matInput
                          formControlName="detailsOfDispoOther"
                          [appControlToggle]="
                            'completingActions.' + caIndex + '.detailsOfDispo'
                          "
                          [appControlToggleValue]="'Other'"
                        />
                      </mat-form-field>
                    </div>

                    <!-- Amount Section -->
                    <div class="row row-cols-4">
                      <mat-form-field class="col">
                        <mat-label>Amount</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
                        />
                      </mat-form-field>

                      <mat-form-field class="col">
                        <mat-label>Currency</mat-label>
                        <select matNativeControl formControlName="currency">
                          <option value=""></option>
                          <option value="CAD">CAD</option>
                          <option value="USD">USD</option>
                          <!-- Add other currencies -->
                        </select>
                      </mat-form-field>

                      <mat-form-field class="col">
                        <mat-label>Exchange Rate</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="exchangeRate"
                        />
                      </mat-form-field>

                      <mat-form-field class="col">
                        <mat-label>Value in CAD</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="valueInCad"
                        />
                      </mat-form-field>
                    </div>

                    <!-- Account Information -->
                    <div class="row row-cols-4">
                      <mat-form-field class="col">
                        <mat-label>FIU Number</mat-label>
                        <input matInput formControlName="fiuNo" />
                      </mat-form-field>
                      <mat-form-field class="col">
                        <mat-label>Branch</mat-label>
                        <input matInput formControlName="branch" />
                      </mat-form-field>
                      <mat-form-field class="col">
                        <mat-label>Account Number</mat-label>
                        <input matInput formControlName="account" />
                      </mat-form-field>
                    </div>

                    <div class="row row-cols-4">
                      <mat-form-field class="col">
                        <mat-label>Account Type</mat-label>
                        <select matNativeControl formControlName="accountType">
                          <option value=""></option>
                          <option value="Business">Business</option>
                          <option value="Casino">Casino</option>
                          <option value="Personal">Personal</option>
                          <option value="Other">Other</option>
                        </select>
                      </mat-form-field>

                      <mat-form-field class="col">
                        <mat-label>Specify Other</mat-label>
                        <input
                          matInput
                          formControlName="accountTypeOther"
                          [appControlToggle]="
                            'completingActions.' + caIndex + '.accountType'
                          "
                          [appControlToggleValue]="'Other'"
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
                      </mat-form-field>
                    </div>

                    <div class="row row-cols-4">
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
                      </mat-form-field>
                    </div>

                    <!-- Account Holders Section -->
                    <h2>Account Holders</h2>
                    <div
                      formArrayName="accountHolders"
                      class="d-flex flex-column align-items-end"
                    >
                      <mat-card class="w-100 border-0">
                        <div class="row row-cols-2">
                          <div
                            *ngFor="
                              let holder of caAction.controls.accountHolders
                                ?.controls;
                              let holderIndex = index
                            "
                            [formGroupName]="holderIndex"
                            class="col my-2"
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
                    </div>

                    <div
                      formArrayName="involvedIn"
                      class="d-flex flex-column align-items-end gap-3"
                      [appControlToggle]="
                        'completingActions.' +
                        caIndex +
                        '.wasAnyOtherSubInvolved'
                      "
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
                    </div>

                    <div
                      formArrayName="beneficiaries"
                      class="d-flex flex-column align-items-end gap-3"
                      [appControlToggle]="
                        'completingActions.' + caIndex + '.wasBenInfoObtained'
                      "
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
        <pre class="overlay-pre">
Form values: {{ strTxnForm.value | json }}</pre
        >
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
      wasTxnAttempted: new FormControl(txn?.wasTxnAttempted || false),
      wasTxnAttemptedReason: new FormControl(txn?.wasTxnAttemptedReason || ""),
      dateOfTxn: new FormControl(txn?.dateOfTxn || ""),
      timeOfTxn: new FormControl(txn?.timeOfTxn || ""),
      hasPostingDate: new FormControl(txn?.hasPostingDate || false),
      dateOfPosting: new FormControl(txn?.dateOfPosting || ""),
      timeOfPosting: new FormControl(txn?.timeOfPosting || ""),
      methodOfTxn: new FormControl(txn?.methodOfTxn || ""),
      methodOfTxnOther: new FormControl(txn?.methodOfTxnOther || ""),
      reportingEntityTxnRefNo: new FormControl(
        txn?.reportingEntityTxnRefNo || "",
      ),
      purposeOfTxn: new FormControl(txn?.purposeOfTxn || ""),
      reportingEntityLocationNo: new FormControl(
        txn?.reportingEntityLocationNo || "",
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
  }

  // --------------------------
  // Form Group Creation Methods
  // --------------------------
  private createStartingActionGroup({
    action,
    createEmptyArrays = false,
  }: { action?: StartingAction; createEmptyArrays?: boolean } = {}): FormGroup {
    return new FormGroup({
      _id: new FormControl(action?._id || uuidv4()),
      directionOfSA: new FormControl(action?.directionOfSA || ""),
      typeOfFunds: new FormControl(action?.typeOfFunds || ""),
      typeOfFundsOther: new FormControl(action?.typeOfFundsOther || ""),
      amount: new FormControl(action?.amount || null),
      currency: new FormControl(action?.currency || ""),
      fiuNo: new FormControl(action?.fiuNo || ""),
      branch: new FormControl(action?.branch || ""),
      account: new FormControl(action?.account || ""),
      accountType: new FormControl(action?.accountType || ""),
      accountTypeOther: new FormControl(action?.accountTypeOther || ""),
      accountOpen: new FormControl(action?.accountOpen || ""),
      accountClose: new FormControl(action?.accountClose || ""),
      accountStatus: new FormControl(action?.accountStatus || ""),
      howFundsObtained: new FormControl(action?.howFundsObtained || ""),
      accountCurrency: new FormControl(action?.accountCurrency || ""),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup(holder),
        ) || (createEmptyArrays ? [this.createAccountHolderGroup()] : []),
      ),
      wasSofInfoObtained: new FormControl(action?.wasSofInfoObtained || false),
      sourceOfFunds: new FormArray(
        action?.sourceOfFunds?.map((source) =>
          this.createSourceOfFundsGroup(source),
        ) || (createEmptyArrays ? [this.createSourceOfFundsGroup()] : []),
      ),
      wasCondInfoObtained: new FormControl(
        action?.wasCondInfoObtained || false,
      ),
      conductors: new FormArray(
        action?.conductors?.map((conductor) =>
          this.createConductorGroup({ conductor }),
        ) ||
          (createEmptyArrays
            ? [this.createConductorGroup({ createEmptyArrays })]
            : []),
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
    return new FormGroup({
      _id: new FormControl(action?._id || uuidv4()),
      detailsOfDispo: new FormControl(action?.detailsOfDispo || ""),
      detailsOfDispoOther: new FormControl(action?.detailsOfDispoOther || ""),
      amount: new FormControl(action?.amount || null),
      currency: new FormControl(action?.currency || ""),
      exchangeRate: new FormControl(action?.exchangeRate || null),
      valueInCad: new FormControl(action?.valueInCad || null),
      fiuNo: new FormControl(action?.fiuNo || ""),
      branch: new FormControl(action?.branch || ""),
      account: new FormControl(action?.account || ""),
      accountType: new FormControl(action?.accountType || ""),
      accountTypeOther: new FormControl(action?.accountTypeOther || ""),
      accountCurrency: new FormControl(action?.accountCurrency || ""),
      accountOpen: new FormControl(action?.accountOpen || ""),
      accountClose: new FormControl(action?.accountClose || ""),
      accountStatus: new FormControl(action?.accountStatus || ""),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup(holder),
        ) || (createEmptyArrays ? [this.createAccountHolderGroup()] : []),
      ),
      wasAnyOtherSubInvolved: new FormControl(
        action?.wasAnyOtherSubInvolved || false,
      ),
      involvedIn: new FormArray(
        action?.involvedIn?.map((inv) => this.createInvolvedInGroup(inv)) ||
          (createEmptyArrays ? [this.createInvolvedInGroup()] : []),
      ),
      wasBenInfoObtained: new FormControl(action?.wasBenInfoObtained || false),
      beneficiaries: new FormArray(
        action?.beneficiaries?.map((ben) => this.createBeneficiaryGroup(ben)) ||
          (createEmptyArrays ? [this.createBeneficiaryGroup()] : []),
      ),
    });
  }

  private createAccountHolderGroup(holder?: AccountHolder): FormGroup {
    return new FormGroup({
      _id: new FormControl(holder?._id || uuidv4()),
      linkToSub: new FormControl(holder?.linkToSub || ""),
    });
  }

  private createSourceOfFundsGroup(source?: SourceOfFunds): FormGroup {
    return new FormGroup({
      _id: new FormControl(source?._id || uuidv4()),
      linkToSub: new FormControl(source?.linkToSub || ""),
      accountNumber: new FormControl(source?.accountNumber || ""),
      policyNumber: new FormControl(source?.policyNumber || ""),
      identifyingNumber: new FormControl(source?.identifyingNumber || ""),
    });
  }

  private createConductorGroup({
    conductor,
    createEmptyArrays = false,
  }: { conductor?: Conductor; createEmptyArrays?: boolean } = {}): FormGroup {
    return new FormGroup({
      _id: new FormControl(conductor?._id || uuidv4()),
      linkToSub: new FormControl(conductor?.linkToSub || ""),
      clientNo: new FormControl(conductor?.clientNo || ""),
      email: new FormControl(conductor?.email || ""),
      url: new FormControl(conductor?.url || ""),
      wasConductedOnBehalf: new FormControl(
        conductor?.wasConductedOnBehalf || false,
      ),
      onBehalfOf: new FormArray(
        conductor?.onBehalfOf?.map((behalf) =>
          this.createOnBehalfOfGroup(behalf),
        ) || (createEmptyArrays ? [this.createOnBehalfOfGroup()] : []),
      ),
    });
  }

  private createOnBehalfOfGroup(behalf?: OnBehalfOf): FormGroup {
    return new FormGroup({
      linkToSub: new FormControl(behalf?.linkToSub || ""),
      clientNo: new FormControl(behalf?.clientNo || ""),
      email: new FormControl(behalf?.email || ""),
      url: new FormControl(behalf?.url || ""),
      relationToCond: new FormControl(behalf?.relationToCond || ""),
      relationToCondOther: new FormControl(behalf?.relationToCondOther || ""),
    });
  }

  private createInvolvedInGroup(involved?: InvolvedIn): FormGroup {
    return new FormGroup({
      _id: new FormControl(involved?._id || uuidv4()),
      linkToSub: new FormControl(involved?.linkToSub || ""),
      accountNumber: new FormControl(involved?.accountNumber || ""),
      policyNumber: new FormControl(involved?.policyNumber || ""),
      identifyingNumber: new FormControl(involved?.identifyingNumber || ""),
    });
  }

  private createBeneficiaryGroup(beneficiary?: Beneficiary): FormGroup {
    return new FormGroup({
      _id: new FormControl(beneficiary?._id || uuidv4()),
      linkToSub: new FormControl(beneficiary?.linkToSub || ""),
      clientNo: new FormControl(beneficiary?.clientNo || null),
      email: new FormControl(beneficiary?.email || ""),
      url: new FormControl(beneficiary?.url || ""),
    });
  }

  // ----------------------
  // Array Management
  // ----------------------
  // Starting Actions
  addStartingAction(): void {
    this.strTxnForm.controls.startingActions.push(
      this.createStartingActionGroup(),
    );
  }

  removeStartingAction(index: number): void {
    this.strTxnForm.controls.startingActions.removeAt(index);
  }

  // Completing Actions
  addCompletingAction(): void {
    this.strTxnForm.controls.completingActions.push(
      this.createCompletingActionGroup(),
    );
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
    const actionArray = this.strTxnForm.get(actionControlName) as any as
      | FormArray<FormGroup<TypedForm<StartingAction>>>
      | FormArray<FormGroup<TypedForm<CompletingAction>>>;
    const actionGroup = actionArray.at(actionIndex);
    actionGroup.controls.accountHolders!.push(this.createAccountHolderGroup());
  }

  removeAccountHolder(
    actionControlName: keyof StrTxn,
    actionIndex: number,
    index: number,
  ): void {
    const actionArray = this.strTxnForm.get(actionControlName) as any as
      | FormArray<FormGroup<TypedForm<StartingAction>>>
      | FormArray<FormGroup<TypedForm<CompletingAction>>>;
    const actionGroup = actionArray.at(actionIndex);
    actionGroup.controls.accountHolders!.removeAt(index);
  }

  // Source of Funds
  addSourceOfFunds(saIndex: number): void {
    const sourceOfFunds =
      this.strTxnForm.controls.startingActions.at(saIndex).controls
        .sourceOfFunds;

    if (sourceOfFunds.disabled) return;
    sourceOfFunds.push(this.createSourceOfFundsGroup());
  }

  removeSourceOfFunds(saIndex: number, index: number): void {
    const sourceOfFunds =
      this.strTxnForm.controls.startingActions.at(saIndex).controls
        .sourceOfFunds;

    if (sourceOfFunds.disabled) return;
    sourceOfFunds.removeAt(index);
  }

  // Conductors
  addConductor(saIndex: number): void {
    const conductors =
      this.strTxnForm.controls.startingActions.at(saIndex).controls.conductors;

    if (conductors.disabled) return;
    conductors.push(this.createConductorGroup());
  }

  removeConductor(saIndex: number, index: number): void {
    const conductors =
      this.strTxnForm.controls.startingActions.at(saIndex).controls.conductors;

    if (conductors.disabled) return;
    conductors.removeAt(index);
  }

  // On Behalf Of
  addOnBehalfOf(saIndex: number, conductorIndex: number): void {
    const onBehalfOf = this.strTxnForm.controls.startingActions
      .at(saIndex)
      .controls.conductors.at(conductorIndex).controls.onBehalfOf;

    if (onBehalfOf.disabled) return;
    onBehalfOf.push(this.createOnBehalfOfGroup());
  }

  removeOnBehalfOf(
    saIndex: number,
    conductorIndex: number,
    index: number,
  ): void {
    const onBehalfOf = this.strTxnForm.controls.startingActions
      .at(saIndex)
      .controls.conductors.at(conductorIndex).controls.onBehalfOf;

    if (onBehalfOf.disabled) return;
    onBehalfOf.removeAt(index);
  }

  // Involved In (Completing Action)
  addInvolvedIn(caIndex: number): void {
    const involvedIn =
      this.strTxnForm.controls.completingActions.at(caIndex).controls
        .involvedIn!;

    if (involvedIn.disabled) return;
    involvedIn.push(this.createInvolvedInGroup());
  }

  removeInvolvedIn(caIndex: number, index: number): void {
    const involvedIn =
      this.strTxnForm.controls.completingActions.at(caIndex).controls
        .involvedIn!;

    if (involvedIn.disabled) return;
    involvedIn.removeAt(index);
  }

  // Beneficiaries
  addBeneficiary(caIndex: number): void {
    const beneficiaries =
      this.strTxnForm.controls.completingActions.at(caIndex).controls
        .beneficiaries!;

    if (beneficiaries.disabled) return;
    beneficiaries.push(this.createBeneficiaryGroup());
  }

  removeBeneficiary(caIndex: number, index: number): void {
    const beneficiaries =
      this.strTxnForm.controls.completingActions.at(caIndex).controls
        .beneficiaries!;

    if (beneficiaries.disabled) return;
    beneficiaries.removeAt(index);
  }

  // ----------------------
  // Form Submission
  // ----------------------
  onSubmit(): void {
    console.log(
      "🚀 ~ EditFormComponent ~ onSubmit ~ this.userForm!.value:",
      this.strTxnForm!.value,
    );
    // debugger;
    if (!this.strTxnForm!.valid) return;
    const changes: ChangeLog[] = [];
    this.changeLogService.compareProperties(
      this.strTxnBeforeEdit,
      this.strTxnForm!.value,
      changes,
    );
    this.crossTabEditService.saveEditResponseToLocalStorage(
      this.sessionId,
      this.strTxnBeforeEdit?._mongoid!,
      changes,
    );
    this.strTxnBeforeEdit = this.strTxnForm.value as any as WithVersion<StrTxn>;
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
