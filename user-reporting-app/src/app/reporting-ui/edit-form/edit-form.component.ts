import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatBadgeModule } from "@angular/material/badge";
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
  ActivatedRoute,
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from "@angular/router";
import { isEqualWith } from "lodash-es";
import { defer, map, tap } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import {
  SessionStateService,
  StrTransactionWithChangeLogs,
} from "../../aml/session-state.service";
import { ChangeLogService, WithVersion } from "../../change-log.service";
import { ClearFieldDirective } from "../../clear-field.directive";
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
  StrTransaction,
  StrTransactionData,
  StrTxnFlowOfFunds,
} from "../reporting-ui-table/reporting-ui-table.component";
import { ControlToggleDirective } from "./control-toggle.directive";
import { MarkAsEmptyDirective } from "./mark-as-empty.directive";
import { ToggleEditFieldDirective } from "./toggle-edit-field.directive";
import { TransactionDateDirective } from "./transaction-date.directive";
import { TransactionDetailsPanelComponent } from "./transaction-details-panel/transaction-details-panel.component";
import { TransactionTimeDirective } from "./transaction-time.directive";

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
    MarkAsEmptyDirective,
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
    ClearFieldDirective,
    MatBadgeModule,
  ],
  template: `
    <div class="container px-0 mb-5">
      <mat-toolbar class="justify-content-end px-0">
        <button mat-icon-button (click)="navigateBack()" aria-label="Go back">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="flex-fill"></div>

        <!-- <ng-container
          *ngIf="isNotAudit; else auditDropdown"
        > -->
        <ng-container *ngIf="isNotAudit">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            form="edit-form"
            [disabled]="
              !(editFormHasChanges$ | async) ||
              (sessionDataService.savingStatus$ | async)
            "
            [matBadge]="selectedTransactionsForBulkEditLength"
            [matBadgeHidden]="!isBulkEdit"
          >
            <ng-container
              *ngIf="sessionDataService.savingStatus$ | async; else saveText"
            >
              Saving...
            </ng-container>
            <ng-template #saveText>Save</ng-template>
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
      <app-transaction-details-panel
        *ngIf="isSingleEdit"
        [singleStrTransaction]="$any(editType.payload)"
      />
    </div>
    <div class="container form-field-density px-0">
      <form
        *ngIf="editForm"
        [formGroup]="editForm"
        (ngSubmit)="onSave()"
        [class.bulk-edit-form]="isBulkEdit"
        class="edit-form"
        data-testid="edit-form"
        id="edit-form"
      >
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
                        appMarkAsEmpty
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
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col-xl-4" data-testid="timeOfTxn">
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
                        appMarkAsEmpty
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
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                    <div class="col-xl-4 d-flex">
                      <mat-checkbox
                        formControlName="hasPostingDate"
                        class="col-auto"
                        data-testid="hasPostingDate"
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
                    <mat-form-field class="col" data-testid="dateOfPosting">
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
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col" data-testid="timeOfPosting">
                      <mat-label>Time of Posting</mat-label>
                      <input
                        matInput
                        formControlName="timeOfPosting"
                        type="time"
                        step="1"
                        appTransactionTime
                        appControlToggle="hasPostingDate"
                      />
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>
                  <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3">
                    <mat-form-field class="col" data-testid="methodOfTxn">
                      <mat-label>Method of Transaction</mat-label>
                      <mat-select formControlName="methodOfTxn">
                        <mat-option
                          *ngFor="let key of methodOfTxnOptionsKeys"
                          [value]="methodOfTxnOptions[key]"
                        >
                          {{ key }}
                        </mat-option>
                      </mat-select>
                      <button
                        [disabled]="!this.isBulkEdit"
                        type="button"
                        appMarkAsEmpty
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
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field class="col" data-testid="methodOfTxnOther">
                      <mat-label>Other Method of Transaction</mat-label>
                      <input
                        matInput
                        formControlName="methodOfTxnOther"
                        appControlToggle="methodOfTxn"
                        appControlToggleValue="Other"
                      />
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>
                  <div class="row row-cols-1">
                    <div class="col-12 col-xl-4 d-flex">
                      <mat-checkbox
                        formControlName="wasTxnAttempted"
                        class="col-auto"
                        data-testid="wasTxnAttempted"
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
                    <mat-form-field
                      class="col-12 col-xl-8"
                      data-testid="wasTxnAttemptedReason"
                    >
                      <mat-label
                        >Reason transaction was not completed</mat-label
                      >
                      <input
                        matInput
                        formControlName="wasTxnAttemptedReason"
                        appControlToggle="wasTxnAttempted"
                      />
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>
                  <div class="row row-cols-md-3">
                    <mat-form-field class="col-md-8" data-testid="purposeOfTxn">
                      <mat-label>Purpose of Transaction</mat-label>
                      <input matInput formControlName="purposeOfTxn" />
                      <button
                        [disabled]="!this.isBulkEdit"
                        type="button"
                        appMarkAsEmpty
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
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                  </div>
                  <div class="row row-cols-md-3">
                    <mat-form-field
                      class="col-md-4"
                      data-testid="reportingEntityLocationNo"
                    >
                      <mat-label>Reporting Entity Location</mat-label>
                      <input
                        matInput
                        formControlName="reportingEntityLocationNo"
                      />
                      <button
                        [disabled]="this.isBulkEdit"
                        type="button"
                        appClearField
                        mat-icon-button
                        matSuffix
                      >
                        <mat-icon>clear</mat-icon>
                      </button>
                    </mat-form-field>
                    <mat-form-field
                      class="col-md-8"
                      data-testid="reportingEntityTxnRefNo"
                    >
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
                (click)="addStartingAction(!!this.isBulkEdit)"
                class="mx-1"
                [attr.data-testid]="'startingActions-add'"
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
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-directionOfSA'
                        "
                      >
                        <mat-label>Direction</mat-label>
                        <mat-select formControlName="directionOfSA">
                          <mat-option
                            *ngFor="let key of directionOfSAOptionsKeys"
                            [value]="directionOfSAOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-typeOfFunds'
                        "
                      >
                        <mat-label>Type of Funds</mat-label>
                        <mat-select formControlName="typeOfFunds">
                          <mat-option
                            *ngFor="let key of typeofFundsOptionsKeys"
                            [value]="typeofFundsOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-typeOfFundsOther'
                        "
                      >
                        <mat-label>Other Type of Funds</mat-label>
                        <input
                          matInput
                          formControlName="typeOfFundsOther"
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.typeOfFunds'
                          "
                          appControlToggleValue="Other"
                        />
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>
                    <!-- Amount Section -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-amount'
                        "
                      >
                        <mat-label>Amount</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
                        />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-currency'
                        "
                      >
                        <mat-label>Currency</mat-label>
                        <mat-select formControlName="currency">
                          <mat-option
                            *ngFor="let key of amountCurrencyOptionsKeys"
                            [value]="amountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>
                    <!-- Account Information -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-fiuNo'
                        "
                      >
                        <mat-label>FIU Number</mat-label>
                        <input matInput formControlName="fiuNo" />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-branch'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-account'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>
                    <!-- Account Information -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-accountType'
                        "
                      >
                        <mat-label>Account Type</mat-label>
                        <mat-select
                          formControlName="accountType"
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.fiuNo'
                          "
                          appControlToggleValue="010"
                          [appControlRequired]="true"
                        >
                          <mat-option
                            *ngFor="let key of accountTypeOptionsKeys"
                            [value]="accountTypeOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-accountTypeOther'
                        "
                      >
                        <mat-label>Other Account Type</mat-label>
                        <input
                          matInput
                          formControlName="accountTypeOther"
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.accountType'
                          "
                          appControlToggleValue="Other"
                        />
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-accountCurrency'
                        "
                      >
                        <mat-label>Account Currency</mat-label>
                        <mat-select
                          formControlName="accountCurrency"
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.fiuNo'
                          "
                          appControlToggleValue="010"
                          [appControlRequired]="true"
                        >
                          <mat-option
                            *ngFor="let key of accountCurrencyOptionsKeys"
                            [value]="accountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-accountStatus'
                        "
                      >
                        <mat-label>Account Status</mat-label>
                        <mat-select
                          formControlName="accountStatus"
                          [appControlToggle]="
                            'startingActions.' + saIndex + '.fiuNo'
                          "
                          appControlToggleValue="010"
                          [appControlRequired]="true"
                        >
                          <mat-option
                            *ngFor="let key of accountStatusOptionsKeys"
                            [value]="accountStatusOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>
                    <!-- Account Open/Close -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-3">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-accountOpen'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-accountClose'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>
                    <div class="row">
                      <mat-form-field
                        class="col-12"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-howFundsObtained'
                        "
                      >
                        <mat-label>How Funds Were Obtained</mat-label>
                        <textarea
                          matInput
                          formControlName="howFundsObtained"
                          rows="2"
                        ></textarea>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>
                    <!-- Account Holders Section -->
                    <h2>Account Holders</h2>
                    <div class="row">
                      <mat-checkbox
                        class="col"
                        formControlName="hasAccountHolders"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-hasAccountHolders'
                        "
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
                      [isBulkEdit]="isBulkEdit"
                      (addControlGroup)="
                        addAccountHolder('startingActions', saIndex)
                      "
                    >
                      <div
                        *ngFor="
                          let holder of saAction.controls.accountHolders
                            .controls;
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
                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-partyKey'
                              "
                            >
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-surname'
                              "
                            >
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-givenName'
                              "
                            >
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-otherOrInitial'
                              "
                            >
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-nameOfEntity'
                              "
                            >
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>
                          </div>
                        </mat-expansion-panel>
                      </div>
                      <button
                        type="button"
                        mat-raised-button
                        color="primary"
                        (click)="addAccountHolder('startingActions', saIndex)"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-accountHolders-add'
                        "
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
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-wasSofInfoObtained'
                        "
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
                      [isBulkEdit]="isBulkEdit"
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
                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-sourceOfFunds-' +
                                fundsIndex +
                                '-partyKey'
                              "
                            >
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-sourceOfFunds-' +
                                fundsIndex +
                                '-surname'
                              "
                            >
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-sourceOfFunds-' +
                                fundsIndex +
                                '-givenName'
                              "
                            >
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-sourceOfFunds-' +
                                fundsIndex +
                                '-otherOrInitial'
                              "
                            >
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-sourceOfFunds-' +
                                fundsIndex +
                                '-nameOfEntity'
                              "
                            >
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-sourceOfFunds-' +
                                fundsIndex +
                                '-accountNumber'
                              "
                            >
                              <mat-label>Account Number</mat-label>
                              <input matInput formControlName="accountNumber" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-sourceOfFunds-' +
                                fundsIndex +
                                '-identifyingNumber'
                              "
                            >
                              <mat-label>Identifying Number</mat-label>
                              <input
                                matInput
                                formControlName="identifyingNumber"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>
                          </div>
                        </mat-expansion-panel>
                      </div>
                      <button
                        type="button"
                        mat-raised-button
                        color="primary"
                        (click)="addSourceOfFunds(saIndex)"
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-sourceOfFunds-add'
                        "
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
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-wasCondInfoObtained'
                        "
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
                      [isBulkEdit]="isBulkEdit"
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
                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-conductors-' +
                                condIndex +
                                '-partyKey'
                              "
                            >
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-conductors-' +
                                condIndex +
                                '-surname'
                              "
                            >
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-conductors-' +
                                condIndex +
                                '-givenName'
                              "
                            >
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-conductors-' +
                                condIndex +
                                '-otherOrInitial'
                              "
                            >
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'startingActions-' +
                                saIndex +
                                '-conductors-' +
                                condIndex +
                                '-nameOfEntity'
                              "
                            >
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
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
                              "
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
                                    "
                                  >
                                    <mat-label>Party Key</mat-label>
                                    <input
                                      matInput
                                      formControlName="partyKey"
                                    />
                                    <button
                                      [disabled]="this.isBulkEdit"
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix
                                    >
                                      <mat-icon>clear</mat-icon>
                                    </button>
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
                                    "
                                  >
                                    <mat-label>Surname</mat-label>
                                    <input matInput formControlName="surname" />
                                    <button
                                      [disabled]="this.isBulkEdit"
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix
                                    >
                                      <mat-icon>clear</mat-icon>
                                    </button>
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
                                    "
                                  >
                                    <mat-label>GivenName</mat-label>
                                    <input
                                      matInput
                                      formControlName="givenName"
                                    />
                                    <button
                                      [disabled]="this.isBulkEdit"
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix
                                    >
                                      <mat-icon>clear</mat-icon>
                                    </button>
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
                                    "
                                  >
                                    <mat-label>Other or Initial</mat-label>
                                    <input
                                      matInput
                                      formControlName="otherOrInitial"
                                    />
                                    <button
                                      [disabled]="this.isBulkEdit"
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix
                                    >
                                      <mat-icon>clear</mat-icon>
                                    </button>
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
                                    "
                                  >
                                    <mat-label>Name of Entity</mat-label>
                                    <input
                                      matInput
                                      formControlName="nameOfEntity"
                                    />
                                    <button
                                      [disabled]="this.isBulkEdit"
                                      type="button"
                                      appClearField
                                      mat-icon-button
                                      matSuffix
                                    >
                                      <mat-icon>clear</mat-icon>
                                    </button>
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
                        [attr.data-testid]="
                          'startingActions-' + saIndex + '-conductors-add'
                        "
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
                (click)="addCompletingAction(!!this.isBulkEdit)"
                class="mx-1"
                [attr.data-testid]="'completingActions-add'"
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
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-detailsOfDispo'
                        "
                      >
                        <mat-label>Details of Disposition</mat-label>
                        <mat-select formControlName="detailsOfDispo">
                          <mat-option
                            *ngFor="let key of detailsOfDispositionOptionsKeys"
                            [value]="detailsOfDispositionOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>

                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' +
                          caIndex +
                          '-detailsOfDispoOther'
                        "
                      >
                        <mat-label>Other Details of Disposition</mat-label>
                        <input
                          matInput
                          formControlName="detailsOfDispoOther"
                          [appControlToggle]="
                            'completingActions.' + caIndex + '.detailsOfDispo'
                          "
                          appControlToggleValue="Other"
                        />
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>

                    <!-- Amount Section -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-amount'
                        "
                      >
                        <mat-label>Amount</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="amount"
                        />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>

                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-currency'
                        "
                      >
                        <mat-label>Currency</mat-label>
                        <mat-select formControlName="currency">
                          <mat-option
                            *ngFor="let key of amountCurrencyOptionsKeys"
                            [value]="amountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>

                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-exchangeRate'
                        "
                      >
                        <mat-label>Exchange Rate</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="exchangeRate"
                        />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>

                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-valueInCad'
                        "
                      >
                        <mat-label>Value in CAD</mat-label>
                        <input
                          matInput
                          type="number"
                          formControlName="valueInCad"
                        />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>

                    <!-- Account Information -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-fiuNo'
                        "
                      >
                        <mat-label>FIU Number</mat-label>
                        <input matInput formControlName="fiuNo" />
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-branch'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-account'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>

                    <!-- Account Information -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-4">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-accountType'
                        "
                      >
                        <mat-label>Account Type</mat-label>
                        <mat-select
                          formControlName="accountType"
                          [appControlToggle]="
                            'completingActions.' + caIndex + '.fiuNo'
                          "
                          appControlToggleValue="010"
                          [appControlRequired]="true"
                        >
                          <mat-option
                            *ngFor="let key of accountTypeOptionsKeys"
                            [value]="accountTypeOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>

                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-accountTypeOther'
                        "
                      >
                        <mat-label>Other Account Type</mat-label>
                        <input
                          matInput
                          formControlName="accountTypeOther"
                          [appControlToggle]="
                            'completingActions.' + caIndex + '.accountType'
                          "
                          appControlToggleValue="Other"
                        />
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>

                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-accountCurrency'
                        "
                      >
                        <mat-label>Account Currency</mat-label>
                        <mat-select
                          formControlName="accountCurrency"
                          [appControlToggle]="
                            'completingActions.' + caIndex + '.fiuNo'
                          "
                          appControlToggleValue="010"
                          [appControlRequired]="true"
                        >
                          <mat-option
                            *ngFor="let key of accountCurrencyOptionsKeys"
                            [value]="accountCurrencyOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>

                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-accountStatus'
                        "
                      >
                        <mat-label>Account Status</mat-label>
                        <mat-select
                          formControlName="accountStatus"
                          [appControlToggle]="
                            'completingActions.' + caIndex + '.fiuNo'
                          "
                          appControlToggleValue="010"
                          [appControlRequired]="true"
                        >
                          <mat-option
                            *ngFor="let key of accountStatusOptionsKeys"
                            [value]="accountStatusOptions[key]"
                          >
                            {{ key }}
                          </mat-option>
                        </mat-select>
                        <button
                          [disabled]="!this.isBulkEdit"
                          type="button"
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>

                    <!-- Account Open/Close -->
                    <div class="row row-cols-1 row-cols-md-2 row-cols-xxl-3">
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-accountOpen'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                      <mat-form-field
                        class="col"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-accountClose'
                        "
                      >
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
                          appMarkAsEmpty
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
                        <button
                          [disabled]="this.isBulkEdit"
                          type="button"
                          appClearField
                          mat-icon-button
                          matSuffix
                        >
                          <mat-icon>clear</mat-icon>
                        </button>
                      </mat-form-field>
                    </div>

                    <!-- Account Holders Section -->
                    <h2>Account Holders</h2>
                    <div class="row">
                      <mat-checkbox
                        class="col"
                        formControlName="hasAccountHolders"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-hasAccountHolders'
                        "
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
                      [isBulkEdit]="isBulkEdit"
                      (addControlGroup)="
                        addAccountHolder('completingActions', caIndex)
                      "
                    >
                      <div
                        *ngFor="
                          let holder of caAction.controls.accountHolders
                            .controls;
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
                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-partyKey'
                              "
                            >
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-surname'
                              "
                            >
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-givenName'
                              "
                            >
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-otherOrInitial'
                              "
                            >
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-accountHolders-' +
                                holderIndex +
                                '-nameOfEntity'
                              "
                            >
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>
                          </div>
                        </mat-expansion-panel>
                      </div>

                      <button
                        type="button"
                        mat-raised-button
                        color="primary"
                        (click)="addAccountHolder('completingActions', caIndex)"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-accountHolders-add'
                        "
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
                        [attr.data-testid]="
                          'completingActions-' +
                          caIndex +
                          '-wasAnyOtherSubInvolved'
                        "
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
                      [isBulkEdit]="isBulkEdit"
                      (addControlGroup)="addInvolvedIn(caIndex)"
                    >
                      <div
                        *ngFor="
                          let involved of caAction.controls.involvedIn.controls;
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
                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-involvedIn-' +
                                invIndex +
                                '-partyKey'
                              "
                            >
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-involvedIn-' +
                                invIndex +
                                '-surname'
                              "
                            >
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-involvedIn-' +
                                invIndex +
                                '-givenName'
                              "
                            >
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-involvedIn-' +
                                invIndex +
                                '-otherOrInitial'
                              "
                            >
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-involvedIn-' +
                                invIndex +
                                '-nameOfEntity'
                              "
                            >
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-involvedIn-' +
                                invIndex +
                                '-accountNumber'
                              "
                            >
                              <mat-label>Account Number</mat-label>
                              <input matInput formControlName="accountNumber" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-involvedIn-' +
                                invIndex +
                                '-identifyingNumber'
                              "
                            >
                              <mat-label>Identifying Number</mat-label>
                              <input
                                matInput
                                formControlName="identifyingNumber"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>
                          </div>
                        </mat-expansion-panel>
                      </div>
                      <button
                        type="button"
                        mat-raised-button
                        color="primary"
                        (click)="addInvolvedIn(caIndex)"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-involvedIn-add'
                        "
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
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-wasBenInfoObtained'
                        "
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
                      [isBulkEdit]="isBulkEdit"
                      (addControlGroup)="addBeneficiary(caIndex)"
                    >
                      <div
                        *ngFor="
                          let beneficiary of caAction.controls.beneficiaries
                            .controls;
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
                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-beneficiaries-' +
                                benIndex +
                                '-partyKey'
                              "
                            >
                              <mat-label>Party Key</mat-label>
                              <input matInput formControlName="partyKey" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-beneficiaries-' +
                                benIndex +
                                '-surname'
                              "
                            >
                              <mat-label>Surname</mat-label>
                              <input matInput formControlName="surname" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-beneficiaries-' +
                                benIndex +
                                '-givenName'
                              "
                            >
                              <mat-label>GivenName</mat-label>
                              <input matInput formControlName="givenName" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-beneficiaries-' +
                                benIndex +
                                '-otherOrInitial'
                              "
                            >
                              <mat-label>Other or Initial</mat-label>
                              <input
                                matInput
                                formControlName="otherOrInitial"
                              />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>

                            <mat-form-field
                              class="col"
                              [attr.data-testid]="
                                'completingActions-' +
                                caIndex +
                                '-beneficiaries-' +
                                benIndex +
                                '-nameOfEntity'
                              "
                            >
                              <mat-label>Name of Entity</mat-label>
                              <input matInput formControlName="nameOfEntity" />
                              <button
                                [disabled]="this.isBulkEdit"
                                type="button"
                                appClearField
                                mat-icon-button
                                matSuffix
                              >
                                <mat-icon>clear</mat-icon>
                              </button>
                            </mat-form-field>
                          </div>
                        </mat-expansion-panel>
                      </div>
                      <button
                        type="button"
                        mat-raised-button
                        color="primary"
                        (click)="addBeneficiary(caIndex)"
                        [attr.data-testid]="
                          'completingActions-' + caIndex + '-beneficiaries-add'
                        "
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
Form values: {{ editForm.getRawValue() | json }}</pre
        >
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

  editForm: EditFormType | null = null;

  private editFormValueBefore: EditFormValueType | null = null;

  ngOnInit(): void {
    if (this.editType.type === "SINGLE_EDIT") {
      this.editForm = this.initializeEditForm({
        initValue: this.editType.payload,
      });
    }
    if (this.editType.type === "BULK_EDIT") {
      this.editForm = this.initializeEditForm({
        isBulkEdit: true,
        disabled: true,
      });
      this.editForm.disable();
    }
  }

  private initializeEditForm({
    initValue,
    isBulkEdit = false,
    disabled = false,
  }: {
    initValue?: StrTransactionData;
    isBulkEdit?: boolean;
    disabled?: boolean;
  }) {
    const editForm = this.createEditForm({
      txn: initValue,
      options: { disabled, isBulkEdit },
    });
    this.editFormValueBefore = structuredClone(editForm.getRawValue());
    return editForm;
  }

  editFormHasChanges$ = defer(() => this.editForm!.valueChanges).pipe(
    map(() => {
      const editFormVal = this.editForm?.getRawValue()!;
      return !isEqualWith(
        editFormVal,
        this.editFormValueBefore,
        (val1, val2, indexOrKey) => {
          const isEmpty = (val: unknown) => val == null || val === "";

          if (isEmpty(val1) && isEmpty(val2)) return true;

          if (this.editType.type === "BULK_EDIT" && indexOrKey === "_id")
            return true;

          return undefined;
        },
      );
    }),
  );

  private snackBar = inject(MatSnackBar);

  // ----------------------
  // Form Submission
  // ----------------------
  protected sessionDataService = inject(SessionStateService);
  protected isSaved = false;
  _e = this.sessionDataService.editFormSave$
    .pipe(takeUntilDestroyed())
    .subscribe();

  _u = this.sessionDataService.updateQueue$
    .pipe(
      takeUntilDestroyed(),
      tap(({ editType }) => {
        const messages = {
          SINGLE_EDIT: "Edit saved!",
          BULK_EDIT: "Edits saved!",
          HIGHLIGHT: "Highlights saved!",
        };

        this.snackBar.open(messages[editType], "Dismiss", {
          duration: 5000,
        });
      }),
    )
    .subscribe();

  protected onSave(): void {
    // console.log(
    //   "🚀 ~ EditFormComponent ~ onSubmit ~ this.userForm!.getRawValue():",
    //   this.editForm!.getRawValue(),
    // );

    if (this.isSaved) {
      this.snackBar.open("Edits already saved!", "Dismiss", {
        duration: 5000,
      });
      return;
    }

    this.isSaved = true;

    if (this.editType.type === "SINGLE_EDIT") {
      this.sessionDataService.saveEditForm({
        editType: "SINGLE_EDIT",
        flowOfFundsAmlTransactionId:
          this.editType.payload.flowOfFundsAmlTransactionId,
        editFormValue: this.editForm!.getRawValue(),
        editFormValueBefore: this.editFormValueBefore!,
      });
    }

    if (this.editType.type === "BULK_EDIT") {
      this.sessionDataService.saveEditForm({
        editType: "BULK_EDIT",
        editFormValue: this.editForm!.getRawValue(),
        transactionsBefore: this.editType.payload,
      });
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
  }

  createEditForm({
    txn,
    options,
  }: {
    txn?: WithVersion<StrTransaction> | StrTransaction | null;
    options: { isBulkEdit?: boolean; disabled: boolean };
  }) {
    const { isBulkEdit: createEmptyArrays = false, disabled } = options;

    const editForm = new FormGroup({
      _version: new FormControl<number>({
        value: (txn as { _version: number })?._version || 0,
        disabled,
      }),
      wasTxnAttempted: new FormControl({
        value: ChangeLogService.getInitValForDependentPropToggle(
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
        value: ChangeLogService.getInitValForDependentPropToggle(
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
      _id: new FormControl(action?._id ?? uuidv4()),
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
        value: ChangeLogService.getInitValForDependentPropToggle(
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
        value: ChangeLogService.getInitValForDependentPropToggle(
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
        value: ChangeLogService.getInitValForDependentPropToggle(
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
            ? [
                this.createConductorGroup({
                  options: { createEmptyArrays, disabled },
                }),
              ]
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
      _id: new FormControl(action?._id ?? uuidv4()),
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
        value: ChangeLogService.getInitValForDependentPropToggle(
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
        value: ChangeLogService.getInitValForDependentPropToggle(
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
      _id: new FormControl(holder?._id ?? uuidv4()),
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
      _id: new FormControl(source?._id ?? uuidv4()),
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
    options: { createEmptyArrays?: boolean; disabled: boolean };
  }) {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl(conductor?._id ?? uuidv4()),
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
        value: ChangeLogService.getInitValForDependentPropToggle(
          "wasConductedOnBehalf",
          conductor?.wasConductedOnBehalf,
          this.editType.type === "BULK_EDIT",
          this.editType.type === "AUDIT_REQUEST",
        ),
        disabled,
      }),
      // note do not create empty arrays as this toggle is not tied to a appToggleEditField (bulk edit)
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
      _id: new FormControl(behalf?._id ?? uuidv4()),
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
      _id: new FormControl(involved?._id ?? uuidv4()),
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
      _id: new FormControl(beneficiary?._id ?? uuidv4()),
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
  protected addStartingAction(isBulk: boolean): void {
    const newSaGroup = this.createStartingActionGroup({
      options: { createEmptyArrays: isBulk, disabled: false },
    });
    if (this.editForm!.controls.startingActions.disabled) return;

    this.editForm!.controls.startingActions.push(newSaGroup);
    this.editForm!.controls.startingActions.markAllAsTouched();

    if (isBulk) newSaGroup.disable();
  }

  protected removeStartingAction(index: number): void {
    if (this.editForm!.controls.startingActions.disabled) return;

    this.editForm!.controls.startingActions.removeAt(index);
  }

  // Completing Actions
  protected addCompletingAction(isBulk: boolean): void {
    const newCaGroup = this.createCompletingActionGroup({
      options: { createEmptyArrays: isBulk, disabled: false },
    });
    if (this.editForm!.controls.completingActions.disabled) return;

    this.editForm!.controls.completingActions.push(newCaGroup);
    this.editForm!.controls.completingActions.markAllAsTouched();

    if (isBulk) newCaGroup.disable();
  }

  protected removeCompletingAction(index: number): void {
    if (this.editForm!.controls.completingActions.disabled) return;

    this.editForm!.controls.completingActions.removeAt(index);
  }

  // Account Hodlers SA/CA
  protected addAccountHolder(
    actionControlName: keyof StrTransaction,
    actionIndex: number,
  ): void {
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

  protected removeAccountHolder(
    actionControlName: keyof StrTransaction,
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
  protected addSourceOfFunds(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;
    if (!startingAction.controls.wasSofInfoObtained.value) return;

    startingAction.controls.sourceOfFunds.push(
      this.createSourceOfFundsGroup({ options: { disabled: false } }),
    );
    startingAction.controls.sourceOfFunds.markAllAsTouched();
  }

  protected removeSourceOfFunds(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;

    startingAction.controls.sourceOfFunds.removeAt(index);
  }

  // Conductors
  protected addConductor(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.conductors.disabled) return;
    if (!startingAction.controls.wasCondInfoObtained.value) return;

    startingAction.controls.conductors.push(
      this.createConductorGroup({ options: { disabled: false } }),
    );
    startingAction.controls.conductors.markAllAsTouched();
  }

  protected removeConductor(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);
    if (startingAction.controls.conductors.disabled) return;

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

    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.push(
        this.createOnBehalfOfGroup({ options: { disabled: false } }),
      );
    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.markAllAsTouched();
  }

  protected removeOnBehalfOf(
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
  protected addInvolvedIn(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;
    if (!completingAction.controls.wasAnyOtherSubInvolved.value) return;

    completingAction.controls.involvedIn!.push(
      this.createInvolvedInGroup({ options: { disabled: false } }),
    );
    completingAction.controls.involvedIn!.markAllAsTouched();
  }

  protected removeInvolvedIn(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;

    completingAction.controls.involvedIn!.removeAt(index);
  }

  // Beneficiaries
  protected addBeneficiary(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;
    if (!completingAction.controls.wasBenInfoObtained.value) return;

    completingAction.controls.beneficiaries!.push(
      this.createBeneficiaryGroup({ options: { disabled: false } }),
    );
    completingAction.controls.beneficiaries!.markAllAsTouched();
  }

  protected removeBeneficiary(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;

    completingAction.controls.beneficiaries!.removeAt(index);
  }

  protected get methodOfTxnOptionsKeys() {
    return Object.keys(EditFormComponent.methodOfTxnOptions);
  }
  protected get methodOfTxnOptions() {
    return EditFormComponent.methodOfTxnOptions;
  }
  protected static methodOfTxnOptions: Record<string, string> = {
    ABM: "ABM",
    "In-Person": "In-Person",
    Online: "Online",
    Other: "Other",
  };

  protected get typeofFundsOptionsKeys() {
    return Object.keys(EditFormComponent.typeOfFundsOptions);
  }
  protected get typeofFundsOptions() {
    return EditFormComponent.typeOfFundsOptions;
  }
  protected static typeOfFundsOptions: Record<string, string> = {
    "Funds Withdrawal": "Funds Withdrawal",
    Cash: "Cash",
    Cheque: "Cheque",
    "Domestic Funds Transfer": "Domestic Funds Transfer",
    "Email Monel Transfer": "Email Monel Transfer",
    Other: "Other",
  };

  protected get accountTypeOptionsKeys() {
    return Object.keys(EditFormComponent.accountTypeOptions);
  }
  protected get accountTypeOptions() {
    return EditFormComponent.accountTypeOptions;
  }
  protected static accountTypeOptions: Record<string, string> = {
    Business: "Business",
    Casino: "Casino",
    Personal: "Personal",
    Other: "Other",
  };

  protected get amountCurrencyOptionsKeys() {
    return Object.keys(EditFormComponent.amountCurrencyOptions);
  }
  protected get amountCurrencyOptions() {
    return EditFormComponent.amountCurrencyOptions;
  }
  protected static amountCurrencyOptions: Record<string, string> = {
    CAD: "CAD",
    USD: "USD",
  };

  protected get accountCurrencyOptionsKeys() {
    return Object.keys(EditFormComponent.accountCurrencyOptions);
  }
  protected get accountCurrencyOptions() {
    return EditFormComponent.accountCurrencyOptions;
  }
  protected static accountCurrencyOptions: Record<string, string> = {
    CAD: "CAD",
    USD: "USD",
  };

  protected get accountStatusOptionsKeys() {
    return Object.keys(EditFormComponent.accountStatusOptions);
  }
  protected get accountStatusOptions() {
    return EditFormComponent.accountStatusOptions;
  }
  protected static accountStatusOptions: Record<string, string> = {
    Active: "Active",
    Closed: "Closed",
    Inactive: "Inactive",
    Dorment: "Dorment",
  };

  protected get directionOfSAOptionsKeys() {
    return Object.keys(EditFormComponent.directionOfSAOptions);
  }
  protected get directionOfSAOptions() {
    return EditFormComponent.directionOfSAOptions;
  }
  protected static directionOfSAOptions: Record<string, string> = {
    In: "In",
    Out: "Out",
  };

  protected get detailsOfDispositionOptionsKeys() {
    return Object.keys(EditFormComponent.detailsOfDispositionOptions);
  }
  protected get detailsOfDispositionOptions() {
    return EditFormComponent.detailsOfDispositionOptions;
  }
  protected static detailsOfDispositionOptions: Record<string, string> = {
    "Deposit to account": "Deposit to account",
    "Cash Withdrawal": "Cash Withdrawal",
    "Issued Cheque": "Issued Cheque",
    "Outgoing Email Transfer": "Outgoing Email Transfer",
    Other: "Other",
  };

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  protected navigateBack() {
    this.router.navigate(["../../table"], {
      relativeTo: this.route,
    });
  }

  // template helpers
  protected get isSingleEdit() {
    return this.editType.type === "SINGLE_EDIT";
  }
  protected get isBulkEdit() {
    return this.editType.type === "BULK_EDIT";
  }
  protected get isNotAudit() {
    return this.editType.type !== "AUDIT_REQUEST";
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
    if (this.editType.type !== "BULK_EDIT") {
      return -1;
    }
    return this.editType.payload.length;
  }
  protected get selectedTransactionsForBulkEditDisplayText() {
    return `${this.selectedTransactionsForBulkEditLength} transaction${
      this.selectedTransactionsForBulkEditLength !== 1 ? "s" : ""
    } selected`;
  }
}

export type TypedForm<T> = {
  [K in keyof T]-?: Exclude<T[K], undefined | null> extends Array<infer U>
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
  | "highlightColor"
  | keyof ConductorNpdData
  | "_hiddenFullName"
  | "_hiddenSaAmount"
>;

export type EditFormEditType =
  | {
      type: "SINGLE_EDIT";
      payload: StrTransactionWithChangeLogs;
    }
  | {
      type: "BULK_EDIT";
      payload: StrTransactionWithChangeLogs[];
    }
  | {
      type: "AUDIT_REQUEST";
      payload: StrTransactionWithChangeLogs;
    };

// note does not properly omit keys from union types
type RecursiveOmit<T, K extends PropertyKey> = T extends object
  ? Omit<{ [P in keyof T]: RecursiveOmit<T[P], K> }, K>
  : T;

export type EditFormValueType = ReturnType<
  typeof EditFormComponent.prototype.createEditForm
>["value"];

export type EditFormType = ReturnType<
  typeof EditFormComponent.prototype.createEditForm
>;

export const editTypeResolver: ResolveFn<EditFormEditType> = (
  route: ActivatedRouteSnapshot,
  _: RouterStateSnapshot,
) => {
  const selectedTransactionsForBulkEdit = inject(Router).getCurrentNavigation()
    ?.extras.state?.["selectedTransactionsForBulkEdit"] as string[] | undefined;

  return inject(SessionStateService).strTransactionData$.pipe(
    map((strTransactionData) => {
      const isSingleEdit = !!route.params["transactionId"];
      const isBulkEdit = !!selectedTransactionsForBulkEdit;

      if (isSingleEdit) {
        const strTransaction = strTransactionData.find(
          (txn) =>
            route.params["transactionId"] === txn.flowOfFundsAmlTransactionId,
        );
        if (!strTransaction) throw new Error("Transaction not found");
        return {
          type: "SINGLE_EDIT",
          payload: strTransaction as StrTransactionWithChangeLogs,
        };
      }
      if (isBulkEdit) {
        const strTransactions = strTransactionData.filter((txn) =>
          selectedTransactionsForBulkEdit.includes(
            txn.flowOfFundsAmlTransactionId,
          ),
        );
        console.assert(
          strTransactions.length === selectedTransactionsForBulkEdit.length,
        );
        return {
          type: "BULK_EDIT",
          payload: strTransactions as StrTransactionWithChangeLogs[],
        };
      }
      throw new Error("Unknown edit type");
    }),
  );
};
