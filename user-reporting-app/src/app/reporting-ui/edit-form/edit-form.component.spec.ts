import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  ANIMATION_MODULE_TYPE,
  ChangeDetectionStrategy,
  Component,
  ErrorHandler,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  MAT_DATE_FNS_FORMATS,
  provideDateFnsAdapter,
} from '@angular/material-date-fns-adapter';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerInputHarness } from '@angular/material/datepicker/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import {
  provideRouter,
  RedirectCommand,
  Router,
  withComponentInputBinding,
  withNavigationErrorHandler,
  withRouterConfig,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHashbrown } from '@hashbrownai/angular';
import { enCA } from 'date-fns/locale';
import { of } from 'rxjs';
import { CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE } from '../../aml/case-record.state.fixture';
import {
  CASE_RECORD_INITIAL_STATE,
  CaseRecordState,
  CaseRecordStore,
} from '../../aml/case-record.store';
import { TEST_USER_ADMIN } from '../../auth.fixture';
import {
  AuthService,
  hasRoleGuard,
  isAuthenticatedGuard,
} from '../../auth.service';
import { createAuthServiceSpy } from '../../auth.service.spec';
import { LoginComponent } from '../../login/login.component';
import { activateTabs, findEl } from '../../test-helpers';
import { WithCaseRecordId } from '../../transaction-view/selections.service';
import { PartyGenType } from '../../transaction-view/transform-to-str-transaction/party-gen.service';
import { AppErrorHandlerService } from './../../app-error-handler.service';
import { NavLayoutComponent } from './../../nav-layout/nav-layout.component';
import {
  auditResolver,
  bulkEditTypeResolver,
  EditFormComponent,
  singleEditTypeResolver,
  StrTxnEditForm,
} from './edit-form.component';
import { FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE } from './form-options.fixture';
import { FormOptionsService } from './form-options.service';
import { TransactionTimeDirective } from './transaction-time.directive';

@Component({
  selector: 'app-transaction-search',
  template: '<h1>Transaction Search</h1>',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class MockTransactionSearchComponent {}

describe('EditFormComponent', () => {
  async function setup() {
    const formOptionsServiceSpy = jasmine.createSpyObj(
      'FormOptionsService',
      [],
      {
        formOptions$: of(FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE),
      },
    );
    const authServiceSpy = createAuthServiceSpy();
    const errorHandlerSpy = jasmine.createSpyObj<AppErrorHandlerService>(
      'AppErrorHandlerService',
      ['handleError'],
    );

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideBrowserGlobalErrorListeners(),
        // note: routing specific to test
        provideRouter(
          [
            {
              path: 'login',
              component: LoginComponent,
              title: 'Login',
            },
            {
              path: '',
              loadComponent: () =>
                import('./../../nav-layout/nav-layout.component').then(
                  (m) => m.NavLayoutComponent,
                ),
              canActivate: [isAuthenticatedGuard],
              children: [
                {
                  path: '',
                  redirectTo: 'transactionsearch',
                  pathMatch: 'full',
                },
                {
                  path: 'transactionsearch',
                  loadComponent: () =>
                    Promise.resolve(MockTransactionSearchComponent),
                  title: 'Search by AML Id',
                },
                {
                  path: 'aml/:amlId',
                  loadComponent: () =>
                    import('./../../aml/aml.component').then(
                      (m) => m.AmlComponent,
                    ),
                  providers: [
                    {
                      provide: CASE_RECORD_INITIAL_STATE,
                      useValue: CASE_RECORD_STATE_FIXTURE,
                    },
                    CaseRecordStore,
                    provideHashbrown({}),
                  ],
                  data: { reuse: true },
                  children: [
                    {
                      path: 'reporting-ui',
                      title: () => 'Reporting UI',
                      children: [
                        {
                          path: 'edit-form/bulk-edit',
                          component: EditFormComponent,
                          resolve: {
                            editType: bulkEditTypeResolver,
                          },
                          data: { reuse: false },
                          title: () => 'Bulk Edit',
                        },
                        {
                          path: 'edit-form/:transactionId',
                          component: EditFormComponent,
                          resolve: {
                            editType: singleEditTypeResolver,
                          },
                          data: { reuse: false },
                          title: (route) =>
                            `Edit - ${route.params['transactionId']}`,
                        },
                        {
                          path: 'audit/:transactionId',
                          component: EditFormComponent,
                          canActivate: [hasRoleGuard('Admin')],
                          resolve: {
                            editType: auditResolver,
                          },
                          data: { reuse: false },
                          title: (route) =>
                            `Audit - ${route.params['transactionId']}`,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          withComponentInputBinding(),
          withRouterConfig({ paramsInheritanceStrategy: 'always' }),
          withNavigationErrorHandler((navError) => {
            // console.error('Navigation error:', navError.error);
            inject(ErrorHandler).handleError(navError.error);
            return new RedirectCommand(
              inject(Router).parseUrl('/transactionsearch'),
            );
          }),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        // note needed as mat date input harness reads displayed value instead of form model value
        provideDateFnsAdapter({
          ...MAT_DATE_FNS_FORMATS,
          display: { ...MAT_DATE_FNS_FORMATS.display, dateInput: 'yyyy/MM/dd' },
        }),
        { provide: MAT_DATE_LOCALE, useValue: enCA },
        { provide: ErrorHandler, useValue: errorHandlerSpy },
        // note disables animations to prevent scenario of making assertions before animations complete
        { provide: ANIMATION_MODULE_TYPE, useValue: 'NoopAnimations' },
        { provide: FormOptionsService, useValue: formOptionsServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    const harness = await RouterTestingHarness.create();
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);
    // todo: add edit form save tests that invoke http requests
    const httpTesting = TestBed.inject(HttpTestingController);
    return {
      harness,
      loader,
      httpTesting,
      formOptionsServiceSpy,
      authServiceSpy,
      errorHandlerSpy,
    };
  }

  describe('navigate to edit form component for SINGLE_SAVE', () => {
    it('should redirect from single edit form to login page when user not logged in', async () => {
      const { harness, authServiceSpy } = await setup();
      const router = TestBed.inject(Router);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testSignal = (authServiceSpy as any)._testSignal;
      testSignal.set(null);

      await harness.navigateByUrl(
        `aml/99999999/reporting-ui/edit-form/${TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE.reportingEntityTxnRefNo}`,
        LoginComponent,
      );

      expect(router.url).toBe('/login');
    });

    it('should redirect from single edit form to transaction search when ID is invalid', async () => {
      const { harness, errorHandlerSpy } = await setup();
      const { fixture } = harness;
      const router = TestBed.inject(Router);

      await harness.navigateByUrl(
        'aml/99999999/reporting-ui/edit-form/asdfasdf',
      );

      await fixture.whenStable();

      expect(router.url).toBe('/transactionsearch');
      expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
        jasmine.any(Error),
      );
    });

    async function setupAndNavigate() {
      const { harness, loader, formOptionsServiceSpy } = await setup();
      await harness.navigateByUrl(
        `aml/99999999/reporting-ui/edit-form/${TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE.reportingEntityTxnRefNo}`,
        NavLayoutComponent,
      );

      return { harness, loader, formOptionsServiceSpy };
    }

    it('should create form template', async () => {
      const {
        harness: { fixture },
      } = await setupAndNavigate();

      expect(findEl(fixture, 'edit-form')).toBeTruthy();
    });

    it('should create an input field', async () => {
      const { loader } = await setupAndNavigate();

      const { control, field } = await getMatField(loader, 'dateOfTxn');

      expect(control).toBeTruthy();

      const actualValue = await control!.getValue();
      const expectedValue = '2024/09/25';

      expect(actualValue).toBe(expectedValue);

      const isValid = await field!.isControlValid();

      expect(isValid).toBe(true);
    });

    it('should populate form options in select fields', async () => {
      const { loader, formOptionsServiceSpy } = await setupAndNavigate();

      const { control } = await getMatField(
        loader,
        'methodOfTxn' as SelectField,
      );

      await control.open();
      const options = await control.getOptions();

      const expectedOptions = Object.keys(
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE.methodOfTxn,
      );

      expect(options.length).toBe(expectedOptions.length);
      const optionTexts = await Promise.all(
        options.map((option) => option.getText()),
      );

      expect(optionTexts).toEqual(expectedOptions);

      // Verify the formOptions$ property getter was called
      const formOptionsGetter = Object.getOwnPropertyDescriptor(
        formOptionsServiceSpy,
        'formOptions$',
      )!.get;

      expect(formOptionsGetter).toHaveBeenCalledWith();
    });

    it('should verify all form fields populate correctly', async () => {
      const { loader } = await setupAndNavigate();

      const { verify } = await createFieldTraverser(
        loader,
        async (
          testId: string,
          expectedValue: unknown,
          loader: HarnessLoader,
        ) => {
          const errors = [] as string[];
          if (isIgnoredField(testId)) {
            return errors;
          }

          if (isInputField(testId)) {
            const { control } = await getMatField(loader, testId);
            const actualValue = await control.getValue();
            const expectedValueNormalized = String(expectedValue ?? '');
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isSelectField(testId)) {
            const { control } = await getMatField(
              loader,
              testId as SelectField,
            );
            const actualValue = await control.getValueText();
            const expectedValueNormalized = String(expectedValue ?? '');
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isDateField(testId)) {
            const { control } = await getMatField(loader, testId as DateField);
            const actualValue = await control.getValue();
            const expectedValueNormalized = String(expectedValue ?? '');
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isCheckBox(testId)) {
            const { control } = await getMatField(
              loader,
              testId as CheckboxField,
            );
            const actualValue = await control.isChecked();
            const expectedValueNormalized = Boolean(expectedValue);
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isTimeField(testId)) {
            const { control } = await getMatField(loader, testId);
            const actualValue = await control.getValue();
            const expectedValueNormalized = String(
              TransactionTimeDirective.parseAndFormatTime(expectedValue) ?? '',
            );
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (
            !isInputField(testId) &&
            !isSelectField(testId) &&
            !isDateField(testId) &&
            !isCheckBox(testId) &&
            !isTimeField(testId)
          ) {
            throw new Error('unkonwn test id');
          }

          return errors;
        },
      );

      await activateTabs(loader);

      const errors = await verify(TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE);

      expect(errors.length).toBe(0);
      if (errors.length > 0) {
        throw new Error(`Form verification failed:\n${errors.join('\n')}`);
      }
    });

    it('should verify no extra form fields were created', async () => {
      const { loader } = await setupAndNavigate();

      const { verify, expectedTestIds } = await createFieldTraverser(
        loader,
        async (
          testId: string,
          expectedValue: unknown,
          loader: HarnessLoader,
        ) => {
          const errors = [] as string[];
          if (isInputField(testId)) {
            const { control } = await getMatField(loader, testId);
            const actualValue = await control.getValue();
            const expectedValueNormalized = String(expectedValue ?? '');
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isSelectField(testId)) {
            const { control } = await getMatField(
              loader,
              testId as SelectField,
            );
            const actualValue = await control.getValueText();
            const expectedValueNormalized = String(expectedValue ?? '');
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isDateField(testId)) {
            const { control } = await getMatField(loader, testId as DateField);
            const actualValue = await control.getValue();
            const expectedValueNormalized = String(expectedValue ?? '');
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isCheckBox(testId)) {
            const { control } = await getMatField(
              loader,
              testId as CheckboxField,
            );
            const actualValue = await control.isChecked();
            const expectedValueNormalized = Boolean(expectedValue);
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (isTimeField(testId)) {
            const { control } = await getMatField(loader, testId);
            const actualValue = await control.getValue();
            const expectedValueNormalized = String(
              TransactionTimeDirective.parseAndFormatTime(expectedValue) ?? '',
            );
            if (actualValue !== expectedValueNormalized) {
              errors.push(
                `${testId}: Expected "${expectedValueNormalized}", got "${actualValue}"`,
              );
            }
          }

          if (
            !isInputField(testId) &&
            !isSelectField(testId) &&
            !isDateField(testId) &&
            !isCheckBox(testId) &&
            !isTimeField(testId)
          ) {
            throw new Error('unkonwn test id');
          }

          return errors;
        },
      );

      await activateTabs(loader);

      await verify(TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE);

      const allFormFields = await loader.getAllHarnesses(MatFormFieldHarness);
      const allCheckboxes = await loader.getAllHarnesses(MatCheckboxHarness);

      const unexpectedFields: string[] = [];

      for (const field of allFormFields) {
        const host = await field.host();
        const testId = await host.getAttribute(TEST_ATTRUBUTE);
        if (testId && !expectedTestIds.has(testId)) {
          unexpectedFields.push(testId);
        }
      }

      for (const checkbox of allCheckboxes) {
        const host = await checkbox.host();
        const testId = await host.getAttribute(TEST_ATTRUBUTE);
        if (testId && !expectedTestIds.has(testId)) {
          unexpectedFields.push(testId);
        }
      }

      expect(unexpectedFields).toEqual([]);
      if (unexpectedFields.length > 0) {
        throw new Error(
          `Unexpected fields found: ${unexpectedFields.join(', ')}`,
        );
      }
    });

    it('should verify atleast one starting action or completing action always exist for single edit form', async () => {
      const { loader } = await setupAndNavigate();
      await activateTabs(loader);

      const actionRemoveBtnTestIds = [
        'startingActions-0-remove',
        'completingActions-0-remove',
      ];

      for (const btnTestId of actionRemoveBtnTestIds) {
        const button = await loader.getHarness(
          MatButtonHarness.with({
            selector: getTestIdSelector(btnTestId),
          }),
        );

        expect(button).toBeDefined();
        button.click();

        const expectedFieldTestId = btnTestId
          .replace(/-remove/i, '')
          .concat('-amount');

        const field = await loader.getHarnessOrNull(
          MatFormFieldHarness.with({
            selector: getTestIdSelector(expectedFieldTestId),
          }),
        );

        expect(!!field).toBe(true);
      }
    });
  });

  describe('navigate to edit form component for BULK_SAVE', () => {
    it('should redirect from bulk edit form to login page when user not logged in', async () => {
      const { harness, authServiceSpy } = await setup();
      const router = TestBed.inject(Router);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testSignal = (authServiceSpy as any)._testSignal;
      testSignal.set(null);

      await harness.navigateByUrl(
        'aml/99999999/reporting-ui/edit-form/bulk-edit',
        LoginComponent,
      );

      expect(router.url).toBe('/login');
    });

    it('should redirect from bulk edit form to transaction search when route extras are missing', async () => {
      const { harness, errorHandlerSpy } = await setup();
      const router = TestBed.inject(Router);

      await harness.navigateByUrl(
        'aml/99999999/reporting-ui/edit-form/bulk-edit',
      );
      const { fixture } = harness;

      await fixture.whenStable();

      expect(router.url).toBe('/transactionsearch');
      expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
        jasmine.any(Error),
      );
    });

    async function setupAndNavigate() {
      const { harness, loader } = await setup();
      const router = TestBed.inject(Router);
      await router.navigateByUrl(
        'aml/99999999/reporting-ui/edit-form/bulk-edit',
        {
          state: {
            selectedTransactionsForBulkEdit: [
              TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE.reportingEntityTxnRefNo,
            ],
          },
        },
      );

      return { harness, loader };
    }

    it('should verify atleast one starting action and completing action are created', async () => {
      const { loader } = await setupAndNavigate();

      const { verify } = await createFieldTraverser(
        loader,
        async (
          testId: string,
          expectedValue: unknown,
          loader: HarnessLoader,
        ) => {
          const errors = [] as string[];

          let fieldPromise: Promise<unknown>;

          if (isInputField(testId)) {
            fieldPromise = getMatField(loader, testId);
          } else if (isSelectField(testId)) {
            fieldPromise = getMatField(loader, testId as SelectField);
          } else if (isDateField(testId)) {
            fieldPromise = getMatField(loader, testId as DateField);
          } else if (isCheckBox(testId)) {
            fieldPromise = getMatField(loader, testId as CheckboxField);
          } else if (isTimeField(testId)) {
            fieldPromise = getMatField(loader, testId);
          } else {
            throw new Error(`Unknown test id: ${testId}`);
          }

          await expectAsync(fieldPromise).toBeResolved();

          return errors;
        },
      );

      await activateTabs(loader);

      // the form object structure includes one sa and ca
      await expectAsync(
        verify(TRANSACTION_BULK_SAVE_FORM_SRUCTURE),
      ).toBeResolved();
    });

    it('should verify all form fields are disabled for audit form', async () => {
      const { loader } = await setupAndNavigate();

      const { verify } = await createFieldTraverser(
        loader,
        async (
          testId: string,
          expectedValue: unknown,
          loader: HarnessLoader,
        ) => {
          const errors = [] as string[];

          if (isInputField(testId)) {
            const { control } = await getMatField(loader, testId);
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isSelectField(testId)) {
            const { control } = await getMatField(
              loader,
              testId as SelectField,
            );
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isDateField(testId)) {
            const { control } = await getMatField(loader, testId as DateField);
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isCheckBox(testId)) {
            const { control } = await getMatField(
              loader,
              testId as CheckboxField,
            );
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isTimeField(testId)) {
            const { control } = await getMatField(loader, testId);
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (
            !isInputField(testId) &&
            !isSelectField(testId) &&
            !isDateField(testId) &&
            !isCheckBox(testId) &&
            !isTimeField(testId)
          ) {
            throw new Error('unknown test id');
          }

          return errors;
        },
      );

      await activateTabs(loader);

      const errors = await verify(TRANSACTION_BULK_SAVE_FORM_SRUCTURE);

      expect(errors.length).toBe(0);
      if (errors.length > 0) {
        throw new Error(`Form verification failed:\n${errors.join('\n')}`);
      }
    });

    it('should verify add buttons startingActions-add, completingActions-add are enabled', async () => {
      const { loader } = await setupAndNavigate();
      await activateTabs(loader);

      const actionAddBtnTestIds = [
        'startingActions-add',
        'completingActions-add',
      ];

      for (const btnTestId of actionAddBtnTestIds) {
        const button = await loader.getHarness(
          MatButtonHarness.with({
            selector: getTestIdSelector(btnTestId),
          }),
        );

        expect(button).toBeDefined();
        button.click();

        const expectedFieldTestId = btnTestId
          .replace(/-add$/i, '')
          .concat('-1-amount');

        const field = await loader.getHarnessOrNull(
          MatFormFieldHarness.with({
            selector: getTestIdSelector(expectedFieldTestId),
          }),
        );

        expect(!!field).toBe(true);
      }
    });

    it('should verify all add buttons except startingActions-add, completingActions-add are initially disabled', async () => {
      const { loader } = await setupAndNavigate();
      await activateTabs(loader);

      const buttonTestData: {
        addButtonTestId: string;
        expectedMissingFieldTestId: string;
      }[] = [
        {
          addButtonTestId: 'startingActions-0-accountHolders-add',
          expectedMissingFieldTestId:
            'startingActions-0-accountHolders-1-_hiddenPartyKey',
        },
        {
          addButtonTestId: 'startingActions-0-sourceOfFunds-add',
          expectedMissingFieldTestId:
            'startingActions-0-sourceOfFunds-1-_hiddenPartyKey',
        },
        {
          addButtonTestId: 'startingActions-0-conductors-add',
          expectedMissingFieldTestId:
            'startingActions-0-conductors-1-_hiddenPartyKey',
        },
        // note: no on befalf of fields intially due
        {
          addButtonTestId: 'startingActions-0-conductors-0-onBehalfOf-add',
          expectedMissingFieldTestId:
            'startingActions-0-conductors-0-onBehalfOf-0-_hiddenPartyKey',
        },
        {
          addButtonTestId: 'completingActions-0-accountHolders-add',
          expectedMissingFieldTestId:
            'completingActions-0-accountHolders-1-_hiddenPartyKey',
        },
        {
          addButtonTestId: 'completingActions-0-involvedIn-add',
          expectedMissingFieldTestId:
            'completingActions-0-involvedIn-1-_hiddenPartyKey',
        },
        {
          addButtonTestId: 'completingActions-0-beneficiaries-add',
          expectedMissingFieldTestId:
            'completingActions-0-beneficiaries-1-_hiddenPartyKey',
        },
      ];

      for (const {
        addButtonTestId,
        expectedMissingFieldTestId,
      } of buttonTestData) {
        const button = await loader.getHarness(
          MatButtonHarness.with({
            selector: getTestIdSelector(addButtonTestId),
          }),
        );

        expect(button).toBeDefined();
        await button.click();

        // Verify the expected field does NOT exist
        const field = await loader.getHarnessOrNull(
          MatFormFieldHarness.with({
            selector: getTestIdSelector(expectedMissingFieldTestId),
          }),
        );

        expect(field).toBeNull();
      }
    });

    it('should verify all remove buttons are initially disabled', async () => {
      const getButtonTestIds = (obj: Record<string, unknown>, path = '') => {
        const results = [] as string[];

        for (const [key, val] of Object.entries(obj)) {
          if (!Array.isArray(val) || val.length === 0) continue;

          const removeButtonTestIds = val.map(
            (item, index) => `${path}${key}-${index}-remove`,
          );

          results.push(...removeButtonTestIds);

          // Recursively process nested arrays
          for (let i = 0; i < val.length; i++) {
            const nestedResults = getButtonTestIds(
              val[i] as Record<string, unknown>,
              `${path}${key}-${i}-`,
            );
            results.push(...nestedResults);
          }
        }

        return results;
      };

      const { loader } = await setupAndNavigate();
      await activateTabs(loader);

      const removeBtnTestIds = getButtonTestIds(
        TRANSACTION_BULK_SAVE_FORM_SRUCTURE,
      );

      for (const btnTestId of removeBtnTestIds) {
        const button = await loader.getHarness(
          MatButtonHarness.with({
            selector: getTestIdSelector(btnTestId),
          }),
        );

        expect(button).toBeDefined();
        await button.click();

        // note: the buttons are left enabled in DOM but programmatically disabled
        // Verify the button is disabled
        // const isDisabled = await button.isDisabled();
        // expect(isDisabled).toBe(true);
      }

      // Verify all buttons still exist
      const finalButtons = await Promise.all(
        removeBtnTestIds.map((testId) =>
          loader.getHarnessOrNull(
            MatButtonHarness.with({
              selector: getTestIdSelector(testId),
            }),
          ),
        ),
      );

      expect(finalButtons.filter(Boolean).length).toBe(removeBtnTestIds.length);
    });

    it('should verify atleast one starting action or completing action always exist for bulk edit form', async () => {
      const { loader } = await setupAndNavigate();
      await activateTabs(loader);

      const removeBtnTestIds = [
        'startingActions-0-remove',
        'completingActions-0-remove',
      ];

      for (const removeBtnTestId of removeBtnTestIds) {
        const button = await loader.getHarness(
          MatButtonHarness.with({
            selector: getTestIdSelector(removeBtnTestId),
          }),
        );

        expect(button).toBeDefined();
        button.click();

        const expectedFieldTestId = removeBtnTestId
          .replace(/-remove/i, '')
          .concat('-amount');

        const field = await loader.getHarnessOrNull(
          MatFormFieldHarness.with({
            selector: getTestIdSelector(expectedFieldTestId),
          }),
        );

        expect(!!field).toBe(true);
      }
    });
  });

  describe('navigate to audit form component for AUDIT_REQUEST', () => {
    it('should redirect from audit form to login page when user not logged in', async () => {
      const { harness, authServiceSpy } = await setup();
      const router = TestBed.inject(Router);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testSignal = (authServiceSpy as any)._testSignal;
      testSignal.set(null);

      await harness.navigateByUrl(
        `aml/99999999/reporting-ui/audit/${TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE.reportingEntityTxnRefNo}`,
        LoginComponent,
      );

      expect(router.url).toBe('/login');
    });

    it('should redirect to transaction search when user does not have Admin role', async () => {
      const { harness } = await setup();
      const router = TestBed.inject(Router);

      await harness.navigateByUrl(
        `aml/99999999/reporting-ui/audit/${TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE.reportingEntityTxnRefNo}`,
        NavLayoutComponent,
      );

      expect(router.url).toBe('/transactionsearch');
    });

    it('should redirect to transaction search when ID is invalid', async () => {
      const { harness, authServiceSpy, errorHandlerSpy } = await setup();
      const router = TestBed.inject(Router);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testSignal = (authServiceSpy as any)._testSignal;
      testSignal.set(TEST_USER_ADMIN);

      await harness.navigateByUrl('aml/99999999/reporting-ui/audit/asdfasdf');

      const { fixture } = harness;

      await fixture.whenStable();

      expect(router.url).toBe('/transactionsearch');
      expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
        jasmine.any(Error),
      );
    });

    async function setupAndNavigate() {
      const { harness, loader, formOptionsServiceSpy, authServiceSpy } =
        await setup();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const testSignal = (authServiceSpy as any)._testSignal;
      testSignal.set(TEST_USER_ADMIN);

      await harness.navigateByUrl(
        `aml/99999999/reporting-ui/audit/${TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE.reportingEntityTxnRefNo}`,
        NavLayoutComponent,
      );

      return { harness, loader, formOptionsServiceSpy };
    }

    it('should verify all form fields are initially disabled', async () => {
      const { loader } = await setupAndNavigate();

      const { verify } = await createFieldTraverser(
        loader,
        async (
          testId: string,
          expectedValue: unknown,
          loader: HarnessLoader,
        ) => {
          const errors = [] as string[];

          if (isInputField(testId)) {
            const { control } = await getMatField(loader, testId);
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isSelectField(testId)) {
            const { control } = await getMatField(
              loader,
              testId as SelectField,
            );
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isDateField(testId)) {
            const { control } = await getMatField(loader, testId as DateField);
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isCheckBox(testId)) {
            const { control } = await getMatField(
              loader,
              testId as CheckboxField,
            );
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (isTimeField(testId)) {
            const { control } = await getMatField(loader, testId);
            const isDisabled = await control.isDisabled();
            if (!isDisabled) {
              errors.push(
                `${testId}: Expected field to be disabled, but it was enabled`,
              );
            }
          }

          if (
            !isInputField(testId) &&
            !isSelectField(testId) &&
            !isDateField(testId) &&
            !isCheckBox(testId) &&
            !isTimeField(testId)
          ) {
            throw new Error('unknown test id');
          }

          return errors;
        },
      );

      await activateTabs(loader);

      const errors = await verify(TRANSACTION_BULK_SAVE_FORM_SRUCTURE);

      expect(errors.length).toBe(0);
      if (errors.length > 0) {
        throw new Error(`Form verification failed:\n${errors.join('\n')}`);
      }
    });

    it('should verify all add buttons are disabled', async () => {
      const getButtonTestIds = (obj: Record<string, unknown>, path = '') => {
        const results: {
          addButtonTestId: string;
          expectedMissingFieldTestId: string;
        }[] = [];

        for (const [key, val] of Object.entries(obj)) {
          if (!Array.isArray(val) || val.length === 0) continue;

          const addButtonTestId = `${path}${key}-add`;

          // Determine the field name from the first array element
          const firstItem = val[0] as Record<string, unknown>;
          const fieldName = firstItem['amount']
            ? 'amount'
            : firstItem['_hiddenPartyKey']
              ? '_hiddenPartyKey'
              : null; // never possible either key must exist

          const expectedMissingFieldTestId = `${path}${key}-${val.length}-${fieldName}`;

          results.push({
            addButtonTestId,
            expectedMissingFieldTestId,
          });

          // Recursively process nested arrays
          for (let i = 0; i < val.length; i++) {
            const nestedResults = getButtonTestIds(
              val[i] as Record<string, unknown>,
              `${path}${key}-${i}-`,
            );
            results.push(...nestedResults);
          }
        }

        return results;
      };

      const { loader } = await setupAndNavigate();
      await activateTabs(loader);

      const buttonTestData = getButtonTestIds(
        TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE,
      );

      for (const {
        addButtonTestId,
        expectedMissingFieldTestId,
      } of buttonTestData) {
        const button = await loader.getHarness(
          MatButtonHarness.with({
            selector: getTestIdSelector(addButtonTestId),
          }),
        );

        expect(button).toBeDefined();
        await button.click();

        // Verify the expected field does NOT exist
        const field = await loader.getHarnessOrNull(
          MatFormFieldHarness.with({
            selector: getTestIdSelector(expectedMissingFieldTestId),
          }),
        );

        expect(field).toBeNull();
      }
    });

    it('should verify all remove buttons are disabled', async () => {
      const getButtonTestIds = (obj: Record<string, unknown>, path = '') => {
        const results = [] as string[];

        for (const [key, val] of Object.entries(obj)) {
          if (!Array.isArray(val) || val.length === 0) continue;

          const removeButtonTestIds = val.map(
            (item, index) => `${path}${key}-${index}-remove`,
          );

          results.push(...removeButtonTestIds);

          // Recursively process nested arrays
          for (let i = 0; i < val.length; i++) {
            const nestedResults = getButtonTestIds(
              val[i] as Record<string, unknown>,
              `${path}${key}-${i}-`,
            );
            results.push(...nestedResults);
          }
        }

        return results;
      };

      const { loader } = await setupAndNavigate();
      await activateTabs(loader);

      const removeBtnTestIds = getButtonTestIds(
        TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE,
      );

      for (const btnTestId of removeBtnTestIds) {
        const button = await loader.getHarness(
          MatButtonHarness.with({
            selector: getTestIdSelector(btnTestId),
          }),
        );

        expect(button).toBeDefined();
        await button.click();

        // note: the buttons are left enabled in DOM but programmatically disabled
        // Verify the button is disabled
        // const isDisabled = await button.isDisabled();
        // expect(isDisabled).toBe(true);
      }

      // Verify all buttons still exist
      const finalButtons = await Promise.all(
        removeBtnTestIds.map((testId) =>
          loader.getHarnessOrNull(
            MatButtonHarness.with({
              selector: getTestIdSelector(testId),
            }),
          ),
        ),
      );

      expect(finalButtons.filter(Boolean).length).toBe(removeBtnTestIds.length);
    });
  });

  describe('integrity checks', () => {
    it('should always create empty array for null/undefined array props', () => {
      // eslint-disable-next-line jasmine/no-pending-tests
      pending('TODO: implement this test');
    });

    it('should always create _id prop for array items', () => {
      // eslint-disable-next-line jasmine/no-pending-tests
      pending('TODO: implement this test');
    });
  });

  afterEach(() => {
    // todo: Verify that none of the tests make any extra HTTP requests.
    // TestBed.inject(HttpTestingController).verify();
  });
});

async function createFieldTraverser(
  loader: HarnessLoader,
  verifier: FieldVerifier,
) {
  const expectedTestIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verify = async function (obj: any, path = '') {
    const errors: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (key === 'flowOfFundsAmlTransactionId' || key === '_id') {
        continue;
      }

      if (Array.isArray(val)) {
        for (const [index, item] of val.entries()) {
          const arrayPath = path
            ? `${path}-${key}-${index}`
            : `${key}-${index}`;
          errors.push(...(await verify(item, arrayPath)));
        }
        continue;
      }

      const testId = path ? `${path}-${key}` : key;
      expectedTestIds.add(testId);

      // Delegate verification to the callback
      errors.push(...(await verifier(testId, val, loader)));
    }
    return errors;
  };

  return { verify, expectedTestIds };
}

/**
 * Checkboxes are NOT wrapped in mat-form-field. Throws when field associated with test id is not available.
 * @returns {null} field is null for checkboxes
 */
async function getMatField<
  T extends InputField | SelectField | DateField | CheckboxField,
>(loader: HarnessLoader, testId: T) {
  if (isCheckBox(testId)) {
    const control = (await loader.getHarness(
      MatCheckboxHarness.with({ selector: getTestIdSelector(testId) }),
    )) as FieldControlHarness<T>;
    return { control, field: null };
  }

  const field = await loader.getHarness(
    MatFormFieldHarness.with({ selector: getTestIdSelector(testId) }),
  );
  const control = (await field.getControl()) as FieldControlHarness<T>;
  return { control, field };
}

function getTestIdSelector(testId: string) {
  return `[${TEST_ATTRUBUTE}="${testId}"]`;
}

const TEST_ATTRUBUTE = 'data-testid';

function isTimeField(testId: string): testId is TimeField {
  const timeFields: TimeField[] = ['timeOfTxn', 'timeOfPosting'];

  return timeFields.includes(testId.split('-').at(-1) as TimeField);
}

function isCheckBox(testId: string): testId is CheckboxField {
  const checkboxFields: CheckboxField[] = [
    'hasPostingDate',
    'wasTxnAttempted',
    'hasAccountHolders',
    'wasSofInfoObtained',
    'wasCondInfoObtained',
    'wasConductedOnBehalf',
    'wasAnyOtherSubInvolved',
    'wasBenInfoObtained',
  ];

  return checkboxFields.includes(testId.split('-').at(-1) as CheckboxField);
}

function isSelectField(testId: string): testId is SelectField {
  const selectFields: SelectField[] = [
    'methodOfTxn',
    'directionOfSA',
    'typeOfFunds',
    'currency',
    'accountType',
    'accountCurrency',
    'accountStatus',
    'detailsOfDispo',
    'currency',
    'linkToSub',
  ];

  return selectFields.includes(testId.split('-').at(-1) as SelectField);
}

function isIgnoredField(testId: string): testId is SelectField {
  const ignoredFields: SelectField[] = ['linkToSub'];

  return ignoredFields.includes(testId.split('-').at(-1) as SelectField);
}

function isDateField(testId: string): testId is DateField {
  const dateFields: DateField[] = [
    'dateOfTxn',
    'dateOfPosting',
    'accountOpen',
    'accountClose',
  ];

  return dateFields.includes(testId.split('-').at(-1) as DateField);
}

function isInputField(testId: string): testId is InputField {
  return (
    !isSelectField(testId) &&
    !isDateField(testId) &&
    !isCheckBox(testId) &&
    !isTimeField(testId)
  );
}

type SelectField =
  | 'methodOfTxn'
  | 'directionOfSA'
  | 'typeOfFunds'
  | 'currency'
  | 'accountType'
  | 'accountCurrency'
  | 'accountStatus'
  | 'detailsOfDispo'
  | 'currency'
  | 'linkToSub';

type DateField = 'dateOfTxn' | 'dateOfPosting' | 'accountOpen' | 'accountClose';

type CheckboxField =
  | 'hasPostingDate'
  | 'wasTxnAttempted'
  | 'hasAccountHolders'
  | 'wasSofInfoObtained'
  | 'wasCondInfoObtained'
  | 'wasConductedOnBehalf'
  | 'wasAnyOtherSubInvolved'
  | 'wasBenInfoObtained';

type TimeField = 'timeOfTxn' | 'timeOfPosting';

type InputField = Exclude<string, SelectField | DateField | CheckboxField>;

type FieldControlHarness<T extends string> = T extends SelectField
  ? MatSelectHarness
  : T extends DateField
    ? MatDatepickerInputHarness
    : T extends CheckboxField
      ? MatCheckboxHarness
      : MatInputHarness;

type FieldVerifier = (
  testId: string,
  expectedValue: unknown,
  loader: HarnessLoader,
) => Promise<string[]>;

const PARTIES_TEST_OR_DEV_ONLY_FIXTURE = [
  {
    linkToSub: '5846601320',
    _hiddenPartyKey: '5846601320',
    _hiddenSurname: 'Carter',
    _hiddenGivenName: 'Jimmy',
    _hiddenOtherOrInitial: 'S',
    _hiddenNameOfEntity: 'Jimmy Inc',
    accountNumber: '222222',
    identifyingNumber: '333333',
  },
  {
    linkToSub: '9414672563',
    _hiddenPartyKey: '9414672563',
    _hiddenSurname: 'Smith',
    _hiddenGivenName: 'James',
    _hiddenOtherOrInitial: 'L',
    _hiddenNameOfEntity: 'Jamed Inc',
  },
  {
    linkToSub: '3415674561',
    _hiddenPartyKey: '3415674561',
    _hiddenSurname: 'Carter',
    _hiddenGivenName: 'James',
    _hiddenOtherOrInitial: 'L',
    _hiddenNameOfEntity: 'James Inc',
  },
  {
    linkToSub: '2846601320',
    _hiddenPartyKey: '2846601320',
    _hiddenSurname: 'Carter',
    _hiddenGivenName: 'Jimmy',
    _hiddenOtherOrInitial: 'S',
    _hiddenNameOfEntity: 'Jimmy Inc',
    accountNumber: '222222',
    identifyingNumber: '333333',
  },
  {
    linkToSub: '1846597320',
    _hiddenPartyKey: '1846597320',
    _hiddenSurname: 'Nguyen',
    _hiddenGivenName: 'Laura',
    _hiddenOtherOrInitial: 'M',
    _hiddenNameOfEntity: 'James Inc',
  },
  {
    linkToSub: '4415677561',
    _hiddenPartyKey: '4415677561',
    _hiddenSurname: 'Fallon',
    _hiddenGivenName: 'Jimmy',
    _hiddenOtherOrInitial: 'M',
    _hiddenNameOfEntity: 'Jimmy Inc',
  },
].map(
  ({
    linkToSub,
    _hiddenPartyKey: partyKey,
    _hiddenGivenName: givenName,
    _hiddenOtherOrInitial: otherOrInitial,
    _hiddenSurname: surname,
    _hiddenNameOfEntity: nameOfEntity,
  }) =>
    ({
      partyIdentifier: linkToSub,
      identifiers: { partyKey },
      partyName: { givenName, otherOrInitial, surname, nameOfEntity },
      caseRecordId: CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE,
    }) satisfies WithCaseRecordId<PartyGenType>,
);

const TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE: StrTxnEditForm = {
  wasTxnAttempted: true,
  wasTxnAttemptedReason: 'Lack of funds',
  dateOfTxn: '2024/09/25',
  timeOfTxn: '8:46:12',
  hasPostingDate: true,
  dateOfPosting: '2024/09/25',
  timeOfPosting: '10:46:12',
  methodOfTxn: 'Other',
  methodOfTxnOther: 'Mail Order',
  reportingEntityTxnRefNo: 'ABM-01K4WANX6DRN6KCN05PMG7WJHA',
  purposeOfTxn: 'Mortgage Payment',
  reportingEntityLocationNo: '84255',
  startingActions: [
    {
      _id: 'afe7448f-fd0d-4079-adb9-34eb5983479b',
      directionOfSA: 'In',
      typeOfFunds: 'Other',
      typeOfFundsOther: 'Quasi Cash Payment',
      amount: 7270,
      currency: 'CAD',
      fiuNo: '010',
      branch: '23432',
      account: '5345239',
      accountType: 'Other',
      accountTypeOther: 'Credit Card',
      accountOpen: '2004/08/24',
      accountClose: '2025/08/24',
      accountStatus: 'Active',
      accountCurrency: 'CAD',
      howFundsObtained: 'Gambling',
      hasAccountHolders: true,
      accountHolders: [
        {
          _id: '26fad9e3-7a4e-46e6-84d0-f75a2f76468c',
          linkToSub: '4415677561',
          _hiddenPartyKey: '4415677561',
          _hiddenSurname: 'Fallon',
          _hiddenGivenName: 'Jimmy',
          _hiddenOtherOrInitial: 'M',
          _hiddenNameOfEntity: 'Jimmy Inc',
        },
        {
          _id: '67f65447-30ed-420d-870e-30c2567a51f8',
          linkToSub: '5846601320',
          _hiddenPartyKey: '5846601320',
          _hiddenSurname: 'Carter',
          _hiddenGivenName: 'Jimmy',
          _hiddenOtherOrInitial: 'S',
          _hiddenNameOfEntity: 'Jimmy Inc',
        },
      ],
      wasSofInfoObtained: true,
      sourceOfFunds: [
        {
          _id: '47f64447-30ed-420d-470e-30c2564a51f8',
          linkToSub: '5846601320',
          _hiddenPartyKey: '5846601320',
          _hiddenSurname: 'Carter',
          _hiddenGivenName: 'Jimmy',
          _hiddenOtherOrInitial: 'S',
          _hiddenNameOfEntity: 'Jimmy Inc',
          accountNumber: '222222',
          identifyingNumber: '333333',
        },
      ],
      wasCondInfoObtained: true,
      conductors: [
        {
          _id: '9855168e-8452-4338-b644-ca73a8b846d2',
          linkToSub: '3415674561',
          _hiddenPartyKey: '3415674561',
          _hiddenSurname: 'Carter',
          _hiddenGivenName: 'James',
          _hiddenOtherOrInitial: 'L',
          _hiddenNameOfEntity: 'James Inc',
          wasConductedOnBehalf: true,
          onBehalfOf: [
            {
              _id: '7055168e-8452-4338-b644-ca73a8b846d2',
              linkToSub: '9414672563',
              _hiddenPartyKey: '9414672563',
              _hiddenSurname: 'Smith',
              _hiddenGivenName: 'James',
              _hiddenOtherOrInitial: 'L',
              _hiddenNameOfEntity: 'Jamed Inc',
            },
          ],
        },
      ],
    },
  ],
  completingActions: [
    {
      _id: '182b9eba-a6ae-4c57-be24-4e14ef4488cb',
      detailsOfDispo: 'Other',
      detailsOfDispoOther: 'Outgoing payment',
      amount: 7270,
      currency: 'USD',
      exchangeRate: 2.3,
      valueInCad: 16721,
      fiuNo: '010',
      branch: '84255',
      account: '5582195',
      accountType: 'Other',
      accountTypeOther: 'Credit card',
      accountCurrency: 'CAD',
      accountOpen: '2003/08/24',
      accountClose: '2005/08/24',
      accountStatus: 'Active',
      hasAccountHolders: true,
      accountHolders: [
        {
          _id: '26fad9e3-7a4e-46e6-84d0-f75a2f76468c',
          linkToSub: '3415674561',
          _hiddenPartyKey: '3415674561',
          _hiddenSurname: 'Carter',
          _hiddenGivenName: 'James',
          _hiddenOtherOrInitial: 'L',
          _hiddenNameOfEntity: 'James Inc',
        },
        {
          _id: '67f65447-30ed-420d-870e-30c2567a51f8',
          linkToSub: '1846597320',
          _hiddenPartyKey: '1846597320',
          _hiddenSurname: 'Nguyen',
          _hiddenGivenName: 'Laura',
          _hiddenOtherOrInitial: 'M',
          _hiddenNameOfEntity: 'James Inc',
        },
      ],
      wasAnyOtherSubInvolved: true,
      involvedIn: [
        {
          _id: '37f34437-30e3-420d-473e-30c2563a51f8',
          linkToSub: '2846601320',
          _hiddenPartyKey: '2846601320',
          _hiddenSurname: 'Carter',
          _hiddenGivenName: 'Jimmy',
          _hiddenOtherOrInitial: 'S',
          _hiddenNameOfEntity: 'Jimmy Inc',
          accountNumber: '222222',
          identifyingNumber: '333333',
        },
      ],
      wasBenInfoObtained: true,
      beneficiaries: [
        {
          _id: '84413b8a-31c8-4763-acd5-f9a8c3b3b02a',
          linkToSub: '3415674561',
          _hiddenPartyKey: '3415674561',
          _hiddenSurname: 'Carter',
          _hiddenGivenName: 'James',
          _hiddenOtherOrInitial: 'L',
          _hiddenNameOfEntity: 'James Inc',
        },
        {
          _id: '3e1463cb-687e-4846-89ba-5eff6d3639a2',
          linkToSub: '1846597320',
          _hiddenPartyKey: '1846597320',
          _hiddenSurname: 'Nguyen',
          _hiddenGivenName: 'Laura',
          _hiddenOtherOrInitial: 'M',
          _hiddenNameOfEntity: 'James Inc',
        },
      ],
    },
  ],
};

const CASE_RECORD_STATE_FIXTURE: CaseRecordState = {
  searchResponse: [],
  caseRecordId: CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE,
  amlId: '9999999',
  searchParams: {
    accountNumbersSelection: [],
    partyKeysSelection: [],
    productTypesSelection: [],
    reviewPeriodSelection: [],
    sourceSystemsSelection: [],
  },
  createdAt: '',
  createdBy: '',
  status: 'Active',
  selections: [TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE].map((txn) => {
    return {
      ...txn,
      flowOfFundsAccountCurrency: '',
      flowOfFundsAmlId: 9999999,
      flowOfFundsAmlTransactionId:
        TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE.reportingEntityTxnRefNo!,
      flowOfFundsCasePartyKey: 0,
      flowOfFundsConductorPartyKey: 0,
      flowOfFundsCreditAmount: 0,
      flowOfFundsCreditedAccount: '',
      flowOfFundsCreditedTransit: '',
      flowOfFundsDebitAmount: 0,
      flowOfFundsDebitedAccount: '',
      flowOfFundsDebitedTransit: '',
      flowOfFundsPostingDate: '',
      flowOfFundsSource: '',
      flowOfFundsSourceTransactionId: '',
      flowOfFundsTransactionCurrency: '',
      flowOfFundsTransactionCurrencyAmount: 0,
      flowOfFundsTransactionDate: '',
      flowOfFundsTransactionDesc: '',
      flowOfFundsTransactionTime: '',
      _hiddenTxnType: '',
      _hiddenAmlId: '',
      _hiddenStrTxnId: '',
      changeLogs: [],
      sourceId: 'Manual',
      caseRecordId: CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE,
      eTag: 0,
    };
  }),
  parties: PARTIES_TEST_OR_DEV_ONLY_FIXTURE,
  eTag: 0,
  lastUpdated: '1996-06-13',
};

const TRANSACTION_BULK_SAVE_FORM_SRUCTURE: StrTxnEditForm = {
  wasTxnAttempted: null,
  wasTxnAttemptedReason: null,
  dateOfTxn: null,
  timeOfTxn: null,
  hasPostingDate: null,
  dateOfPosting: null,
  timeOfPosting: null,
  methodOfTxn: null,
  methodOfTxnOther: null,
  reportingEntityTxnRefNo: null,
  purposeOfTxn: null,
  reportingEntityLocationNo: null,
  startingActions: [
    {
      directionOfSA: null,
      typeOfFunds: null,
      typeOfFundsOther: null,
      amount: null,
      currency: null,
      fiuNo: null,
      branch: null,
      account: null,
      accountType: null,
      accountTypeOther: null,
      accountOpen: null,
      accountClose: null,
      accountStatus: null,
      accountCurrency: null,
      howFundsObtained: null,
      hasAccountHolders: null,
      accountHolders: [
        {
          linkToSub: '',
          _hiddenPartyKey: null,
          _hiddenSurname: null,
          _hiddenGivenName: null,
          _hiddenOtherOrInitial: null,
          _hiddenNameOfEntity: null,
        },
      ],
      wasSofInfoObtained: null,
      sourceOfFunds: [
        {
          linkToSub: '',
          _hiddenPartyKey: null,
          _hiddenSurname: null,
          _hiddenGivenName: null,
          _hiddenOtherOrInitial: null,
          _hiddenNameOfEntity: null,
          accountNumber: null,
          identifyingNumber: null,
        },
      ],
      wasCondInfoObtained: null,
      conductors: [
        {
          linkToSub: '',
          _hiddenPartyKey: null,
          _hiddenSurname: null,
          _hiddenGivenName: null,
          _hiddenOtherOrInitial: null,
          _hiddenNameOfEntity: null,
          wasConductedOnBehalf: null,
          onBehalfOf: [],
        },
      ],
    },
  ],
  completingActions: [
    {
      detailsOfDispo: null,
      detailsOfDispoOther: null,
      amount: null,
      currency: null,
      exchangeRate: null,
      valueInCad: null,
      fiuNo: null,
      branch: null,
      account: null,
      accountType: null,
      accountTypeOther: null,
      accountCurrency: null,
      accountOpen: null,
      accountClose: null,
      accountStatus: null,
      hasAccountHolders: null,
      accountHolders: [
        {
          linkToSub: '',
          _hiddenPartyKey: null,
          _hiddenSurname: null,
          _hiddenGivenName: null,
          _hiddenOtherOrInitial: null,
          _hiddenNameOfEntity: null,
        },
      ],
      wasAnyOtherSubInvolved: null,
      involvedIn: [
        {
          linkToSub: '',
          _hiddenPartyKey: null,
          _hiddenSurname: null,
          _hiddenGivenName: null,
          _hiddenOtherOrInitial: null,
          _hiddenNameOfEntity: null,
          accountNumber: null,
          identifyingNumber: null,
        },
      ],
      wasBenInfoObtained: null,
      beneficiaries: [
        {
          linkToSub: '',
          _hiddenPartyKey: null,
          _hiddenSurname: null,
          _hiddenGivenName: null,
          _hiddenOtherOrInitial: null,
          _hiddenNameOfEntity: null,
        },
      ],
    },
  ],
};
