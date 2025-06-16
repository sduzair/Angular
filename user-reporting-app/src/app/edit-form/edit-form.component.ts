import { CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { map, Subject, switchMap, takeUntil, tap } from "rxjs";
import {
  Address,
  Bank,
  Company,
  Coordinates,
  Project,
  TeamMember,
  Technology,
  WorkExperience,
  Crypto as ICrypto,
} from "../table/table.component";
import { v4 as uuidv4 } from "uuid";
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormField,
  MatFormFieldDefaultOptions,
} from "@angular/material/form-field";
import { MatTabsModule } from "@angular/material/tabs";
import { MAT_CARD_CONFIG, MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from "@angular/material/datepicker";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatDividerModule } from "@angular/material/divider";
import { MatIcon } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatButtonModule } from "@angular/material/button";
import { CrossTabEditService } from "../cross-tab-edit.service";
import {
  ChangeLog,
  ChangeLogService,
  UserWithVersion,
} from "../change-log.service";
import {
  DateFnsAdapter,
  MAT_DATE_FNS_FORMATS,
} from "@angular/material-date-fns-adapter";
import {
  MAT_DATE_LOCALE,
  DateAdapter,
  MAT_DATE_FORMATS,
} from "@angular/material/core";
import { enCA } from "date-fns/locale";
import { BirthDateDirective } from "../table/birth-date.directive";
import { ActivatedRoute } from "@angular/router";
import { removePageFromOpenTabs } from "../single-tab.guard";

@Component({
  selector: "app-edit-form",
  imports: [
    CommonModule,
    MatFormField,
    MatTabsModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatExpansionModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatIcon,
    MatChipsModule,
    MatButtonModule,
    BirthDateDirective,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: enCA },
    { provide: DateAdapter, useClass: DateFnsAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MAT_DATE_FNS_FORMATS },
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
    <div class="user-form-container">
      <form *ngIf="userForm" [formGroup]="userForm" (ngSubmit)="onSubmit()">
        <div class="sub-group-header">
          <h2>
            User Information Form -
            {{
              this.userBeforeEdit
                ? "Single Edit"
                : this.usersBeforeBulkEdit
                ? "Bulk Edit"
                : ""
            }}
          </h2>
          <button mat-raised-button color="primary" type="submit">
            Submit
          </button>
        </div>
        <mat-tab-group>
          <!-- Basic Information Tab -->
          <mat-tab label="Basic Information">
            <div class="tab-content">
              <mat-card>
                <mat-card-content>
                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>First Name</mat-label>
                      <input
                        matInput
                        formControlName="firstName"
                        autocomplete="given-name"
                      />
                      <mat-icon matPrefix>person</mat-icon>
                      <mat-error
                        *ngIf="userForm.get('firstName')?.hasError('required')"
                      >
                        First name is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Last Name</mat-label>
                      <input
                        matInput
                        formControlName="lastName"
                        autocomplete="family-name"
                      />
                      <mat-icon matPrefix>person</mat-icon>
                      <mat-error
                        *ngIf="userForm.get('lastName')?.hasError('required')"
                      >
                        Last name is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Maiden Name</mat-label>
                      <mat-icon matPrefix>person</mat-icon>
                      <input
                        matInput
                        formControlName="maidenName"
                        autocomplete="additional-name"
                      />
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>Age</mat-label>
                      <input matInput type="number" formControlName="age" />
                      <mat-error
                        *ngIf="userForm.get('age')?.hasError('required')"
                      >
                        Age is required
                      </mat-error>
                      <mat-error *ngIf="userForm.get('age')?.hasError('min')">
                        Age must be positive
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Gender</mat-label>
                      <mat-select formControlName="gender">
                        <mat-option value="male">Male</mat-option>
                        <mat-option value="female">Female</mat-option>
                        <mat-option value="other">Other</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Birth Date</mat-label>
                      <input
                        matInput
                        appBirthDate
                        [matDatepicker]="picker"
                        formControlName="birthDate"
                        [max]="validatorParams.maxBirthDate"
                      />
                      <mat-datepicker-toggle
                        matSuffix
                        [for]="picker"
                      ></mat-datepicker-toggle>
                      <mat-datepicker
                        #picker
                        startView="multi-year"
                      ></mat-datepicker>
                      <mat-error
                        *ngIf="
                          userForm
                            .get('birthDate')
                            ?.hasError('matDatepickerMax')
                        "
                      >
                        Invalid birth date
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <h3>Contact Info</h3>
                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>Email</mat-label>
                      <input
                        matInput
                        type="email"
                        formControlName="email"
                        autocomplete="email"
                      />
                      <mat-icon matPrefix>email</mat-icon>
                      <mat-error
                        *ngIf="userForm.get('email')?.hasError('required')"
                      >
                        Email is required
                      </mat-error>
                      <mat-error
                        *ngIf="userForm.get('email')?.hasError('email')"
                      >
                        Enter a valid email
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Phone</mat-label>
                      <input
                        matInput
                        formControlName="phone"
                        autocomplete="tel"
                        (blur)="formatPhoneNumber()"
                      />
                      <mat-icon matPrefix>phone</mat-icon>
                      <mat-error
                        *ngIf="userForm.get('phone')?.hasError('required')"
                      >
                        Phone is required
                      </mat-error>

                      <mat-error
                        *ngIf="userForm.get('phone')?.hasError('pattern')"
                      >
                        Invalid phone number format
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>Username</mat-label>
                      <input
                        matInput
                        formControlName="username"
                        autocomplete="username"
                      />
                      <mat-icon matPrefix>alternate_email</mat-icon>
                      <mat-error
                        *ngIf="userForm.get('username')?.hasError('required')"
                      >
                        Username is required
                      </mat-error>
                      <mat-error
                        *ngIf="userForm.get('username')?.hasError('minlength')"
                      >
                        Username must be atleast
                        {{ this.validatorParams.usernameLenMin }} characters
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Password</mat-label>
                      <input
                        matInput
                        type="password"
                        formControlName="password"
                        autocomplete="new-password"
                      />
                      <mat-error
                        *ngIf="userForm.get('password')?.hasError('required')"
                      >
                        Password is required
                      </mat-error>
                      <mat-error
                        *ngIf="userForm.get('password')?.hasError('minlength')"
                      >
                        Password must be at least
                        {{ this.validatorParams.passwordLenMin }} characters
                      </mat-error>
                    </mat-form-field>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Physical Characteristics Tab -->
          <mat-tab label="Physical Characteristics">
            <div class="tab-content">
              <mat-card>
                <mat-card-content>
                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>Blood Group</mat-label>
                      <mat-select formControlName="bloodGroup">
                        <mat-option value="A+">A+</mat-option>
                        <mat-option value="A-">A-</mat-option>
                        <mat-option value="B+">B+</mat-option>
                        <mat-option value="B-">B-</mat-option>
                        <mat-option value="AB+">AB+</mat-option>
                        <mat-option value="AB-">AB-</mat-option>
                        <mat-option value="O+">O+</mat-option>
                        <mat-option value="O-">O-</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Height (cm)</mat-label>
                      <input matInput type="number" formControlName="height" />
                    </mat-form-field>

                    <mat-form-field>
                      <mat-label>Weight (kg)</mat-label>
                      <input matInput type="number" formControlName="weight" />
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>Eye Color</mat-label>
                      <input matInput formControlName="eyeColor" />
                    </mat-form-field>
                  </div>

                  <!-- Hair Section -->
                  <div formGroupName="hair">
                    <h3>Hair Details</h3>
                    <div class="form-row">
                      <mat-form-field>
                        <mat-label>Hair Color</mat-label>
                        <input matInput formControlName="color" />
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>Hair Type</mat-label>
                        <input matInput formControlName="type" />
                      </mat-form-field>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Addresses Tab with FormArray -->
          <mat-tab label="Addresses" formArrayName="address">
            <div class="tab-content">
              <div class="add-button-container top">
                <button
                  mat-raised-button
                  color="primary"
                  type="button"
                  (click)="addAddress()"
                >
                  Add Address
                </button>
              </div>
              <div
                *ngFor="
                  let addressGroup of this.userForm.controls.address.controls;
                  let i = index
                "
                [formGroupName]="i"
              >
                <mat-expansion-panel [expanded]="true">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <h3>Address #{{ i + 1 }}</h3>
                      <button
                        mat-mini-fab
                        type="button"
                        (click)="removeAddress(i)"
                        aria-label="Remove Address"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  <div>
                    <div class="form-row">
                      <mat-form-field>
                        <mat-label>Address</mat-label>
                        <input matInput formControlName="address" />
                        <mat-error
                          *ngIf="
                            addressGroup.get('address')?.hasError('required')
                          "
                        >
                          Address is required
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field>
                        <mat-label>City</mat-label>
                        <input matInput formControlName="city" />
                        <mat-error
                          *ngIf="addressGroup.get('city')?.hasError('required')"
                        >
                          City is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>State</mat-label>
                        <input matInput formControlName="state" />
                        <mat-error
                          *ngIf="
                            addressGroup.get('state')?.hasError('required')
                          "
                        >
                          State is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>State Code</mat-label>
                        <input matInput formControlName="stateCode" />
                        <mat-hint align="end"
                          >{{
                            addressGroup.get("stateCode")?.value?.length || 0
                          }}/3</mat-hint
                        >
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <mat-form-field>
                        <mat-label>Postal Code</mat-label>
                        <input matInput formControlName="postalCode" />
                        <mat-error
                          *ngIf="
                            addressGroup.get('postalCode')?.hasError('required')
                          "
                        >
                          Postal code is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>Country</mat-label>
                        <input matInput formControlName="country" />
                        <mat-error
                          *ngIf="
                            addressGroup.get('country')?.hasError('required')
                          "
                        >
                          Country is required
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <!-- Nested Coordinates FormGroup -->
                    <div formGroupName="coordinates">
                      <h4>Coordinates</h4>
                      <div class="form-row">
                        <mat-form-field>
                          <mat-label>Latitude</mat-label>
                          <input matInput type="number" formControlName="lat" />
                        </mat-form-field>

                        <mat-form-field>
                          <mat-label>Longitude</mat-label>
                          <input matInput type="number" formControlName="lng" />
                        </mat-form-field>
                      </div>
                    </div>
                  </div>
                </mat-expansion-panel>
                <mat-divider
                  *ngIf="i < this.userForm.controls.address.controls.length - 1"
                ></mat-divider>
              </div>
            </div>
          </mat-tab>

          <!-- Bank Tab with FormArray -->
          <mat-tab label="Bank Info" formArrayName="bank">
            <div class="tab-content">
              <div class="add-button-container top">
                <button
                  mat-raised-button
                  color="primary"
                  type="button"
                  (click)="addBank()"
                >
                  Add Bank
                </button>
              </div>
              <div
                *ngFor="
                  let bankGroup of userForm.controls.bank.controls;
                  let i = index
                "
                [formGroupName]="i"
              >
                <mat-expansion-panel [expanded]="true">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <h3>Bank #{{ i + 1 }}</h3>
                      <button
                        mat-mini-fab
                        type="button"
                        (click)="removeBank(i)"
                        aria-label="remove bank"
                      >
                        <mat-icon>delete</mat-icon>
                      </button></mat-panel-title
                    >
                  </mat-expansion-panel-header>

                  <div>
                    <div class="form-row">
                      <!-- Card Number: Numeric -->
                      <mat-form-field>
                        <mat-label>Card Number</mat-label>
                        <input
                          matInput
                          formControlName="cardNumber"
                          maxlength="19"
                          autocomplete="cc-number"
                          inputmode="numeric"
                          pattern="[0-9 ]*"
                        />
                        <mat-icon matSuffix>credit_card</mat-icon>
                        <mat-error
                          *ngIf="
                            bankGroup.get('cardNumber')?.hasError('required')
                          "
                        >
                          Card number is required
                        </mat-error>
                        <mat-hint align="start"
                          >Example: 1234 5678 9012 3456</mat-hint
                        >
                        <mat-hint align="end"
                          >{{
                            bankGroup.get("cardNumber")?.value?.length || 0
                          }}/19</mat-hint
                        >
                      </mat-form-field>

                      <!-- Card Type: Select -->
                      <mat-form-field>
                        <mat-label>Card Type</mat-label>
                        <mat-select formControlName="cardType">
                          <mat-option value="Visa">Visa</mat-option>
                          <mat-option value="MasterCard">MasterCard</mat-option>
                          <mat-option value="American Express"
                            >American Express</mat-option
                          >
                          <mat-option value="Discover">Discover</mat-option>
                          <mat-option value="Other">Other</mat-option>
                        </mat-select>
                        <mat-error
                          *ngIf="
                            bankGroup.get('cardType')?.hasError('required')
                          "
                        >
                          Card type is required
                        </mat-error>
                      </mat-form-field>

                      <!-- Card Expiry: Month/Year Picker -->
                      <mat-form-field>
                        <mat-label>Card Expiry</mat-label>
                        <input
                          matInput
                          formControlName="cardExpire"
                          maxlength="5"
                          autocomplete="cc-exp"
                          inputmode="text"
                          pattern="(0[1-9]|1[0-2])/?([0-9]{2})"
                        />
                        <mat-icon matSuffix>event</mat-icon>
                        <mat-hint>Format: MM/YY</mat-hint>
                      </mat-form-field>
                    </div>

                    <div class="form-row">
                      <!-- Currency: Select -->
                      <mat-form-field>
                        <mat-label>Currency</mat-label>
                        <mat-select formControlName="currency">
                          <mat-option value="USD">USD - US Dollar</mat-option>
                          <mat-option value="EUR">EUR - Euro</mat-option>
                          <mat-option value="GBP"
                            >GBP - British Pound</mat-option
                          >
                          <mat-option value="JPY"
                            >JPY - Japanese Yen</mat-option
                          >
                          <mat-option value="INR"
                            >INR - Indian Rupee</mat-option
                          >
                          <mat-option value="Other">Other</mat-option>
                        </mat-select>
                        <mat-error
                          *ngIf="
                            bankGroup.get('currency')?.hasError('required')
                          "
                        >
                          Currency is required
                        </mat-error>
                      </mat-form-field>

                      <!-- IBAN: Text, Uppercase -->
                      <mat-form-field>
                        <mat-label>IBAN</mat-label>
                        <input
                          matInput
                          formControlName="iban"
                          maxlength="34"
                          style="text-transform: uppercase"
                          autocomplete="off"
                        />
                        <mat-error
                          *ngIf="bankGroup.get('iban')?.hasError('required')"
                        >
                          IBAN is required
                        </mat-error>
                        <mat-hint align="start"
                          >Example: DE89 3704 0044 0532 0130 00</mat-hint
                        >
                        <mat-hint align="end"
                          >{{
                            bankGroup.get("iban")?.value?.length || 0
                          }}/34</mat-hint
                        >
                      </mat-form-field>
                    </div>
                  </div>
                </mat-expansion-panel>
                <mat-divider
                  *ngIf="i < userForm.controls.bank.controls.length - 1"
                ></mat-divider>
              </div>
            </div>
          </mat-tab>

          <!-- Work Place Tab with FormArray -->
          <mat-tab label="Work Place" formArrayName="company">
            <div class="tab-content">
              <div class="add-button-container top">
                <button
                  mat-raised-button
                  color="primary"
                  type="button"
                  (click)="addCompany()"
                >
                  Add Company
                </button>
              </div>
              <div
                *ngFor="
                  let companyGroup of userForm.controls.company.controls;
                  let i = index
                "
                [formGroupName]="i"
              >
                <mat-expansion-panel [expanded]="true">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <h3>Company #{{ i + 1 }}</h3>
                      <button
                        mat-mini-fab
                        type="button"
                        (click)="removeCompany(i)"
                        aria-label="Remove company"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="form-row">
                    <!-- Company Name -->
                    <mat-form-field>
                      <mat-label>Company Name</mat-label>
                      <input matInput formControlName="name" required />
                      <mat-error
                        *ngIf="companyGroup.get('name')?.hasError('required')"
                      >
                        Company name is required
                      </mat-error>
                    </mat-form-field>

                    <!-- Department -->
                    <mat-form-field>
                      <mat-label>Department</mat-label>
                      <input matInput formControlName="department" />
                    </mat-form-field>

                    <!-- Title/Position -->
                    <mat-form-field>
                      <mat-label>Title/Position</mat-label>
                      <input matInput formControlName="title" />
                    </mat-form-field>
                  </div>

                  <!-- Address Group -->
                  <div formGroupName="address">
                    <h4>Address</h4>
                    <div class="form-row">
                      <mat-form-field>
                        <mat-label>Street Address</mat-label>
                        <input matInput formControlName="address" required />
                        <mat-error
                          *ngIf="
                            companyGroup
                              .get('address.address')
                              ?.hasError('required')
                          "
                        >
                          Address is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>City</mat-label>
                        <input matInput formControlName="city" required />
                        <mat-error
                          *ngIf="
                            companyGroup
                              .get('address.city')
                              ?.hasError('required')
                          "
                        >
                          City is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>State</mat-label>
                        <input matInput formControlName="state" />
                        <mat-error
                          *ngIf="
                            companyGroup
                              .get('address.state')
                              ?.hasError('required')
                          "
                        >
                          State is required
                        </mat-error>
                      </mat-form-field>
                    </div>
                    <div class="form-row">
                      <mat-form-field>
                        <mat-label>State Code</mat-label>
                        <input matInput formControlName="stateCode" />
                        <mat-hint align="end"
                          >{{
                            companyGroup.get("address.stateCode")?.value
                              ?.length || 0
                          }}/3</mat-hint
                        >
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>Postal Code</mat-label>
                        <input matInput formControlName="postalCode" />
                        <mat-error
                          *ngIf="
                            companyGroup
                              .get('address.postalCode')
                              ?.hasError('required')
                          "
                        >
                          Postal code is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field>
                        <mat-label>Country</mat-label>
                        <input matInput formControlName="country" required />
                        <mat-error
                          *ngIf="
                            companyGroup
                              .get('address.country')
                              ?.hasError('required')
                          "
                        >
                          Country is required
                        </mat-error>
                      </mat-form-field>
                    </div>
                    <!-- Coordinates Group -->
                    <div formGroupName="coordinates">
                      <div class="form-row">
                        <mat-form-field>
                          <mat-label>Latitude</mat-label>
                          <input matInput type="number" formControlName="lat" />
                        </mat-form-field>
                        <mat-form-field>
                          <mat-label>Longitude</mat-label>
                          <input matInput type="number" formControlName="lng" />
                        </mat-form-field>
                      </div>
                    </div>
                  </div>
                </mat-expansion-panel>
                <mat-divider
                  *ngIf="i < userForm.controls.company.controls.length - 1"
                ></mat-divider>
              </div>
            </div>
          </mat-tab>

          <!-- Crypto Tab with FormArray -->
          <mat-tab label="Cryptocurrency" formArrayName="crypto">
            <div class="tab-content">
              <div class="add-button-container top">
                <button
                  mat-raised-button
                  color="primary"
                  type="button"
                  (click)="addCrypto()"
                >
                  Add Crypto
                </button>
              </div>

              <div
                *ngFor="
                  let cryptoGroup of userForm.controls.crypto.controls;
                  let i = index
                "
                [formGroupName]="i"
              >
                <mat-expansion-panel [expanded]="true">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <h3>Crypto #{{ i + 1 }}</h3>
                      <button
                        mat-mini-fab
                        type="button"
                        (click)="removeCrypto(i)"
                        aria-label="Remove crypto"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>Coin</mat-label>
                      <input matInput formControlName="coin" />
                      <mat-hint>E.g., Bitcoin, Ethereum</mat-hint>
                      <mat-error
                        *ngIf="cryptoGroup.get('coin')?.hasError('required')"
                      >
                        Coin is required
                      </mat-error>
                    </mat-form-field>
                    <mat-form-field>
                      <mat-label>Network</mat-label>
                      <input matInput formControlName="network" />
                      <mat-hint>E.g., ERC-20, BEP-20</mat-hint>
                      <mat-error
                        *ngIf="cryptoGroup.get('network')?.hasError('required')"
                      >
                        Network is required
                      </mat-error>
                    </mat-form-field>
                  </div>
                  <div class="form-row">
                    <mat-form-field>
                      <mat-label>Wallet Address</mat-label>
                      <textarea
                        matInput
                        formControlName="wallet"
                        rows="3"
                      ></textarea>
                    </mat-form-field>
                  </div>
                </mat-expansion-panel>
                <mat-divider
                  *ngIf="i < userForm.controls.crypto.controls.length - 1"
                ></mat-divider>
              </div>
            </div>
          </mat-tab>

          <!-- Work Exp. Tab with FormArray -->
          <mat-tab label="Work Experience" formArrayName="workExperience">
            <div class="tab-content">
              <div class="add-button-container top">
                <button
                  mat-raised-button
                  color="primary"
                  type="button"
                  (click)="addWorkExperience()"
                >
                  Add Work Experience
                </button>
              </div>
              <div
                *ngFor="
                  let workExpGroup of userForm.controls.workExperience.controls;
                  let workIndex = index
                "
                [formGroupName]="workIndex"
              >
                <mat-expansion-panel [expanded]="true">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <h3>Work Experience #{{ workIndex + 1 }}</h3>
                      <button
                        mat-mini-fab
                        type="button"
                        (click)="removeWorkExperience(workIndex)"
                        aria-label="Remove work experience"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </mat-panel-title>
                  </mat-expansion-panel-header>

                  <div class="form-row">
                    <!-- Job Title -->
                    <mat-form-field>
                      <mat-label>Job Title</mat-label>
                      <input matInput formControlName="jobTitle" />
                      <mat-error
                        *ngIf="
                          workExpGroup.get('jobTitle')?.hasError('required')
                        "
                      >
                        Job title is required
                      </mat-error>
                    </mat-form-field>

                    <!-- Employer -->
                    <mat-form-field>
                      <mat-label>Employer</mat-label>
                      <input matInput formControlName="employer" />
                      <mat-error
                        *ngIf="
                          workExpGroup.get('employer')?.hasError('required')
                        "
                      >
                        Employer name is required
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div formArrayName="projects">
                    <div class="sub-group-header">
                      <h3>Projects</h3>
                      <button
                        mat-stroked-button
                        type="button"
                        (click)="addProject(workIndex)"
                      >
                        <mat-icon>add</mat-icon>
                        Add Project
                      </button>
                    </div>
                    <div
                      *ngFor="
                        let projectGroup of userForm.controls.workExperience.at(
                          workIndex
                        ).controls.projects.controls;
                        let projIndex = index
                      "
                      [formGroupName]="projIndex"
                      class="nested-array"
                    >
                      <mat-expansion-panel [expanded]="true">
                        <mat-expansion-panel-header>
                          <mat-panel-title
                            ><h3>Project #{{ projIndex + 1 }}</h3>
                            <button
                              mat-mini-fab
                              type="button"
                              (click)="removeProject(workIndex, projIndex)"
                              aria-label="Remove project"
                            >
                              <mat-icon>delete</mat-icon>
                            </button>
                          </mat-panel-title>
                        </mat-expansion-panel-header>

                        <div class="form-row">
                          <!-- Project Name -->
                          <mat-form-field>
                            <mat-label>Project Name</mat-label>
                            <input matInput formControlName="name" />
                            <mat-error
                              *ngIf="
                                projectGroup.get('name')?.hasError('required')
                              "
                            >
                              Project name is required
                            </mat-error>
                          </mat-form-field>

                          <!-- Project Description -->
                          <mat-form-field>
                            <mat-label>Description</mat-label>
                            <textarea
                              matInput
                              formControlName="description"
                              rows="1"
                            ></textarea>
                          </mat-form-field>
                        </div>

                        <!-- Technologies -->
                        <div formArrayName="technologies">
                          <div class="sub-group-header">
                            <h4>Technologies Used</h4>
                            <div [formGroup]="newTechControl">
                              <mat-form-field class="sub-absolute">
                                <input
                                  matInput
                                  placeholder="Add technology..."
                                  formControlName="technology"
                                  (keydown.enter)="
                                    addTechnology(workIndex, projIndex);
                                    $event.preventDefault()
                                  "
                                />
                                <button
                                  mat-icon-button
                                  matSuffix
                                  (click)="addTechnology(workIndex, projIndex)"
                                  [disabled]="newTechControl.invalid"
                                >
                                  <mat-icon>add</mat-icon>
                                </button>
                              </mat-form-field>
                            </div>
                          </div>

                          <mat-chip-set #techList>
                            <mat-chip
                              *ngFor="
                                let techGroup of userForm.controls.workExperience
                                  .at(workIndex)
                                  .controls.projects.at(projIndex).controls
                                  .technologies.controls;
                                let techIndex = index
                              "
                              [formGroupName]="techIndex"
                              (removed)="
                                removeTechnology(
                                  workIndex,
                                  projIndex,
                                  techIndex
                                )
                              "
                            >
                              {{ techGroup.value.technology }}
                              <button matChipRemove>
                                <mat-icon>cancel</mat-icon>
                              </button>
                            </mat-chip>
                          </mat-chip-set>
                        </div>

                        <!-- Team Members -->
                        <div formArrayName="teamMembers">
                          <div class="sub-group-header">
                            <h4>Team Members</h4>
                            <button
                              mat-stroked-button
                              type="button"
                              (click)="addTeamMember(workIndex, projIndex)"
                            >
                              <mat-icon>person_add</mat-icon>
                              Add Team Member
                            </button>
                          </div>
                          <div
                            *ngFor="
                              let memberGroup of userForm.controls.workExperience
                                .at(workIndex)
                                .controls.projects.at(projIndex).controls
                                .teamMembers.controls;
                              let teamMemberIndex = index
                            "
                            [formGroupName]="teamMemberIndex"
                            class="nested-array"
                          >
                            <div class="form-row">
                              <mat-form-field>
                                <mat-label>Name</mat-label>
                                <input matInput formControlName="name" />
                                <mat-error
                                  *ngIf="
                                    memberGroup
                                      .get('name')
                                      ?.hasError('required')
                                  "
                                  >Name is required</mat-error
                                >
                              </mat-form-field>

                              <mat-form-field>
                                <mat-label>Role</mat-label>
                                <input matInput formControlName="role" />
                                <mat-error
                                  *ngIf="
                                    memberGroup
                                      .get('role')
                                      ?.hasError('required')
                                  "
                                  >Role is required</mat-error
                                >
                              </mat-form-field>

                              <button
                                mat-icon-button
                                color="warn"
                                (click)="
                                  removeTeamMember(
                                    workIndex,
                                    projIndex,
                                    teamMemberIndex
                                  )
                                "
                              >
                                <mat-icon>delete</mat-icon>
                              </button>
                            </div>
                          </div>
                        </div>
                      </mat-expansion-panel>
                    </div>
                  </div>
                </mat-expansion-panel>
                <mat-divider
                  *ngIf="
                    workIndex <
                    userForm.controls.workExperience.controls.length - 1
                  "
                ></mat-divider>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </form>
      <!-- <pre class="overlay-pre">Form values: {{ userForm.value | json }}</pre> -->
    </div>
  `,
  styleUrls: ["./edit-form.component.scss"],
})
export class EditFormComponent implements OnInit, OnDestroy {
  userBeforeEdit: UserWithVersion | null = null;
  usersBeforeBulkEdit: UserWithVersion[] | null = null;
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

  userForm: UserFormType = null!;
  private sessionId: string = null!;
  constructor(
    private crossTabEditService: CrossTabEditService,
    private changeLogService: ChangeLogService,
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
          this.userBeforeEdit = payload;
          this.createUserForm(payload);
        }
        if (type === "BULK_EDIT_REQUEST") {
          this.usersBeforeBulkEdit = payload;
          this.createUserForm();
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

  private createUserForm(user?: UserWithVersion | null) {
    this.userForm = new FormGroup({
      _version: new FormControl<number>(user?._version || 0),
      _id: new FormControl(user?._id || uuidv4()),
      id: new FormControl<number>(user?.id || null!),
      firstName: new FormControl(user?.firstName || "", Validators.required),
      lastName: new FormControl(user?.lastName || "", Validators.required),
      maidenName: new FormControl(user?.maidenName || ""),
      age: new FormControl<number>(user?.age || null!, [Validators.min(0)]),
      gender: new FormControl(user?.gender || ""),
      email: new FormControl(user?.email || "", [Validators.email]),
      phone: new FormControl(user?.phone || "", [
        Validators.pattern(this.validatorParams.phonePatterns.us),
      ]),
      username: new FormControl(user?.username || "", [
        Validators.minLength(this.validatorParams.usernameLenMin),
      ]),
      password: new FormControl(user?.password || "", [
        Validators.minLength(this.validatorParams.passwordLenMin),
      ]),
      birthDate: new FormControl(user?.birthDate || ""),
      image: new FormControl(user?.image || ""),
      bloodGroup: new FormControl(user?.bloodGroup || ""),
      height: new FormControl<number>(user?.height || null!),
      weight: new FormControl<number>(user?.weight || null!),
      eyeColor: new FormControl(user?.eyeColor || ""),
      hair: new FormGroup({
        color: new FormControl(user?.hair.color || ""),
        type: new FormControl(user?.hair.type || ""),
      }),
      ip: new FormControl(user?.ip || ""),
      address: new FormArray(
        user?.address.map((item) => this.createAddressGroup(item)) || [
          this.createAddressGroup(),
        ],
      ),
      macAddress: new FormControl(user?.macAddress || ""),
      university: new FormControl(user?.university || ""),
      bank: new FormArray(
        user?.bank.map((item) => this.createBankGroup(item)) || [
          this.createBankGroup(),
        ],
      ),
      company: new FormArray(
        user?.company.map((item) => this.createCompanyGroup(item)) || [
          this.createCompanyGroup(),
        ],
      ),
      ein: new FormControl(user?.ein || ""),
      ssn: new FormControl(user?.ssn || ""),
      userAgent: new FormControl(user?.userAgent || ""),
      crypto: new FormArray(
        user?.crypto.map((item) => this.createCryptoGroup(item)) || [
          this.createCryptoGroup(),
        ],
      ),
      role: new FormControl(user?.role || ""),
      workExperience: new FormArray(
        user?.workExperience.map((exp) =>
          this.createWorkExperienceGroup(exp),
        ) || [this.createWorkExperienceGroup()],
      ),
    });
  }

  // --------------------------
  // Form Group Creation Methods
  // --------------------------
  private createAddressGroup(address?: Address): FormGroup {
    return new FormGroup({
      _id: new FormControl(address?._id || uuidv4()),
      address: new FormControl(address?.address || "", Validators.required),
      city: new FormControl(address?.city || "", Validators.required),
      state: new FormControl(address?.state || "", Validators.required),
      stateCode: new FormControl(address?.stateCode || "", [
        Validators.required,
        Validators.maxLength(this.validatorParams.stateCodeLenMax),
      ]),
      postalCode: new FormControl(address?.postalCode || "", [
        Validators.required,
        Validators.maxLength(this.validatorParams.postalCodeLenMax),
      ]),
      coordinates: this.createCoordinatesGroup(address?.coordinates),
      country: new FormControl(address?.country || "", Validators.required),
    });
  }

  private createCoordinatesGroup(coords?: Coordinates): FormGroup {
    return new FormGroup({
      lat: new FormControl(coords?.lat || null),
      lng: new FormControl(coords?.lng || null),
    });
  }

  private createBankGroup(bank?: Bank): FormGroup {
    return new FormGroup({
      _id: new FormControl(bank?._id || uuidv4()),
      cardNumber: new FormControl(bank?.cardNumber || "", Validators.required),
      cardExpire: new FormControl(bank?.cardExpire || "", Validators.required),
      cardType: new FormControl(bank?.cardType || "", Validators.required),
      currency: new FormControl(bank?.currency || ""),
      iban: new FormControl(bank?.iban || ""),
    });
  }

  private createCompanyGroup(company?: Company): FormGroup {
    return new FormGroup({
      _id: new FormControl(company?._id || uuidv4()),
      department: new FormControl(company?.department || ""),
      name: new FormControl(company?.name || "", Validators.required),
      title: new FormControl(company?.title || ""),
      address: new FormGroup({
        address: new FormControl(
          company?.address?.address || "",
          Validators.required,
        ),
        city: new FormControl(
          company?.address?.city || "",
          Validators.required,
        ),
        state: new FormControl(
          company?.address?.state || "",
          Validators.required,
        ),
        stateCode: new FormControl(company?.address?.stateCode || "", [
          Validators.required,
          Validators.maxLength(this.validatorParams.stateCodeLenMax),
        ]),
        postalCode: new FormControl(company?.address?.postalCode || "", [
          Validators.required,
          Validators.maxLength(this.validatorParams.postalCodeLenMax),
        ]),
        coordinates: this.createCoordinatesGroup(company?.address?.coordinates),
        country: new FormControl(
          company?.address?.country || "",
          Validators.required,
        ),
      }),
    });
  }

  private createCryptoGroup(crypto?: ICrypto): FormGroup {
    return new FormGroup({
      _id: new FormControl(crypto?._id || uuidv4()),
      coin: new FormControl(crypto?.coin || "", Validators.required),
      network: new FormControl(crypto?.network || "", Validators.required),
      wallet: new FormControl(crypto?.wallet || ""),
    });
  }

  private createWorkExperienceGroup(work?: WorkExperience): FormGroup {
    return new FormGroup({
      _id: new FormControl(work?._id || uuidv4()),
      jobTitle: new FormControl(work?.jobTitle || "", Validators.required),
      employer: new FormControl(work?.employer || "", Validators.required),
      projects: new FormArray(
        work?.projects?.map((p) => this.createProjectGroup(p)) || [
          this.createProjectGroup(),
        ],
      ),
    });
  }

  private createProjectGroup(project?: Project): FormGroup {
    return new FormGroup({
      _id: new FormControl(project?._id || uuidv4()),
      name: new FormControl(project?.name || "", Validators.required),
      description: new FormControl(project?.description || ""),
      technologies: new FormArray(
        project?.technologies?.map((t) => this.createTechnologyGroup(t)) || [
          this.createTechnologyGroup(),
        ],
      ),
      teamMembers: new FormArray(
        project?.teamMembers?.map((tm) => this.createTeamMemberGroup(tm)) || [
          this.createTeamMemberGroup(),
        ],
      ),
    });
  }

  newTechControl = this.createTechnologyGroup();

  private createTechnologyGroup(tech?: Technology): FormGroup {
    return new FormGroup({
      _id: new FormControl(tech?._id || uuidv4()),
      technology: new FormControl(tech?.technology || "", [
        Validators.required,
      ]),
    });
  }

  private createTeamMemberGroup(member?: TeamMember): FormGroup {
    return new FormGroup({
      _id: new FormControl(member?._id || uuidv4()),
      name: new FormControl(member?.name || "", Validators.required),
      role: new FormControl(member?.role || "", Validators.required),
    });
  }

  // ----------------------
  // Array Management
  // ----------------------
  addAddress(): void {
    this.userForm.controls.address.push(this.createAddressGroup());
  }

  removeAddress(index: number): void {
    this.userForm.controls.address.removeAt(index);
  }

  addBank(): void {
    this.userForm.controls.bank.push(this.createBankGroup());
  }

  removeBank(index: number): void {
    this.userForm.controls.bank.removeAt(index);
  }

  addCompany(): void {
    this.userForm.controls.company.push(this.createCompanyGroup());
  }

  removeCompany(index: number): void {
    this.userForm.controls.company.removeAt(index);
  }
  addCrypto(): void {
    this.userForm.controls.crypto.push(this.createCryptoGroup());
  }

  removeCrypto(index: number): void {
    this.userForm.controls.crypto.removeAt(index);
  }

  addWorkExperience(): void {
    this.userForm.controls.workExperience.push(
      this.createWorkExperienceGroup(),
    );
  }

  removeWorkExperience(index: number): void {
    this.userForm.controls.workExperience.removeAt(index);
  }
  addProject(workIndex: number): void {
    this.userForm.controls.workExperience
      .at(workIndex)
      .controls.projects.push(this.createProjectGroup());
  }

  removeProject(workIndex: number, projectIndex: number): void {
    this.userForm.controls.workExperience
      .at(workIndex)
      .controls.projects.removeAt(projectIndex);
  }

  addTechnology(workIndex: number, projectIndex: number): void {
    const techValue = this.newTechControl.get("technology")?.value?.trim();
    this.userForm.controls.workExperience
      .at(workIndex)
      .controls.projects.at(projectIndex)
      .controls.technologies.push(
        this.createTechnologyGroup({ _id: "", technology: techValue || "" }),
      );
    this.newTechControl.reset();
  }

  removeTechnology(
    workIndex: number,
    projectIndex: number,
    techIndex: number,
  ): void {
    this.userForm.controls.workExperience
      .at(workIndex)
      .controls.projects.at(projectIndex)
      .controls.technologies.removeAt(techIndex);
  }

  addTeamMember(workIndex: number, projectIndex: number): void {
    this.userForm.controls.workExperience
      .at(workIndex)
      .controls.projects.at(projectIndex)
      .controls.teamMembers.push(this.createTeamMemberGroup());
  }

  removeTeamMember(
    workIndex: number,
    projectIndex: number,
    teamMemberIndex: number,
  ): void {
    this.userForm.controls.workExperience
      .at(workIndex)
      .controls.projects.at(projectIndex)
      .controls.teamMembers.removeAt(teamMemberIndex);
  }

  // ----------------------
  // Form Submission
  // ----------------------
  onSubmit(): void {
    if (!this.userForm!.valid) return;
    const changes: ChangeLog[] = [];
    this.changeLogService.compareProperties(
      this.userBeforeEdit,
      this.userForm!.value,
      changes,
    );
    this.crossTabEditService.saveEditResponseToLocalStorage(
      this.sessionId,
      this.userBeforeEdit?._id!,
      changes,
    );
    this.userBeforeEdit = this.userForm.value as any as UserWithVersion;
  }

  formatPhoneNumber(): void {
    const phoneControl = this.userForm.get("phone");
    if (!phoneControl) return;

    let phoneValue = phoneControl.value;
    if (phoneValue) {
      phoneValue = phoneValue.replace(/\D/g, "");
      if (phoneValue.length > 3 && phoneValue.length <= 6) {
        phoneValue = `(${phoneValue.substring(0, 3)}) ${phoneValue.substring(
          3,
        )}`;
      } else if (phoneValue.length > 6) {
        phoneValue = `(${phoneValue.substring(0, 3)}) ${phoneValue.substring(
          3,
          6,
        )}-${phoneValue.substring(6, 10)}`;
      }
      phoneControl.setValue(phoneValue, { emitEvent: false });
    }
  }
}

type TypedForm<T> = {
  [K in keyof T]: T[K] extends Array<infer U>
    ? FormArray<
        U extends object ? FormGroup<TypedForm<U>> : FormControl<U | null>
      >
    : T[K] extends object
      ? FormGroup<TypedForm<T[K]>>
      : FormControl<T[K] | null>;
};

type UserFormType = FormGroup<TypedForm<UserWithVersion>>;
