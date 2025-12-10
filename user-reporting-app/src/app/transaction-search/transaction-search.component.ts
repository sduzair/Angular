import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbar } from '@angular/material/toolbar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  getMonth,
  getYear,
  isAfter,
  isBefore,
  isValid,
  setMonth,
  setYear,
} from 'date-fns';
import { isEqual } from 'lodash-es';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  fromEvent,
  map,
  skip,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import { setError } from '../form-helpers';
import { AccountNumberSelectableTableComponent } from './account-number-selectable-table/account-number-selectable-table.component';
import { AmlPartyService } from './aml-party.service';
import { AmlProductService } from './aml-product.service';
import {
  AccountNumber,
  AmlTransactionSearchService,
  PartyKey,
  SourceSys,
  SourceSysRefreshTime,
} from './aml-transaction-search.service';
import { PartyKeySelectableTableComponent } from './party-key-selectable-table/party-key-selectable-table.component';
import { ProductTypeSelectableTableComponent } from './product-type-selectable-table/product-type-selectable-table.component';
import { ReviewPeriodDateDirective } from './review-period-date.directive';
import { SourceRefreshSelectableTableComponent } from './source-refresh-selectable-table/source-refresh-selectable-table.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AmlSessionService } from '../aml/aml-session.service';

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
            (click)="onTransactionSearch()"
            [disabled]="
              sourceRefreshTimeDataLoadingState ||
              (transactionSearchParamsLoadingState$ | async) ||
              transactionSearchLoading
            ">
            <mat-icon>search</mat-icon>
            Search
          </button>
        </mat-toolbar>

        <form [formGroup]="form" class="search-form">
          <div class="col">
            <div class="row g-3">
              <!-- Search Form Section -->
              <div class="col-12">
                <!-- AML ID Input -->
                <div class="row row-cols-auto flex-row align-items-baseline">
                  <mat-form-field class="col">
                    <mat-label>AML ID</mat-label>
                    <input
                      matInput
                      formControlName="amlId"
                      placeholder="Enter AML ID" />
                    <mat-icon matSuffix>search</mat-icon>
                    @if (form.controls.amlId.hasError('required')) {
                      <mat-error> AML ID is required </mat-error>
                    }
                    @if (form.controls.amlId.hasError('pattern')) {
                      <mat-error> AML ID must be numbers only </mat-error>
                    }
                  </mat-form-field>
                  <button
                    type="button"
                    mat-raised-button
                    class="col search-btn"
                    #amlIdSearchBtn
                    [disabled]="
                      sourceRefreshTimeDataLoadingState ||
                      (transactionSearchParamsLoadingState$ | async) ||
                      !form.controls.amlId.valid ||
                      transactionSearchLoading
                    ">
                    Load
                  </button>
                </div>
              </div>
              <div class="col-12 col-xl-8">
                <!-- Filter Sections -->
                <div class="row g-3">
                  <!-- Parties Filter -->
                  <div class="col-12 col-lg-6 filter-card">
                    <mat-card>
                      <mat-card-header>
                        <mat-card-title>Parties</mat-card-title>
                        <mat-card-subtitle>
                          <div
                            class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                            <div class="mat-mdc-form-field-error-wrapper px-0">
                              <div class="mat-mdc-form-field-bottom-align">
                                @if (
                                  form.controls.partyKeys.hasError(
                                    'atleastOneSelection'
                                  )
                                ) {
                                  <mat-error>
                                    Atleast one selection must exist
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
                          [dataSource]="partyKeysDataSource"
                          [dataSourceLoadingState]="
                            (transactionSearchParamsLoadingState$ | async) ||
                            false
                          "></app-party-key-selectable-table>
                      </mat-card-content>
                    </mat-card>
                  </div>

                  <!-- Accounts Filter -->
                  <div class="col-12 col-lg-6 filter-card">
                    <mat-card>
                      <mat-card-header>
                        <mat-card-title>Accounts / Products</mat-card-title>
                        <mat-card-subtitle>
                          <div
                            class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                            <div class="mat-mdc-form-field-error-wrapper px-0">
                              <div class="mat-mdc-form-field-bottom-align">
                                @if (
                                  form.controls.accountNumbers.hasError(
                                    'atleastOneSelection'
                                  )
                                ) {
                                  <mat-error>
                                    Atleast one selection must exist
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
                          [dataSource]="accountNumbersDataSource"
                          [dataSourceLoadingState]="
                            (transactionSearchParamsLoadingState$ | async) ||
                            false
                          "></app-account-number-selectable-table>
                      </mat-card-content>
                    </mat-card>
                  </div>

                  <!-- Product Types Filter -->
                  <div class="col-12 col-lg-6 filter-card">
                    <mat-card>
                      <mat-card-header>
                        <mat-card-title>Product Types</mat-card-title>
                        <mat-card-subtitle>
                          <div
                            class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                            <div class="mat-mdc-form-field-error-wrapper px-0">
                              <div class="mat-mdc-form-field-bottom-align">
                                @if (
                                  form.controls.productTypes.hasError(
                                    'atleastOneSelection'
                                  )
                                ) {
                                  <mat-error>
                                    Atleast one selection must exist
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
                          [dataSource]="productTypeDataSource"
                          [dataSourceLoadingState]="
                            (transactionSearchParamsLoadingState$ | async) ||
                            false
                          "></app-product-type-selectable-table>
                      </mat-card-content>
                    </mat-card>
                  </div>

                  <!-- Date Range -->
                  <div class="col-12 col-lg-6 filter-card">
                    <mat-card>
                      <mat-card-header>
                        <mat-card-title>
                          <mat-toolbar class="card-toolbar px-0">
                            <span>Review Period</span>
                            <div class="flex-fill"></div>
                            <button
                              type="button"
                              mat-flat-button
                              (click)="addReviewPeriod()"
                              [disabled]="
                                sourceRefreshTimeDataLoadingState ||
                                (transactionSearchParamsLoadingState$
                                  | async) ||
                                isFormDisabled ||
                                transactionSearchLoading
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
                                  form.controls.reviewPeriods.hasError(
                                    'overlappingReviewPeriods'
                                  )
                                ) {
                                  <mat-error>
                                    Review periods must not overlap
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
                              period of form.controls.reviewPeriods.controls;
                              track period;
                              let i = $index
                            ) {
                              <div [formGroupName]="i">
                                <div
                                  class="row review-period-input mt-2 justify-content-evenly"
                                  [class.loading]="
                                    sourceRefreshTimeDataLoadingState ||
                                    (transactionSearchParamsLoadingState$
                                      | async) ||
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
                                      [for]="
                                        startPicker
                                      "></mat-datepicker-toggle>
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
                                        Start month is required
                                      </mat-error>
                                    }
                                    @if (
                                      period.controls.start.hasError(
                                        'startBeforeEndReviewPeriod'
                                      )
                                    ) {
                                      <mat-error>
                                        Start month must be before end month
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
                                        End month is required
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
                                        form.controls.reviewPeriods.controls
                                          .length === 1 ||
                                        isFormDisabled ||
                                        sourceRefreshTimeDataLoadingState ||
                                        (transactionSearchParamsLoadingState$
                                          | async) ||
                                        transactionSearchLoading
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
                    <mat-card-title>System Information</mat-card-title>
                    <mat-card-subtitle>
                      <div
                        class="mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align">
                        <div class="mat-mdc-form-field-error-wrapper px-0">
                          <div class="mat-mdc-form-field-bottom-align">
                            @if (
                              form.controls.sourceSystems.hasError(
                                'atleastOneSelection'
                              )
                            ) {
                              <mat-error>
                                Atleast one selection must exist
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
                      [dataSource]="sourceRefreshTimeDataSource"
                      [dataSourceLoadingState]="
                        sourceRefreshTimeDataLoadingState ||
                        (transactionSearchParamsLoadingState$ | async) ||
                        false
                      "></app-source-refresh-selectable-table>
                  </mat-card-content>
                </mat-card>
              </div>
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
// eslint-disable-next-line rxjs-angular-x/prefer-composition
export class TransactionSearchComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private amlPartyService = inject(AmlPartyService);
  private amlTransactionSearchService = inject(AmlTransactionSearchService);
  private amlSessionService = inject(AmlSessionService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  form = new FormGroup(
    {
      amlId: new FormControl({ value: '', disabled: false }, [
        Validators.required,
        Validators.pattern('^[0-9]+$'),
      ]),
      partyKeys: new FormControl({ value: [] as PartyKey[], disabled: true }, [
        Validators.required,
        this.atleastOneSelectionValidator,
      ]),
      accountNumbers: new FormControl(
        { value: [] as AccountNumber[], disabled: true },
        [Validators.required, this.atleastOneSelectionValidator],
      ),
      sourceSystems: new FormControl(
        { value: [] as SourceSys[], disabled: true },
        [Validators.required, this.atleastOneSelectionValidator],
      ),
      productTypes: new FormControl(
        { value: [] as ProductType[], disabled: true },
        [Validators.required, this.atleastOneSelectionValidator],
      ),
      reviewPeriods: new FormArray(
        [] as FormGroup<{
          start: FormControl<string | null>;
          end: FormControl<string | null>;
        }>[],
        [this.overlappingReviewPeriodsValidator],
      ),
    },
    {
      updateOn: 'change',
      validators: [this.transactionSearchParamsExistValidator],
    },
  );
  readonly maxDate = new Date();

  partyKeysDataSource = new MatTableDataSource<PartyKey>();
  accountNumbersDataSource = new MatTableDataSource<AccountNumber>();
  productTypeDataSource = new MatTableDataSource<ProductType>(
    AmlProductService.getProductInfo().map((prod) => ({
      value: prod.productDescription,
    })),
  );

  sourceRefreshTimeDataSource = new MatTableDataSource<SourceSysRefreshTime>(
    Array.from({ length: 20 }, () => ({
      value: '',
      refresh: '',
      isDisabled: false,
    })),
  );
  sourceRefreshTimeDataLoadingState = true;
  private transactionSearchParamsLoadingStateSubject =
    new BehaviorSubject<boolean>(false);
  public transactionSearchParamsLoadingState$ =
    this.transactionSearchParamsLoadingStateSubject.asObservable();
  private destroyRef = inject(DestroyRef);

  @ViewChild(FormGroupDirective)
  private formDif!: FormGroupDirective;

  // Needed due to known caveat when emitEvent false: controls emitting regardless https://github.com/angular/components/issues/20218
  private suppressTransactionSearchParamsAutosave = false;

  ngOnInit(): void {
    this.amlTransactionSearchService
      .fetchSourceRefreshTime()
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe((res) => {
        this.sourceRefreshTimeDataSource.data = res;
        this.sourceRefreshTimeDataLoadingState = false;
      });

    this.form.valueChanges
      .pipe(
        startWith(this.form.value),
        // only save when we have an amlId
        filter(() => !!this.form.value.amlId?.toString().trim()),
        distinctUntilChanged(({ amlId: _a, ...prev }, { amlId: _b, ...next }) =>
          isEqual(prev, next),
        ),
        // ignore initial emission due to setup of distinctuntilchanged
        skip(1),
        // prevent emission on programmatic patch
        filter(() => !this.suppressTransactionSearchParamsAutosave),
        tap(() => console.log('for changed')),
        debounceTime(2000),
        switchMap(
          ({
            partyKeys,
            accountNumbers,
            sourceSystems,
            productTypes,
            reviewPeriods,
          }) => {
            return this.amlSessionService.updateSession(
              String(this.form.value.amlId),
              {
                partyKeysSelection: partyKeys?.map((p) => p.value),
                accountNumbersSelection: accountNumbers?.map((a) => a.value),
                sourceSystemsSelection: sourceSystems?.map((s) => s.value),
                productTypesSelection: productTypes?.map((p) => p.value),
                reviewPeriodSelection: reviewPeriods,
              },
            );
          },
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe();

    this.form.controls.amlId.valueChanges
      .pipe(
        filter(() => !this.suppressTransactionSearchParamsAutosave),
        tap((amlIdValue) => {
          this.suppressTransactionSearchParamsAutosave = true;
          this.formDif.resetForm({ amlId: amlIdValue });
          this.form.controls.partyKeys.disable({ emitEvent: false });
          this.form.controls.accountNumbers.disable({ emitEvent: false });
          this.form.controls.sourceSystems.disable({ emitEvent: false });
          this.form.controls.productTypes.disable({ emitEvent: false });
          this.form.controls.reviewPeriods.disable({ emitEvent: false });
          queueMicrotask(() => {
            this.suppressTransactionSearchParamsAutosave = false;
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe();
  }
  get isFormDisabled() {
    return (
      // review periods unlike others is a form array and may not have form controls with disabled state
      (this.form.controls.partyKeys.disabled &&
        this.form.controls.accountNumbers.disabled &&
        this.form.controls.sourceSystems.disabled &&
        this.form.controls.productTypes.disabled &&
        this.form.controls.reviewPeriods.disabled) ||
      this.form.controls.reviewPeriods.length === 0
    );
  }
  @ViewChild('amlIdSearchBtn', { read: ElementRef })
  amlIdSearchBtn!: ElementRef<HTMLButtonElement>;
  ngAfterViewInit(): void {
    fromEvent(this.amlIdSearchBtn.nativeElement, 'click')
      .pipe(
        map(() => this.form.value.amlId?.trim()),
        filter((amlId) => !!amlId),
        tap(() => {
          this.transactionSearchParamsLoadingStateSubject.next(true);
          // empty values for ui skeleton
          this.accountNumbersDataSource.data = Array.from(
            { length: 5 },
            () => ({
              value: '',
            }),
          );
          this.partyKeysDataSource.data = Array.from({ length: 5 }, () => ({
            value: '',
          }));
          this.form.controls.reviewPeriods.clear();
          Array.from({ length: 2 }, () => ({})).forEach((_) => {
            this.form.controls.reviewPeriods.push(
              this.createReviewPeriodGroup(),
              { emitEvent: false },
            );
          });
        }),
        switchMap((amlId) =>
          combineLatest([
            this.amlPartyService.getPartyAccountInfoByAmlId(amlId!),
            this.amlSessionService.getSession(amlId!),
          ]).pipe(
            tap(
              ([
                { partyKeys },
                {
                  data: {
                    transactionSearchParams: {
                      partyKeysSelection,
                      accountNumbersSelection,
                      sourceSystemsSelection,
                      productTypesSelection,
                      reviewPeriodSelection,
                    },
                  },
                },
              ]) => {
                this.partyKeysDataSource.data = partyKeys.map((p) => ({
                  value: p.partyKey,
                }));
                this.accountNumbersDataSource.data = partyKeys
                  .flatMap((p) => p.accountModels)
                  .map((accountModel) => ({
                    value: accountModel.accountTransit
                      ? `${accountModel.accountTransit} / ${accountModel.accountNumber}`
                      : `${accountModel.accountNumber}`,
                  }));

                // Patch only after options are set
                this.suppressTransactionSearchParamsAutosave = true;
                this.form.enable({ emitEvent: false });
                this.form.controls.reviewPeriods.clear({ emitEvent: false });
                (reviewPeriodSelection ?? []).forEach((period) => {
                  this.form.controls.reviewPeriods.push(
                    this.createReviewPeriodGroup(
                      period.start ?? null,
                      period.end ?? null,
                    ),
                    { emitEvent: false },
                  );
                });
                this.form.patchValue(
                  {
                    amlId: amlId,
                    partyKeys: (partyKeysSelection ?? []).map((p) => ({
                      value: p,
                    })),
                    accountNumbers: (accountNumbersSelection ?? []).map(
                      (a) => ({ value: a }),
                    ),
                    sourceSystems: (sourceSystemsSelection ?? []).map((s) => ({
                      value: s,
                    })),
                    productTypes: (productTypesSelection ?? []).map((p) => ({
                      value: p,
                    })),
                  },
                  { emitEvent: false },
                );
                queueMicrotask(() => {
                  this.suppressTransactionSearchParamsAutosave = false;
                });
              },
            ),
            finalize(() => {
              this.transactionSearchParamsLoadingStateSubject.next(false);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe();
  }

  // todo: implement loading state in view
  transactionSearchLoading!: boolean;
  onTransactionSearch() {
    if (this.form.invalid) {
      this.snackBar.open(
        'Please make sure all transaction search inputs are valid before searching',
        'Dismiss',
        {
          duration: 5000,
        },
      );
      return;
    }
    console.log(
      '🚀 ~ TransactionSearchComponent ~ onLoad ~ this.form.value:',
      this.form.value,
    );

    this.router.navigate(['/aml', 'AML-1234', 'transaction-view']);
  }

  transactionSearchParamsExistValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const txnSearchParamsCtrl = control as typeof this.form;
    if (
      !txnSearchParamsCtrl.contains('partyKeys') ||
      !txnSearchParamsCtrl.contains('accountNumbers') ||
      !txnSearchParamsCtrl.contains('sourceSystems') ||
      !txnSearchParamsCtrl.contains('productTypes') ||
      !txnSearchParamsCtrl.contains('reviewPeriods')
    ) {
      return { transactionSearchParamsExist: false };
    }
    return null;
  }

  atleastOneSelectionValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const selectionCtrl = control as typeof this.form.controls.partyKeys;
    if (selectionCtrl.value?.length === 0) return { atleastOneSelection: true };
    return null;
  }

  // Custom validator for non-overlapping periods
  overlappingReviewPeriodsValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const periodsArray = control as typeof this.form.controls.reviewPeriods;
    const periods = periodsArray.controls
      .map((period, index) => ({
        index,

        start: ReviewPeriodDateDirective.parse(
          period.controls.start.value ?? '',
        ),

        end: ReviewPeriodDateDirective.parse(period.controls.end.value ?? ''),
      }))
      .filter((p) => isValid(p.start) && isValid(p.end))
      .map((p) => ({
        ...p,
        start: p.start,
        end: p.end,
      }));

    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const startFromReviewPeriod = periods[i].start;
        const endFromReviewPeriod = periods[i].end;

        const startToCheck = periods[j].start;
        const endToCheck = periods[j].end;

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

  // Create a new review period FormGroup
  createReviewPeriodGroup(
    start: (typeof this.form.controls.reviewPeriods.controls)[number]['controls']['start']['value'] = null,
    end: (typeof this.form.controls.reviewPeriods.controls)[number]['controls']['end']['value'] = null,
  ): (typeof this.form.controls.reviewPeriods.controls)[number] {
    return new FormGroup(
      {
        start: new FormControl(start, Validators.required),
        end: new FormControl(end, Validators.required),
      },
      [this.startBeforeEndReviewPeriodValidator],
    );
  }

  // Validator for individual date range
  startBeforeEndReviewPeriodValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const startControl = (
      control as (typeof this.form.controls.reviewPeriods.controls)[number]
    ).controls.start;
    const start = ReviewPeriodDateDirective.parse(startControl.value ?? '');

    const endControl = (
      control as (typeof this.form.controls.reviewPeriods.controls)[number]
    ).controls.end;
    const end = ReviewPeriodDateDirective.parse(endControl.value ?? '');

    if (!isValid(start) || !isValid(end)) {
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
    this.form.controls.reviewPeriods.push(this.createReviewPeriodGroup());
  }

  // Remove review period
  removeReviewPeriod(index: number) {
    if (this.form.controls.reviewPeriods.length > 1) {
      this.form.controls.reviewPeriods.removeAt(index);
    }
  }

  // Month/year selection handlers
  chosenYearHandler(
    normalizedYear: Date,
    _: MatDatepicker<Date>,
    controlName:
      | keyof (typeof this.form.controls.reviewPeriods.controls)[number]
      | string,
    index: number,
  ) {
    const ctrlValue = this.form.controls.reviewPeriods
      .at(index)
      .get(controlName)?.value as unknown as Date;

    this.form.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.setValue(
        ReviewPeriodDateDirective.format(
          setYear(ctrlValue, getYear(normalizedYear)),
        ),
      );
    this.form.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.updateValueAndValidity();
  }

  chosenMonthHandler(
    normalizedMonth: Date,
    datepicker: MatDatepicker<Date>,
    controlName:
      | keyof (typeof this.form.controls.reviewPeriods.controls)[number]
      | string,
    index: number,
  ) {
    const ctrlValue = this.form.controls.reviewPeriods
      .at(index)
      .get(controlName)?.value as unknown as Date;

    this.form.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.setValue(
        ReviewPeriodDateDirective.format(
          setMonth(ctrlValue, getMonth(normalizedMonth)),
        ),
      );

    this.form.controls.reviewPeriods
      .at(index)
      .get(controlName)
      ?.updateValueAndValidity();

    datepicker.close();
  }
}

export interface ProductType {
  value: string;
}
