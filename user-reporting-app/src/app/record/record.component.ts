import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import {
  Address,
  Bank,
  Company,
  Coordinates,
  Hair,
  Project,
  TeamMember,
  Technology,
  User,
  WorkExperience,
  Crypto as ICrypto,
  CompanyAddress,
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

@Component({
  selector: "app-record",
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
    <div class="user-form-container">
      <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
        <div class="sub-group-header">
          <h2>User Information Form</h2>
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
                  let addressGroup of addressArray.controls;
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
                  *ngIf="i < addressArray.controls.length - 1"
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
                *ngFor="let bankGroup of bankArray.controls; let i = index"
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
                  *ngIf="i < bankArray.controls.length - 1"
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
                  let companyGroup of companyArray.controls;
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
                  *ngIf="i < companyArray.controls.length - 1"
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
                *ngFor="let cryptoGroup of cryptoArray.controls; let i = index"
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
                  *ngIf="i < cryptoArray.controls.length - 1"
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
                  let workExpGroup of workExperienceArray.controls;
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
                        let projectGroup of projectsArray(workIndex).controls;
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
                                let techGroup of technologiesArray(
                                  workIndex,
                                  projIndex
                                ).controls;
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
                              let memberGroup of teamMembersArray(
                                workIndex,
                                projIndex
                              ).controls;
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
                  *ngIf="workIndex < workExperienceArray.controls.length - 1"
                ></mat-divider>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </form>
      <!-- <pre class="overlay-pre">Form values: {{ userForm.value | json }}</pre> -->
    </div>
  `,
  styleUrls: ["./record.component.scss"],
})
export class RecordComponent implements OnInit, OnDestroy {
  originalUser: User | null = null;
  userForm!: FormGroup;
  newTechControl!: FormGroup;
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

  constructor(
    private fb: FormBuilder,
    private crossTabEditService: CrossTabEditService,
  ) {}

  ngOnInit() {
    this.initializeEmptyForm();

    this.crossTabEditService.editSession$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editSession) => {
        this.userForm.patchValue(editSession!.userBefore);
      });
  }
  private readonly destroy$ = new Subject<void>();
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeEmptyForm() {
    this.userForm = this.fb.group({
      _id: [""],
      firstName: ["", Validators.required],
      lastName: ["", Validators.required],
      maidenName: [""],
      age: [null, [Validators.min(0)]],
      gender: [""],
      email: ["", [Validators.email]],
      phone: ["", [Validators.pattern(this.validatorParams.phonePatterns.us)]],
      username: [
        "",
        [Validators.minLength(this.validatorParams.usernameLenMin)],
      ],
      password: [
        "",
        [Validators.minLength(this.validatorParams.passwordLenMin)],
      ],
      birthDate: [""],
      image: [""],
      bloodGroup: [""],
      height: [null],
      weight: [null],
      eyeColor: [""],
      hair: this.createHairGroup(),
      ip: [""],
      address: this.fb.array([this.createAddressGroup()]),
      macAddress: [""],
      university: [""],
      bank: this.fb.array([this.createBankGroup()]),
      company: this.fb.array([this.createCompanyGroup()]),
      ein: [""],
      ssn: [""],
      userAgent: [""],
      crypto: this.fb.array([this.createCryptoGroup()]),
      role: [""],
      workExperience: this.fb.array([this.createWorkExperienceGroup()]),
    });

    this.newTechControl = this.createTechnologyGroup();
  }

  // --------------------------
  // Form Group Creation Methods
  // --------------------------
  private createHairGroup(hair?: Hair): FormGroup {
    return this.fb.group({
      color: [hair?.color || ""],
      type: [hair?.type || ""],
    });
  }

  private createAddressGroup(address?: Address): FormGroup {
    return this.fb.group({
      _id: [address?._id || uuidv4()],
      address: [address?.address || "", Validators.required],
      city: [address?.city || "", Validators.required],
      state: [address?.state || "", Validators.required],
      stateCode: [
        address?.stateCode || "",
        [
          Validators.required,
          Validators.maxLength(this.validatorParams.stateCodeLenMax),
        ],
      ],
      postalCode: [
        address?.postalCode || "",
        [
          Validators.required,
          Validators.maxLength(this.validatorParams.postalCodeLenMax),
        ],
      ],
      coordinates: this.createCoordinatesGroup(address?.coordinates),
      country: [address?.country || "", Validators.required],
    });
  }

  private createCompanyAddressGroup(address?: CompanyAddress): FormGroup {
    return this.fb.group({
      address: [address?.address || "", Validators.required],
      city: [address?.city || "", Validators.required],
      state: [address?.state || "", Validators.required],
      stateCode: [
        address?.stateCode || "",
        [
          Validators.required,
          Validators.maxLength(this.validatorParams.stateCodeLenMax),
        ],
      ],
      postalCode: [
        address?.postalCode || "",
        [
          Validators.required,
          Validators.maxLength(this.validatorParams.postalCodeLenMax),
        ],
      ],
      coordinates: this.createCoordinatesGroup(address?.coordinates),
      country: [address?.country || "", Validators.required],
    });
  }

  private createCoordinatesGroup(coords?: Coordinates): FormGroup {
    return this.fb.group({
      lat: [coords?.lat || null],
      lng: [coords?.lng || null],
    });
  }

  private createBankGroup(bank?: Bank): FormGroup {
    return this.fb.group({
      _id: [bank?._id || uuidv4()],
      cardNumber: [bank?.cardNumber || "", Validators.required],
      cardExpire: [bank?.cardExpire || "", Validators.required],
      cardType: [bank?.cardType || "", Validators.required],
      currency: [bank?.currency || ""],
      iban: [bank?.iban || ""],
    });
  }

  private createCompanyGroup(company?: Company): FormGroup {
    return this.fb.group({
      _id: [company?._id || uuidv4()],
      department: [company?.department || ""],
      name: [company?.name || "", Validators.required],
      title: [company?.title || ""],
      address: this.createCompanyAddressGroup(company?.address),
    });
  }

  private createCryptoGroup(crypto?: ICrypto): FormGroup {
    return this.fb.group({
      _id: [crypto?._id || uuidv4()],
      coin: [crypto?.coin || "", Validators.required],
      network: [crypto?.network || "", Validators.required],
      wallet: [crypto?.wallet || ""],
    });
  }

  private createWorkExperienceGroup(work?: WorkExperience): FormGroup {
    return this.fb.group({
      _id: [work?._id || uuidv4()],
      jobTitle: [work?.jobTitle || "", Validators.required],
      employer: [work?.employer || "", Validators.required],
      projects: this.fb.array(
        work?.projects?.map((p) => this.createProjectGroup(p)) || [
          this.createProjectGroup(),
        ],
      ),
    });
  }

  private createProjectGroup(project?: Project): FormGroup {
    return this.fb.group({
      _id: [project?._id || uuidv4()],
      name: [project?.name || "", Validators.required],
      description: [project?.description || ""],
      technologies: this.fb.array(
        project?.technologies?.map((t) => this.createTechnologyGroup(t)) || [],
      ),
      teamMembers: this.fb.array(
        project?.teamMembers?.map((tm) => this.createTeamMemberGroup(tm)) || [
          this.createTeamMemberGroup(),
        ],
      ),
    });
  }

  private createTechnologyGroup(tech?: Technology): FormGroup {
    return this.fb.group({
      _id: [tech?._id || uuidv4()],
      technology: [tech?.technology || "", [Validators.required]],
    });
  }

  private createTeamMemberGroup(member?: TeamMember): FormGroup {
    return this.fb.group({
      _id: [member?._id || uuidv4()],
      name: [member?.name || "", Validators.required],
      role: [member?.role || "", Validators.required],
    });
  }

  // ----------------------
  // Form Array Accessors
  // ----------------------
  get addressArray(): FormArray {
    return this.userForm!.get("address") as FormArray;
  }

  get bankArray(): FormArray {
    return this.userForm!.get("bank") as FormArray;
  }

  get companyArray(): FormArray {
    return this.userForm!.get("company") as FormArray;
  }

  get cryptoArray(): FormArray {
    return this.userForm!.get("crypto") as FormArray;
  }

  get workExperienceArray(): FormArray {
    return this.userForm!.get("workExperience") as FormArray;
  }

  projectsArray(workIndex: number): FormArray {
    return this.workExperienceArray.at(workIndex).get("projects") as FormArray;
  }

  technologiesArray(workIndex: number, projectIndex: number): FormArray {
    return this.projectsArray(workIndex)
      .at(projectIndex)
      .get("technologies") as FormArray;
  }

  teamMembersArray(workIndex: number, projectIndex: number): FormArray {
    return this.projectsArray(workIndex)
      .at(projectIndex)
      .get("teamMembers") as FormArray;
  }

  // ----------------------
  // Array Management
  // ----------------------
  addAddress(): void {
    this.addressArray.push(this.createAddressGroup());
  }

  removeAddress(index: number): void {
    this.addressArray.removeAt(index);
  }

  addBank(): void {
    this.bankArray.push(this.createBankGroup());
  }

  removeBank(index: number): void {
    this.bankArray.removeAt(index);
  }

  addCompany(): void {
    this.companyArray.push(this.createCompanyGroup());
  }

  removeCompany(index: number): void {
    this.companyArray.removeAt(index);
  }
  addCrypto(): void {
    this.cryptoArray.push(this.createCryptoGroup());
  }

  removeCrypto(index: number): void {
    this.cryptoArray.removeAt(index);
  }

  addWorkExperience(): void {
    this.workExperienceArray.push(this.createWorkExperienceGroup());
  }

  removeWorkExperience(index: number): void {
    this.workExperienceArray.removeAt(index);
  }
  addProject(workIndex: number): void {
    this.projectsArray(workIndex).push(this.createProjectGroup());
  }

  removeProject(workIndex: number, projectIndex: number): void {
    this.projectsArray(workIndex).removeAt(projectIndex);
  }

  addTechnology(workIndex: number, projectIndex: number): void {
    const techValue = this.newTechControl.get("technology")?.value?.trim();
    console.log("🚀 ~ RecordComponent ~ addTechnology ~ techValue:", techValue);
    this.technologiesArray(workIndex, projectIndex).push(
      this.createTechnologyGroup({ _id: "", technology: techValue || "" }),
    );
    this.newTechControl.reset();
  }

  removeTechnology(
    workIndex: number,
    projectIndex: number,
    techIndex: number,
  ): void {
    this.technologiesArray(workIndex, projectIndex).removeAt(techIndex);
  }

  addTeamMember(workIndex: number, projectIndex: number): void {
    this.teamMembersArray(workIndex, projectIndex).push(
      this.createTeamMemberGroup(),
    );
  }

  removeTeamMember(
    workIndex: number,
    projectIndex: number,
    teamMemberIndex: number,
  ): void {
    this.teamMembersArray(workIndex, projectIndex).removeAt(teamMemberIndex);
  }

  // ----------------------
  // Form Submission
  // ----------------------
  onSubmit(): void {
    console.log(
      "🚀 ~ RecordComponent ~ onSubmit ~ onSubmit:",
      this.userForm.value,
    );
    if (this.userForm!.valid) {
      const currentUser = this.userForm!.value;
      // const changes = this.generateChangeLog(this.originalUser, currentUser);

      // Send changes to service
      // console.log('Form Changes:', changes);
    }
  }

  formatPhoneNumber(): void {
    const phoneControl = this.userForm.get("phone");
    if (!phoneControl) return;

    let phoneValue = phoneControl.value;
    if (phoneValue) {
      // Simple formatting example - adjust to your needs
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
