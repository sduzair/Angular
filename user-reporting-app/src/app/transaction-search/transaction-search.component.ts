import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ErrorHandler,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  ErrorStateMatcher,
  MAT_DATE_FORMATS,
  MatDateFormats,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
  MatFormFieldModule,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatToolbar } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import {
  getMonth,
  getYear,
  isAfter,
  isBefore,
  setMonth,
  setYear,
} from 'date-fns';
import { isEqual, xorWith } from 'lodash-es';
import {
  BehaviorSubject,
  catchError,
  combineLatestWith,
  finalize,
  forkJoin,
  map,
  of,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { CaseRecordService } from '../aml/case-record.service';
import { CaseRecordState, ReviewPeriod } from '../aml/case-record.store';
import { setError } from '../form-helpers';
import { SnackbarQueueService } from '../snackbar-queue.service';
import {
  AccountNumberData,
  AccountNumberSelectableTableComponent,
} from './account-number-selectable-table/account-number-selectable-table.component';
import {
  PartyKeyData,
  PartyKeySelectableTableComponent,
} from './party-key-selectable-table/party-key-selectable-table.component';
import { ProductTypeSelectableTableComponent } from './product-type-selectable-table/product-type-selectable-table.component';
import { ReviewPeriodDateDirective } from './review-period-date.directive';
import {
  SourceRefreshSelectableTableComponent,
  SourceSysRefreshTimeData,
} from './source-refresh-selectable-table/source-refresh-selectable-table.component';
import {
  TransactionSearchResponse,
  TransactionSearchService,
} from './transaction-search.service';

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
  selector: 'app-transaction-search',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTableModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    ReviewPeriodDateDirective,
    MatListModule,
    MatCardModule,
    MatIcon,
    MatToolbar,
    SourceRefreshSelectableTableComponent,
    ProductTypeSelectableTableComponent,
    AccountNumberSelectableTableComponent,
    PartyKeySelectableTableComponent,
  ],
  template: `
    <div class="transaction-search container px-0 my-1">
      <div class="row row-cols-1 mx-0">
        <mat-toolbar class="col mb-3">
          <span>Transaction Search</span>
          <div class="flex-fill"></div>
          <button
            type="button"
            mat-flat-button
            (click)="onSearch()"
            [disabled]="isSourceRefreshTimeLoading || (isLoading$ | async)">
            <mat-icon>search</mat-icon>
            Search
          </button>
        </mat-toolbar>

        <form [formGroup]="searchParamsForm" class="search-form col">
          <div class="row g-3">
            <!-- Search Form Section -->
            <div class="col-12">
              <!-- AML ID Input -->
              <mat-toolbar
                class="row row-cols-auto flex-row align-items-baseline px-0">
                <mat-form-field class="col ps-0">
                  <mat-label>AML ID</mat-label>
                  <input
                    matInput
                    formControlName="amlId"
                    placeholder="Enter AML ID" />
                  <mat-icon matSuffix>search</mat-icon>
                  @if (searchParamsForm.controls.amlId.hasError('required')) {
                    <mat-error> AML ID is required </mat-error>
                  }
                  @if (searchParamsForm.controls.amlId.hasError('pattern')) {
                    <mat-error> AML ID must be numbers only </mat-error>
                  }
                </mat-form-field>
                <button
                  type="button"
                  mat-raised-button
                  class="col search-btn"
                  (click)="onLoad()"
                  [disabled]="
                    isSourceRefreshTimeLoading ||
                    (isLoading$ | async) ||
                    !searchParamsForm.controls.amlId.valid
                  ">
                  Load
                </button>
                <div class="flex-fill"></div>
                <button
                  type="button"
                  mat-raised-button
                  class="col search-btn"
                  (click)="onSave()"
                  [disabled]="
                    isSourceRefreshTimeLoading ||
                    (isLoading$ | async) ||
                    searchParamsForm.invalid ||
                    !searchParamsBefore ||
                    (formHasChanges$ | async) === false
                  ">
                  Save
                </button>
              </mat-toolbar>
            </div>
            <div class="col-12 col-xl-8">
              <!-- Filter Sections -->
              <div class="row g-3">
                <!-- Parties Filter -->
                <div class="col-12 col-lg-6 filter-card">
                  <mat-card>
                    <mat-card-header>
                      <mat-card-title class="fs-5">Parties</mat-card-title>
                      <mat-card-subtitle>
                        <div
                          class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                          <div class="mat-mdc-form-field-error-wrapper px-0">
                            <div class="mat-mdc-form-field-bottom-align">
                              @if (
                                searchParamsForm.controls.partyKeys.hasError(
                                  'atleastOneSelection'
                                )
                              ) {
                                <mat-error>
                                  *Atleast one selection must exist
                                </mat-error>
                              }
                            </div>
                          </div>
                        </div>
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <app-party-key-selectable-table
                        formControlName="partyKeys"
                        [data]="(partyKeysData$ | async) || []"
                        [isLoading]="(isLoading$ | async) || false">
                      </app-party-key-selectable-table>
                    </mat-card-content>
                  </mat-card>
                </div>

                <!-- Accounts Filter -->
                <div class="col-12 col-lg-6 filter-card">
                  <mat-card>
                    <mat-card-header>
                      <mat-card-title class="fs-5"
                        >Accounts / Products</mat-card-title
                      >
                      <mat-card-subtitle>
                        <div
                          class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                          <div class="mat-mdc-form-field-error-wrapper px-0">
                            <div class="mat-mdc-form-field-bottom-align">
                              @if (
                                searchParamsForm.controls.accountNumbers.hasError(
                                  'atleastOneSelection'
                                )
                              ) {
                                <mat-error>
                                  *Atleast one selection must exist
                                </mat-error>
                              }
                            </div>
                          </div>
                        </div>
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <app-account-number-selectable-table
                        formControlName="accountNumbers"
                        [data]="(accountNumbersData$ | async) || []"
                        [isLoading]="(isLoading$ | async) || false">
                      </app-account-number-selectable-table>
                    </mat-card-content>
                  </mat-card>
                </div>

                <!-- Product Types Filter -->
                <div class="col-12 col-lg-6 filter-card">
                  <mat-card>
                    <mat-card-header>
                      <mat-card-title class="fs-5"
                        >Product Types</mat-card-title
                      >
                      <mat-card-subtitle>
                        <div
                          class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                          <div class="mat-mdc-form-field-error-wrapper px-0">
                            <div class="mat-mdc-form-field-bottom-align">
                              @if (
                                searchParamsForm.controls.productTypes.hasError(
                                  'atleastOneSelection'
                                )
                              ) {
                                <mat-error>
                                  *Atleast one selection must exist
                                </mat-error>
                              }
                            </div>
                          </div>
                        </div>
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <app-product-type-selectable-table
                        formControlName="productTypes"
                        [isLoading]="(isLoading$ | async) || false">
                      </app-product-type-selectable-table>
                    </mat-card-content>
                  </mat-card>
                </div>

                <!-- Date Range -->
                <div class="col-12 col-lg-6 filter-card">
                  <mat-card>
                    <mat-card-header>
                      <mat-card-title>
                        <mat-toolbar class="card-toolbar px-0">
                          <span class="fs-5">Review Period(s)</span>
                          <div class="flex-fill"></div>
                          <button
                            type="button"
                            mat-flat-button
                            (click)="addReviewPeriod()"
                            [disabled]="
                              isSourceRefreshTimeLoading ||
                              (isLoading$ | async) ||
                              isFormDisabled
                            ">
                            <mat-icon>library_add</mat-icon>
                            Add
                          </button>
                        </mat-toolbar>
                      </mat-card-title>
                      <mat-card-subtitle>
                        <div
                          class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                          <div class="mat-mdc-form-field-error-wrapper px-0">
                            <div class="mat-mdc-form-field-bottom-align">
                              @if (
                                searchParamsForm.controls.reviewPeriods.hasError(
                                  'overlappingReviewPeriods'
                                )
                              ) {
                                <mat-error>
                                  *Review periods must not overlap
                                </mat-error>
                              }
                            </div>
                          </div>
                        </div>
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div formArrayName="reviewPeriods">
                        <div>
                          @for (
                            period of searchParamsForm.controls.reviewPeriods
                              .controls;
                            track $index;
                            let i = $index
                          ) {
                            <div [formGroupName]="i">
                              <div
                                class="row review-period-input mt-2 justify-content-evenly"
                                [class.loading]="
                                  isSourceRefreshTimeLoading ||
                                  (isLoading$ | async) ||
                                  false
                                ">
                                <mat-form-field class="col">
                                  <mat-label>Start MM/YYYY</mat-label>
                                  <input
                                    matInput
                                    [matDatepicker]="startPicker"
                                    formControlName="start"
                                    readonly
                                    appReviewPeriodDate
                                    [max]="maxDate" />
                                  <mat-datepicker-toggle
                                    matSuffix
                                    [for]="startPicker"></mat-datepicker-toggle>
                                  <mat-datepicker
                                    #startPicker
                                    startView="multi-year"
                                    (yearSelected)="
                                      chosenYearHandler(
                                        $event,
                                        startPicker,
                                        'start',
                                        i
                                      )
                                    "
                                    (monthSelected)="
                                      chosenMonthHandler(
                                        $event,
                                        startPicker,
                                        'start',
                                        i
                                      )
                                    "></mat-datepicker>
                                  @if (
                                    period.controls.start.hasError('required')
                                  ) {
                                    <mat-error>
                                      *Start month is required
                                    </mat-error>
                                  }
                                  @if (
                                    period.controls.start.hasError(
                                      'startBeforeEndReviewPeriod'
                                    )
                                  ) {
                                    <mat-error>
                                      *Start month must be before end month
                                    </mat-error>
                                  }
                                </mat-form-field>
                                <span
                                  class="sk skw-6 skh-7 col-auto flex-grow-1 mx-3"></span>
                                <mat-form-field class="col">
                                  <mat-label>End MM/YYYY</mat-label>
                                  <input
                                    matInput
                                    [matDatepicker]="endPicker"
                                    formControlName="end"
                                    readonly
                                    appReviewPeriodDate
                                    [max]="maxDate" />
                                  <mat-datepicker-toggle
                                    matSuffix
                                    [for]="endPicker"></mat-datepicker-toggle>
                                  <mat-datepicker
                                    #endPicker
                                    startView="multi-year"
                                    (yearSelected)="
                                      chosenYearHandler(
                                        $event,
                                        endPicker,
                                        'end',
                                        i
                                      )
                                    "
                                    (monthSelected)="
                                      chosenMonthHandler(
                                        $event,
                                        endPicker,
                                        'end',
                                        i
                                      )
                                    "></mat-datepicker>
                                  @if (
                                    period.controls.end.hasError('required')
                                  ) {
                                    <mat-error>
                                      *End month is required
                                    </mat-error>
                                  }
                                </mat-form-field>
                                <span
                                  class="sk skw-6 skh-7 col-auto flex-grow-1 mx-3"></span>
                                <div
                                  class="col-1 px-0 d-flex align-items-center">
                                  <button
                                    type="button"
                                    mat-icon-button
                                    color="warn"
                                    (click)="removeReviewPeriod(i)"
                                    [disabled]="
                                      searchParamsForm.controls.reviewPeriods
                                        .controls.length === 1 ||
                                      isFormDisabled ||
                                      isSourceRefreshTimeLoading ||
                                      (isLoading$ | async)
                                    "
                                    matTooltip="Remove period"
                                    class="mb-4">
                                    <mat-icon>delete</mat-icon>
                                  </button>
                                </div>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    </mat-card-content></mat-card
                  >
                </div>
              </div>
            </div>

            <!-- System Information Section -->
            <div class="col-12 col-xl-4 system-info">
              <mat-card>
                <mat-card-header>
                  <mat-card-title class="fs-5"
                    >System Information</mat-card-title
                  >
                  <mat-card-subtitle>
                    <div
                      class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                      <div class="mat-mdc-form-field-error-wrapper px-0">
                        <div class="mat-mdc-form-field-bottom-align">
                          @if (
                            searchParamsForm.controls.sourceSystems.hasError(
                              'atleastOneSelection'
                            )
                          ) {
                            <mat-error>
                              *Atleast one selection must exist
                            </mat-error>
                          }
                        </div>
                      </div>
                    </div>
                  </mat-card-subtitle>
                </mat-card-header>

                <mat-card-content>
                  <app-source-refresh-selectable-table
                    formControlName="sourceSystems"
                    [data]="(sourceRefreshTimeData$ | async) || []"
                    [isLoading]="
                      isSourceRefreshTimeLoading ||
                      (isLoading$ | async) ||
                      false
                    ">
                  </app-source-refresh-selectable-table>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrl: './transaction-search.component.scss',
  providers: [
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: 'MM/yyyy', // e.g. 09/2025
        },
        display: {
          dateInput: 'MM/yyyy',
          monthYearLabel: 'MMM yyyy',
          dateA11yLabel: 'MMMM yyyy',
          monthYearA11yLabel: 'MMMM yyyy',
        },
      } as MatDateFormats,
    },
    { provide: ErrorStateMatcher, useClass: PreemptiveErrorStateMatcher },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'outline',
        floatLabel: 'always',
      } as MatFormFieldDefaultOptions,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionSearchComponent implements OnInit {
  private caseRecordService = inject(CaseRecordService);
  private searchService = inject(TransactionSearchService);
  private snackbarQ = inject(SnackbarQueueService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ErrorHandler);

  searchParamsForm = new FormGroup(
    {
      amlId: new FormControl(
        { value: '', disabled: false },
        {
          validators: [Validators.required, Validators.pattern('^[0-9]+$')],
          nonNullable: true,
        },
      ),
      partyKeys: new FormControl(
        { value: [] as PartyKeyData[], disabled: true },
        {
          validators: [Validators.required, atleastOneSelectionValidator],
          nonNullable: true,
        },
      ),
      accountNumbers: new FormControl(
        { value: [] as AccountNumberData[], disabled: true },
        {
          validators: [Validators.required, atleastOneSelectionValidator],
          nonNullable: true,
        },
      ),
      sourceSystems: new FormControl(
        { value: [] as SourceSysRefreshTimeData[], disabled: true },
        {
          validators: [Validators.required, atleastOneSelectionValidator],
          nonNullable: true,
        },
      ),
      productTypes: new FormControl(
        { value: [] as { value: string }[], disabled: true },
        {
          validators: [Validators.required, atleastOneSelectionValidator],
          nonNullable: true,
        },
      ),
      reviewPeriods: new FormArray(
        [] as ReturnType<typeof this.createReviewPeriodGroup>[],
        { validators: [overlappingReviewPeriodsValidator] },
      ),
      caseRecordId: new FormControl('', { nonNullable: true }),
      eTag: new FormControl(Number.NaN, { nonNullable: true }),
    },
    {
      updateOn: 'change',
      validators: [searchParamsExistValidator],
    },
  );
  readonly maxDate = new Date();

  onLoad() {
    this.loadClick$.next();
  }

  private loadClick$ = new Subject<void>();
  loadCaseRecord$ = this.loadClick$.pipe(
    map(() => this.searchParamsForm.value.amlId!.trim()),
    tap(() => {
      this.isLoading$.next(true);
    }),
    switchMap((amlId) =>
      this.searchService.getAmlPartyAccountInfo(amlId!).pipe(
        combineLatestWith(this.caseRecordService.fetchCaseRecord(amlId)),
        tap(([{ amlId }, { caseRecordId, searchParams, eTag }]) => {
          const {
            reviewPeriodSelection,
            partyKeysSelection,
            accountNumbersSelection,
            sourceSystemsSelection,
            productTypesSelection,
          } = searchParams ?? {};
          this.searchParamsForm.enable();
          this.searchParamsForm.controls.reviewPeriods.clear({
            emitEvent: false,
          });
          (reviewPeriodSelection ?? []).forEach((period) => {
            this.searchParamsForm.controls.reviewPeriods.push(
              this.createReviewPeriodGroup({
                start: period.start ?? null,
                end: period.end ?? null,
              }),
            );
          });
          this.searchParamsForm.patchValue(
            {
              amlId: amlId,
              partyKeys: (partyKeysSelection ?? []).map((p) => ({
                partyKey: p,
              })),
              accountNumbers: accountNumbersSelection ?? [],
              sourceSystems: (sourceSystemsSelection ?? []).map((s) => ({
                sourceSys: s,
              })),
              productTypes: (productTypesSelection ?? []).map((p) => ({
                value: p,
              })),
              caseRecordId,
              eTag,
            },
            { emitEvent: false }, // prevents value changes emission on aml id which disables form
          );

          this.searchParamsBefore = structuredClone(
            this.searchParamsForm.value,
          );
        }),
        catchError((err) => {
          this.errorHandler.handleError(err);
          return of();
        }),
        finalize(() => this.isLoading$.next(false)),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  searchParamsBefore: typeof this.searchParamsForm.value | null = null;

  formHasChanges$ = this.searchParamsForm.valueChanges.pipe(
    map(() => {
      if (!this.searchParamsBefore) return false;

      const current = this.searchParamsForm.value;
      const before = this.searchParamsBefore;

      const {
        accountNumbers: currA = [],
        partyKeys: currP = [],
        productTypes: currPt = [],
        reviewPeriods: currR = [],
        sourceSystems: currS = [],
        ...currentRest
      } = current;
      const {
        accountNumbers: befA = [],
        partyKeys: befP = [],
        productTypes: befPt = [],
        reviewPeriods: befR = [],
        sourceSystems: befS = [],
        ...beforeRest
      } = before;

      const arrayChanged =
        xorWith(
          [...currA, ...currP, ...currPt, ...currR, ...currS],
          [...befA, ...befP, ...befPt, ...befR, ...befS],
          isEqual,
        ).length > 0;

      const restChanged = !isEqual(currentRest, beforeRest);

      return arrayChanged || restChanged;
    }),
    startWith(false),
  );

  partyKeysData$ = this.loadCaseRecord$.pipe(
    switchMap(([{ partyKeys }]) => {
      return forkJoin(
        partyKeys.map((p) => this.searchService.getPartyInfo(p.partyKey)),
      ).pipe(
        catchError((error) => {
          this.errorHandler.handleError(error);
          return of();
        }),
      );
    }),
    map((responses) =>
      responses.map((res) => ({
        partyKey: res.partyKey,
        name: formatPartyName(res),
      })),
    ),
  );

  accountNumbersData$ = this.loadCaseRecord$.pipe(
    map(([{ partyKeys }]) => {
      // gets unique accounts
      return Array.from(
        new Set(
          partyKeys
            .flatMap((p) => p.accountModels)
            .map((accountModel) => {
              return `${accountModel.accountTransit?.trim() ?? ''} $ ${accountModel.accountNumber.trim()}`;
            }),
        ),
      ).map((val) => {
        const [transit, account] = val.split(/\s\$\s/);
        return { transit, account };
      });
    }),
    switchMap((accountAndTransitArray) => {
      // If no accounts, return empty array
      if (accountAndTransitArray.length === 0) {
        return of([]);
      }

      // Map each account to an HTTP request observable
      const requests = accountAndTransitArray.map((account) =>
        this.searchService
          .getAccountInfo(account.account)
          .pipe(map((res) => ({ ...account, ...res }))),
      );

      // Execute all requests in parallel and wait for all to complete
      return forkJoin(requests).pipe(
        catchError((error) => {
          this.errorHandler.handleError(error);
          return of();
        }),
      );
    }),
  );

  isSourceRefreshTimeLoading = true;
  sourceRefreshTimeData$ = this.searchService.fetchSourceRefreshTime().pipe(
    finalize(() => {
      this.isSourceRefreshTimeLoading = false;
    }),
  );

  public isLoading$ = new BehaviorSubject<boolean>(false);

  @ViewChild(FormGroupDirective)
  private formDif!: FormGroupDirective;

  ngOnInit(): void {
    this.searchParamsForm.controls.amlId.valueChanges
      .pipe(
        tap((amlIdValue) => {
          // set emit false to prevent infinite loop
          this.formDif.resetForm({ amlId: amlIdValue }, { emitEvent: false });
          this.searchParamsForm.controls.partyKeys.disable({
            emitEvent: false,
          });
          this.searchParamsForm.controls.accountNumbers.disable({
            emitEvent: false,
          });
          this.searchParamsForm.controls.sourceSystems.disable({
            emitEvent: false,
          });
          this.searchParamsForm.controls.productTypes.disable({
            emitEvent: false,
          });
          this.searchParamsForm.controls.reviewPeriods.disable({
            emitEvent: false,
          });

          this.searchParamsBefore = null;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe();
  }

  onSave() {
    this.isLoading$.next(true);

    const {
      caseRecordId,
      accountNumbers,
      partyKeys,
      productTypes,
      reviewPeriods,
      sourceSystems,
      eTag,
    } = this.searchParamsForm.value;

    this.caseRecordService
      .updateCaseRecord(caseRecordId!, {
        searchParams: {
          accountNumbersSelection: (accountNumbers ?? []).map(
            ({ transit, account }) => ({
              transit,
              account,
            }),
          ),
          partyKeysSelection: (partyKeys ?? []).map((item) => item.partyKey),
          productTypesSelection: (productTypes ?? []).map((item) => item.value),
          reviewPeriodSelection: (reviewPeriods ?? []) as ReviewPeriod[],
          sourceSystemsSelection: (sourceSystems ?? []).map(
            (item) => item.sourceSys,
          ),
        },
        eTag: eTag!,
      })
      .pipe(
        finalize(() => this.isLoading$.next(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe(() => {
        this.snackbarQ.open('Search parameters updated.');
        this.searchParamsBefore = structuredClone(this.searchParamsForm.value);
        this.searchParamsForm.updateValueAndValidity();
      });
  }

  get isFormDisabled() {
    return (
      // review periods unlike others is a form array and may not have form controls with disabled state
      (this.searchParamsForm.controls.partyKeys.disabled &&
        this.searchParamsForm.controls.accountNumbers.disabled &&
        this.searchParamsForm.controls.sourceSystems.disabled &&
        this.searchParamsForm.controls.productTypes.disabled &&
        this.searchParamsForm.controls.reviewPeriods.disabled) ||
      this.searchParamsForm.controls.reviewPeriods.length === 0
    );
  }

  // todo: implement loading state in view
  onSearch() {
    if (this.searchParamsForm.invalid) {
      this.snackbarQ.open(
        'Please enter transaction search filters before searching',
        'Dismiss',
        {
          duration: 5000,
        },
      );
      return;
    }
    const {
      accountNumbers = [],
      partyKeys = [],
      productTypes = [],
      reviewPeriods = [],
      sourceSystems = [],
    } = this.searchParamsForm.value;

    this.searchService
      .searchTransactions({
        accountNumbersSelection: (accountNumbers ?? []).map(
          ({ transit, account }) => ({
            transit,
            account,
          }),
        ),
        partyKeysSelection: (partyKeys ?? []).map((item) => item.partyKey),
        productTypesSelection: (productTypes ?? []).map((item) => item.value),
        reviewPeriodSelection: (reviewPeriods ?? []) as ReviewPeriod[],
        sourceSystemsSelection: (sourceSystems ?? []).map(
          (item) => item.sourceSys,
        ),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe((searchResult) => {
        this.router.navigate(
          ['/aml', this.searchParamsForm.value.amlId!, 'transaction-view'],
          {
            state: {
              searchParams: {
                accountNumbersSelection: (accountNumbers ?? []).map(
                  ({ transit, account }) => ({
                    transit,
                    account,
                  }),
                ),
                partyKeysSelection: (partyKeys ?? []).map(
                  (item) => item.partyKey,
                ),
                productTypesSelection: (productTypes ?? []).map(
                  (item) => item.value,
                ),
                reviewPeriodSelection: (reviewPeriods ?? []) as ReviewPeriod[],
                sourceSystemsSelection: (sourceSystems ?? []).map(
                  (item) => item.sourceSys,
                ),
              },
              searchResult,
            } satisfies RouteExtrasFromSearch,
          },
        );
      });
  }

  createReviewPeriodGroup({
    start = '',
    end = '',
    disabled = false,
  }: { start?: string; end?: string; disabled?: boolean } = {}) {
    return new FormGroup(
      {
        start: new FormControl(
          { value: start as string, disabled },
          { validators: Validators.required, nonNullable: true },
        ),
        end: new FormControl(
          { value: end as string, disabled },
          { validators: Validators.required, nonNullable: true },
        ),
      },
      { validators: [this.startBeforeEndReviewPeriodValidator] },
    );
  }

  // Validator for individual date range
  startBeforeEndReviewPeriodValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const startControl = (
      control as (typeof this.searchParamsForm.controls.reviewPeriods.controls)[number]
    ).controls.start;

    const start = startControl.value
      ? ReviewPeriodDateDirective.parse(startControl.value)
      : null;

    const endControl = (
      control as (typeof this.searchParamsForm.controls.reviewPeriods.controls)[number]
    ).controls.end;

    const end = endControl.value
      ? ReviewPeriodDateDirective.parse(endControl.value)
      : null;

    if (!start || !end) {
      return null;
    }

    setError(
      startControl,
      {
        startBeforeEndReviewPeriod: true,
      },
      () => !isBefore(start, end) && !isEqual(start, end),
    );

    return null;
  }

  // Add new review period
  addReviewPeriod() {
    this.searchParamsForm.controls.reviewPeriods.push(
      this.createReviewPeriodGroup(),
    );
  }

  // Remove review period
  removeReviewPeriod(index: number) {
    if (this.searchParamsForm.controls.reviewPeriods.length > 1) {
      this.searchParamsForm.controls.reviewPeriods.removeAt(index);
    }
  }

  // Month/year selection handlers
  chosenYearHandler(
    normalizedYear: Date,
    _: MatDatepicker<Date>,
    controlName:
      | keyof (typeof this.searchParamsForm.controls.reviewPeriods.controls)[number]
      | string,
    index: number,
  ) {
    const ctrlValue = this.searchParamsForm.controls.reviewPeriods
      .at(index)
      .get(controlName)?.value as unknown as string;

    let chosenDate: Date = normalizedYear;

    if (ctrlValue) {
      chosenDate = setYear(ctrlValue, getYear(normalizedYear));
    }

    this.searchParamsForm.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.setValue(ReviewPeriodDateDirective.format(chosenDate));

    this.searchParamsForm.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.updateValueAndValidity();
  }

  chosenMonthHandler(
    normalizedMonth: Date,
    datepicker: MatDatepicker<Date>,
    controlName:
      | keyof (typeof this.searchParamsForm.controls.reviewPeriods.controls)[number]
      | string,
    index: number,
  ) {
    const ctrlValue = this.searchParamsForm.controls.reviewPeriods
      .at(index)
      .get(controlName)?.value as unknown as string;

    let chosenDate: Date = normalizedMonth;

    if (ctrlValue) {
      chosenDate = setMonth(ctrlValue, getMonth(normalizedMonth));
    }

    this.searchParamsForm.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.setValue(ReviewPeriodDateDirective.format(chosenDate));

    this.searchParamsForm.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.updateValueAndValidity();

    datepicker.close();
  }
}

function searchParamsExistValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const txnSearchParamsCtrl =
    control as typeof TransactionSearchComponent.prototype.searchParamsForm;
  if (
    !txnSearchParamsCtrl.contains('partyKeys') ||
    !txnSearchParamsCtrl.contains('accountNumbers') ||
    !txnSearchParamsCtrl.contains('sourceSystems') ||
    !txnSearchParamsCtrl.contains('productTypes') ||
    !txnSearchParamsCtrl.contains('reviewPeriods')
  ) {
    return { searchParamsExist: false };
  }
  return null;
}

function atleastOneSelectionValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const selectionCtrl =
    control as typeof TransactionSearchComponent.prototype.searchParamsForm.controls.partyKeys;
  if (selectionCtrl.value?.length === 0) return { atleastOneSelection: true };
  return null;
}

// Custom validator for non-overlapping periods
function overlappingReviewPeriodsValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const periodsArray =
    control as typeof TransactionSearchComponent.prototype.searchParamsForm.controls.reviewPeriods;
  const periods = periodsArray.controls
    .map((period, index) => {
      return {
        index,
        start: period.controls.start.value
          ? ReviewPeriodDateDirective.parse(period.controls.start.value)
          : null,
        end: period.controls.end.value
          ? ReviewPeriodDateDirective.parse(period.controls.end.value)
          : null,
      };
    })
    .filter(({ start, end }) => !!start && !!end)
    .map((p) => ({
      ...p,
      start: p.start,
      end: p.end,
    }));

  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const startFromReviewPeriod = periods[i].start!;
      const endFromReviewPeriod = periods[i].end!;

      const startToCheck = periods[j].start!;
      const endToCheck = periods[j].end!;

      if (
        isBefore(startToCheck, startFromReviewPeriod) &&
        !isBefore(endToCheck, startFromReviewPeriod)
      ) {
        return { overlappingReviewPeriods: true };
      }
      if (
        isAfter(endToCheck, endFromReviewPeriod) &&
        !isAfter(startToCheck, endFromReviewPeriod)
      ) {
        return { overlappingReviewPeriods: true };
      }
    }
  }
  return null;
}

export interface RouteExtrasFromSearch {
  searchParams: CaseRecordState['searchParams'];
  searchResult: TransactionSearchResponse;
}

function formatPartyName(party: {
  surname: string;
  givenName: string;
  otherOrInitial: string;
  nameOfEntity: string;
}): string {
  // If entity name exists, use it (for organizations)
  if (party.nameOfEntity?.trim()) {
    return party.nameOfEntity.trim();
  }

  // Otherwise format individual name
  const parts = [
    party.givenName?.trim(),
    party.otherOrInitial?.trim(),
    party.surname?.trim(),
  ].filter(Boolean); // Remove empty/null values

  return parts.join(' ') || 'Unknown';
}
