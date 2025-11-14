import { HarnessLoader } from "@angular/cdk/testing";
import { TestbedHarnessEnvironment } from "@angular/cdk/testing/testbed";
import {
  ANIMATION_MODULE_TYPE,
  Component,
  DebugElement,
  ErrorHandler,
  inject,
  provideZoneChangeDetection,
} from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  MAT_DATE_FNS_FORMATS,
  provideDateFnsAdapter,
} from "@angular/material-date-fns-adapter";
import { MatCheckboxHarness } from "@angular/material/checkbox/testing";
import { MAT_DATE_LOCALE } from "@angular/material/core";
import { MatDatepickerInputHarness } from "@angular/material/datepicker/testing";
import { MatExpansionPanelHarness } from "@angular/material/expansion/testing";
import { MatFormFieldHarness } from "@angular/material/form-field/testing";
import { MatInputHarness } from "@angular/material/input/testing";
import { MatSelectHarness } from "@angular/material/select/testing";
import { MatTabHarness } from "@angular/material/tabs/testing";
import { By } from "@angular/platform-browser";
import {
  Router,
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
  withRouterConfig,
} from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { enCA } from "date-fns/locale";
import { defer } from "rxjs";
import { AmlComponent } from "../../aml/aml.component";
import {
  SESSION_INITIAL_STATE,
  SessionDataService,
  SessionStateLocal,
} from "../../aml/session-data.service";
import { AppErrorHandlerService } from "../../app-error-handler.service";
import {
  EditFormComponent,
  StrTxnEditForm,
  editTypeResolver,
} from "./edit-form.component";
import { TransactionTimeDirective } from "./transaction-time.directive";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";

@Component({
  selector: "app-transaction-search",
  template: "<h1>Transaction Search</h1>",
  standalone: true,
})
class MockTransactionSearchComponent {}

describe("EditFormComponent", () => {
  async function setup() {
    await TestBed.configureTestingModule({
      providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        // note custom routing specific to test
        provideRouter(
          [
            {
              path: "transactionsearch",
              component: MockTransactionSearchComponent,
              title: "Search by AML Id",
            },
            {
              path: "aml/:amlId",
              component: AmlComponent,
              providers: [
                {
                  provide: SESSION_INITIAL_STATE,
                  useValue: SESSION_STATE_FIXTURE,
                },
                SessionDataService,
              ],
              children: [
                {
                  path: "reporting-ui",
                  children: [
                    {
                      path: "edit-form/:transactionId",
                      component: EditFormComponent,
                      resolve: {
                        editType: editTypeResolver,
                      },
                      title: (route) =>
                        `Edit - ${route.params["transactionId"]}`,
                    },
                  ],
                },
              ],
            },
          ],
          withComponentInputBinding(),
          withRouterConfig({ paramsInheritanceStrategy: "always" }),
          withNavigationErrorHandler((navError) => {
            const router = inject(Router);
            console.error("Navigation error:", navError.error);
            router.navigate(["/transactionsearch"]);
          }),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        // note needed as mat date input harness reads displayed value instead of form model value
        provideDateFnsAdapter({
          ...MAT_DATE_FNS_FORMATS,
          display: { ...MAT_DATE_FNS_FORMATS.display, dateInput: "yyyy/MM/dd" },
        }),
        { provide: MAT_DATE_LOCALE, useValue: enCA },
        { provide: ErrorHandler, useClass: AppErrorHandlerService },
        // note disables animations to prevent scenario of making assertions before animations complete
        { provide: ANIMATION_MODULE_TYPE, useValue: "NoopAnimations" },
      ],
    }).compileComponents();

    const harness = await RouterTestingHarness.create();
    const loader = TestbedHarnessEnvironment.loader(harness.fixture);
    // todo add edit form save tests that invoke http requests
    const httpTesting = TestBed.inject(HttpTestingController);
    return {
      harness,
      loader,
      httpTesting,
    };
  }

  describe("navigate to edit form component", () => {
    async function setupAndNavigate() {
      const { harness, loader } = await setup();

      await harness.navigateByUrl(
        "aml/99999999/reporting-ui/edit-form/ABM-01K4WANX6DRN6KCN05PMG7WJHA",
        AmlComponent,
      );

      return { harness, loader };
    }

    it("should create form template", async () => {
      const {
        harness: { fixture },
      } = await setupAndNavigate();

      expect(findEl(fixture, "edit-form")).toBeTruthy();
    });

    it("should create an input field", async () => {
      const { loader } = await setupAndNavigate();

      const { control, field } = await getMatField(loader, "dateOfTxn");

      expect(control).toBeTruthy();

      const actualValue = await control!.getValue();
      const expectedValue = "2024/09/25";

      expect(actualValue).toBe(expectedValue);

      const isValid = await field!.isControlValid();
      expect(isValid).toBe(true);
    });

    it("should verify all form fields populate correctly", async () => {
      const { loader } = await setupAndNavigate();

      const verify = await formVerifierFactory(loader);
      const errors = await verify(TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE);

      expect(errors.length).toBe(0);
      if (errors.length > 0) {
        fail(`Form verification failed:\n${errors.join("\n")}`);
      }
    });
  });

  it("should redirect to transaction search when ID is invalid", async () => {
    const { harness } = await setup();
    const router = TestBed.inject(Router);

    await expectAsync(
      harness.navigateByUrl("aml/99999999/reporting-ui/edit-form/asdfasdf"),
    ).toBeRejectedWithError(/Transaction not found/);
    expect(router.url).toBe("/transactionsearch");
  });

  afterEach(() => {
    // Verify that none of the tests make any extra HTTP requests.
    TestBed.inject(HttpTestingController).verify();
  });
});

async function formVerifierFactory(loader: HarnessLoader) {
  await activateTabs();

  return async function verify(obj: any, path = "") {
    const errors: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (key === "flowOfFundsAmlTransactionId" || key === "_id") {
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

      if (isInputField(testId)) {
        const { control } = await getMatField(loader, testId);
        const actualValue = await control.getValue();
        const expectedValue = String(val ?? "");
        if (actualValue !== expectedValue) {
          errors.push(
            `${testId}: Expected "${expectedValue}", got "${actualValue}"`,
          );
        }
      }

      if (isSelectField(testId)) {
        const { control } = await getMatField(loader, testId as SelectField);
        const actualValue = await control.getValueText();
        const expectedValue = String(val ?? "");
        if (actualValue !== expectedValue) {
          errors.push(
            `${testId}: Expected "${expectedValue}", got "${actualValue}"`,
          );
        }
      }

      if (isDateField(testId)) {
        const { control } = await getMatField(loader, testId as DateField);
        const actualValue = await control.getValue();
        const expectedValue = String(val ?? "");
        if (actualValue !== expectedValue) {
          errors.push(
            `${testId}: Expected "${expectedValue}", got "${actualValue}"`,
          );
        }
      }

      if (isCheckBox(testId)) {
        const { control } = await getMatField(loader, testId as CheckboxField);
        const actualValue = await control.isChecked();
        const expectedValue = Boolean(val);
        if (actualValue !== expectedValue) {
          errors.push(
            `${testId}: Expected "${expectedValue}", got "${actualValue}"`,
          );
        }
      }

      if (isTimeField(testId)) {
        const { control } = await getMatField(loader, testId);
        const actualValue = await control.getValue();
        const expectedValue = String(
          TransactionTimeDirective.parseAndFormatTime(val) ?? "",
        );
        if (actualValue !== expectedValue) {
          errors.push(
            `${testId}: Expected "${expectedValue}", got "${actualValue}"`,
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
        throw new Error("unkonwn test id");
      }
    }
    return errors;
  };

  /**
   * mat-tab, mat-expansion-panel elements are hidden by default until activated. The harness can't find fields that aren't rendered in the DOM.
   * requires mat-tab-group preserveContent
   */
  async function activateTabs() {
    const tabHarnesses = await loader.getAllHarnesses(MatTabHarness);
    for (const tab of tabHarnesses) {
      await tab.select();
    }

    const panels = await loader.getAllHarnesses(MatExpansionPanelHarness);
    for (const panel of panels) {
      if (!(await panel.isExpanded())) {
        await panel.expand();
      }
    }
  }
}

type SelectField =
  | "methodOfTxn"
  | "directionOfSA"
  | "typeOfFunds"
  | "currency"
  | "accountType"
  | "accountCurrency"
  | "accountStatus"
  | "detailsOfDispo"
  | "currency";

type DateField = "dateOfTxn" | "dateOfPosting" | "accountOpen" | "accountClose";

type CheckboxField =
  | "hasPostingDate"
  | "wasTxnAttempted"
  | "hasAccountHolders"
  | "wasSofInfoObtained"
  | "wasCondInfoObtained"
  | "wasConductedOnBehalf"
  | "wasAnyOtherSubInvolved"
  | "wasBenInfoObtained";

type TimeField = "timeOfTxn" | "timeOfPosting";

type InputField = Exclude<string, SelectField | DateField | CheckboxField>;

type FieldControlHarness<T extends string> = T extends SelectField
  ? MatSelectHarness
  : T extends DateField
    ? MatDatepickerInputHarness
    : T extends CheckboxField
      ? MatCheckboxHarness
      : MatInputHarness;

/**
 * Checkboxes are NOT wrapped in mat-form-field
 * @returns {null} field is null for checkboxes
 */
async function getMatField<
  T extends InputField | SelectField | DateField | CheckboxField,
>(loader: HarnessLoader, testId: T) {
  if (isCheckBox(testId)) {
    const control = (await loader.getHarness(
      MatCheckboxHarness.with({ selector: `[data-testid="${testId}"]` }),
    )) as FieldControlHarness<T>;
    return { control, field: null };
  }

  const field = await loader.getHarness(
    MatFormFieldHarness.with({ selector: `[data-testid="${testId}"]` }),
  );
  const control = (await field.getControl()) as FieldControlHarness<T>;
  return { control, field };
}

function isTimeField(testId: string): testId is TimeField {
  const timeFields: TimeField[] = ["timeOfTxn", "timeOfPosting"];

  return timeFields.includes(testId.split("-").at(-1) as TimeField);
}

function isCheckBox(testId: string): testId is CheckboxField {
  const checkboxFields: CheckboxField[] = [
    "hasPostingDate",
    "wasTxnAttempted",
    "hasAccountHolders",
    "wasSofInfoObtained",
    "wasCondInfoObtained",
    "wasConductedOnBehalf",
    "wasAnyOtherSubInvolved",
    "wasBenInfoObtained",
  ];

  return checkboxFields.includes(testId.split("-").at(-1) as CheckboxField);
}

function isSelectField(testId: string): testId is SelectField {
  const selectFields: SelectField[] = [
    "methodOfTxn",
    "directionOfSA",
    "typeOfFunds",
    "currency",
    "accountType",
    "accountCurrency",
    "accountStatus",
    "detailsOfDispo",
    "currency",
  ];

  return selectFields.includes(testId.split("-").at(-1) as SelectField);
}

function isDateField(testId: string): testId is DateField {
  const dateFields: DateField[] = [
    "dateOfTxn",
    "dateOfPosting",
    "accountOpen",
    "accountClose",
  ];

  return dateFields.includes(testId.split("-").at(-1) as DateField);
}

function isInputField(testId: string): testId is InputField {
  return (
    !isSelectField(testId) &&
    !isDateField(testId) &&
    !isCheckBox(testId) &&
    !isTimeField(testId)
  );
}

function findEl<T>(fixture: ComponentFixture<T>, testId: string): DebugElement {
  return fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
}

/**
 * Create async observable that emits-once and completes
 * after a JS engine turn
 */
function asyncData<T>(data: T) {
  return defer(() => Promise.resolve(data));
}

/**
 * Create async observable error that errors
 * after a JS engine turn
 */
function asyncError<T>(errorObject: any) {
  return defer(() => Promise.reject(errorObject));
}

const TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE: StrTxnEditForm = {
  wasTxnAttempted: true,
  wasTxnAttemptedReason: "Lack of funds",
  dateOfTxn: "2024/09/25",
  timeOfTxn: "8:46:12",
  hasPostingDate: true,
  dateOfPosting: "2024/09/25",
  timeOfPosting: "10:46:12",
  methodOfTxn: "Other",
  methodOfTxnOther: "Mail Order",
  reportingEntityTxnRefNo: "ABM-01K4WANX6DRN6KCN05PMG7WJHA",
  purposeOfTxn: "Mortgage Payment",
  reportingEntityLocationNo: "84255",
  startingActions: [
    {
      _id: "afe7448f-fd0d-4079-adb9-34eb5983479b",
      directionOfSA: "In",
      typeOfFunds: "Other",
      typeOfFundsOther: "Quasi Cash Payment",
      amount: 7270,
      currency: "CAD",
      fiuNo: "010",
      branch: "23432",
      account: "5345239",
      accountType: "Other",
      accountTypeOther: "Credit Card",
      accountOpen: "2004/08/24",
      accountClose: "2025/08/24",
      accountStatus: "Active",
      accountCurrency: "CAD",
      howFundsObtained: "Gambling",
      hasAccountHolders: true,
      accountHolders: [
        {
          _id: "26fad9e3-7a4e-46e6-84d0-f75a2f76468c",
          partyKey: "4415677561",
          surname: "Fallon",
          givenName: "Jimmy",
          otherOrInitial: "M",
          nameOfEntity: "Jimmy Inc",
        },
        {
          _id: "67f65447-30ed-420d-870e-30c2567a51f8",
          partyKey: "5846601320",
          surname: "Carter",
          givenName: "Jimmy",
          otherOrInitial: "S",
          nameOfEntity: "Jimmy Inc",
        },
      ],
      wasSofInfoObtained: true,
      sourceOfFunds: [
        {
          _id: "47f64447-30ed-420d-470e-30c2564a51f8",
          partyKey: "5846601320",
          surname: "Carter",
          givenName: "Jimmy",
          otherOrInitial: "S",
          nameOfEntity: "Jimmy Inc",
          accountNumber: "222222",
          identifyingNumber: "333333",
        },
      ],
      wasCondInfoObtained: true,
      conductors: [
        {
          _id: "9855168e-8452-4338-b644-ca73a8b846d2",
          partyKey: "3415674561",
          surname: "Carter",
          givenName: "James",
          otherOrInitial: "L",
          nameOfEntity: "James Inc",
          wasConductedOnBehalf: true,
          onBehalfOf: [
            {
              _id: "7055168e-8452-4338-b644-ca73a8b846d2",
              partyKey: "9414672563",
              surname: "Smith",
              givenName: "James",
              otherOrInitial: "L",
              nameOfEntity: "Jamed Inc",
            },
          ],
        },
      ],
    },
  ],
  completingActions: [
    {
      _id: "182b9eba-a6ae-4c57-be24-4e14ef4488cb",
      detailsOfDispo: "Other",
      detailsOfDispoOther: "Outgoing payment",
      amount: 7270,
      currency: "USD",
      exchangeRate: 2.3,
      valueInCad: 16721,
      fiuNo: "010",
      branch: "84255",
      account: "5582195",
      accountType: "Other",
      accountTypeOther: "Credit card",
      accountCurrency: "CAD",
      accountOpen: "2003/08/24",
      accountClose: "2005/08/24",
      accountStatus: "Active",
      hasAccountHolders: true,
      accountHolders: [
        {
          _id: "26fad9e3-7a4e-46e6-84d0-f75a2f76468c",
          partyKey: "3415674561",
          surname: "Carter",
          givenName: "James",
          otherOrInitial: "L",
          nameOfEntity: "James Inc",
        },
        {
          _id: "67f65447-30ed-420d-870e-30c2567a51f8",
          partyKey: "1846597320",
          surname: "Nguyen",
          givenName: "Laura",
          otherOrInitial: "M",
          nameOfEntity: "James Inc",
        },
      ],
      wasAnyOtherSubInvolved: true,
      involvedIn: [
        {
          _id: "37f34437-30e3-420d-473e-30c2563a51f8",
          partyKey: "2846601320",
          surname: "Carter",
          givenName: "Jimmy",
          otherOrInitial: "S",
          nameOfEntity: "Jimmy Inc",
          accountNumber: "222222",
          identifyingNumber: "333333",
        },
      ],
      wasBenInfoObtained: true,
      beneficiaries: [
        {
          _id: "84413b8a-31c8-4763-acd5-f9a8c3b3b02a",
          partyKey: "3415674561",
          surname: "Carter",
          givenName: "James",
          otherOrInitial: "L",
          nameOfEntity: "James Inc",
        },
        {
          _id: "3e1463cb-687e-4846-89ba-5eff6d3639a2",
          partyKey: "1846597320",
          surname: "Nguyen",
          givenName: "Laura",
          otherOrInitial: "M",
          nameOfEntity: "James Inc",
        },
      ],
    },
  ],
};

const SESSION_STATE_FIXTURE: SessionStateLocal = {
  amlId: "9999999",
  version: 0,
  transactionSearchParams: {
    accountNumbersSelection: [],
    partyKeysSelection: [],
    productTypesSelection: [],
    reviewPeriodSelection: [],
    sourceSystemsSelection: [],
  },
  strTransactions: [TRANSACTION_EDIT_FORM_ALL_FIELDS_FIXTURE].map((txn) => {
    return {
      ...txn,
      flowOfFundsAccountCurrency: "",
      flowOfFundsAmlId: 9999999,
      flowOfFundsAmlTransactionId: "ABM-01K4WANX6DRN6KCN05PMG7WJHA",
      flowOfFundsCasePartyKey: 0,
      flowOfFundsConductorPartyKey: 0,
      flowOfFundsCreditAmount: 0,
      flowOfFundsCreditedAccount: "",
      flowOfFundsCreditedTransit: "",
      flowOfFundsDebitAmount: 0,
      flowOfFundsDebitedAccount: "",
      flowOfFundsDebitedTransit: "",
      flowOfFundsPostingDate: "",
      flowOfFundsSource: "",
      flowOfFundsSourceTransactionId: "",
      flowOfFundsTransactionCurrency: "",
      flowOfFundsTransactionCurrencyAmount: 0,
      flowOfFundsTransactionDate: "",
      flowOfFundsTransactionDesc: "",
      flowOfFundsTransactionTime: "",
      _hiddenTxnType: "",
      _hiddenAmlId: "",
      _hiddenStrTxnId: "",
      _version: 0,
      changeLogs: [],
    };
  }),

  lastUpdated: "1996-06-13",
};
