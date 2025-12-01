import { isValid } from 'date-fns/isValid';
import { ulid } from 'ulid';
import {
  StrTransactionWithChangeLogs,
  setRowValidationInfo,
} from '../../aml/session-state.service';
import { EditFormComponent } from '../edit-form/edit-form.component';
import { FormOptions } from '../edit-form/form-options.service';
import { TransactionDateDirective } from '../edit-form/transaction-date.directive';
import { TransactionTimeDirective } from '../edit-form/transaction-time.directive';
import {
  Beneficiary,
  CompletingAction,
  Conductor,
  StartingAction,
  _hiddenValidationType,
} from '../reporting-ui-table/reporting-ui-table.component';
import { type ColumnHeaderLabels } from './manual-upload-stepper.component';

export class ManualTransactionBuilder {
  private transaction: Partial<StrTransactionWithChangeLogs> = {};
  private validationErrors: _hiddenValidationType[] = [];
  flowOfFundsAmlTransactionId = `MTXN-${ulid()}`;

  constructor(
    private value: Record<ColumnHeaderLabels, string | null>,
    private formOptions: FormOptions,
  ) {}

  withMetadata(): this {
    this.transaction._version = 0;
    this.transaction.changeLogs = [];
    this.transaction._hiddenAmlId = this.value['AML Id'] ?? '';
    this.transaction._hiddenStrTxnId = this.flowOfFundsAmlTransactionId;
    this.transaction._hiddenTxnType = 'Manual';
    return this;
  }

  withBasicInfo(): this {
    this.transaction.wasTxnAttempted = null;
    this.transaction.wasTxnAttemptedReason = null;
    this.transaction.dateOfTxn = this.parseDateField('Txn Date') ?? null;
    this.transaction.timeOfTxn = this.parseTimeField('Txn Time') ?? null;
    this.transaction.hasPostingDate = this.hasValue(this.value['Post Date'])
      ? true
      : null;
    this.transaction.dateOfPosting = this.parseDateField('Post Date') ?? null;
    this.transaction.timeOfPosting = this.parseTimeField('Post Time') ?? null;
    this.transaction.reportingEntityTxnRefNo = this.flowOfFundsAmlTransactionId;
    this.transaction.purposeOfTxn = null;
    this.transaction.reportingEntityLocationNo = null;

    // Method of transaction with validation
    const isKnownMethodOfTxn = this.validateOptionField(
      'Method of Txn',
      'methodOfTxn',
      'invalidMethodOfTxn',
    );
    this.transaction.methodOfTxn = isKnownMethodOfTxn
      ? this.value['Method of Txn']
      : null;
    this.transaction.methodOfTxnOther = !isKnownMethodOfTxn
      ? this.value['Method of Txn']
      : null;

    return this;
  }

  withFlowOfFundsInfo(): this {
    this.transaction.flowOfFundsAccountCurrency = null;
    this.transaction.flowOfFundsAmlId =
      this.parseNumber(this.value['AML Id']) ?? 0;
    this.transaction.flowOfFundsAmlTransactionId =
      this.flowOfFundsAmlTransactionId;
    this.transaction.flowOfFundsCasePartyKey = null;
    this.transaction.flowOfFundsConductorPartyKey = null;
    this.transaction.flowOfFundsCreditAmount = null;
    this.transaction.flowOfFundsCreditedAccount = null;
    this.transaction.flowOfFundsCreditedTransit = null;
    this.transaction.flowOfFundsDebitAmount = null;
    this.transaction.flowOfFundsDebitedAccount = null;
    this.transaction.flowOfFundsDebitedTransit = null;
    this.transaction.flowOfFundsPostingDate = null;
    this.transaction.flowOfFundsSource = 'Manual';
    this.transaction.flowOfFundsSourceTransactionId = null;
    this.transaction.flowOfFundsTransactionCurrency = null;
    this.transaction.flowOfFundsTransactionCurrencyAmount = null;
    this.transaction.flowOfFundsTransactionDate = null;
    this.transaction.flowOfFundsTransactionDesc = '';
    this.transaction.flowOfFundsTransactionTime = null;
    return this;
  }

  withStartingAction(): this {
    const conductor = this.buildConductor();

    // Validate all debit-side fields
    const isKnownDirectionOfSA = this.validateOptionField(
      'Direction',
      'directionOfSA',
      'invalidDirectionOfSA',
    );
    const isKnownTypeOfFunds = this.validateOptionField(
      'Funds Type',
      'typeOfFunds',
      'invalidTypeOfFunds',
    );
    const isKnownDebitCurrency = this.validateOptionField(
      'Debit Currency',
      'amountCurrency',
      'invalidAmountCurrency',
    );
    const isKnownDebitAccountType = this.validateOptionField(
      'Debit Account Type',
      'accountType',
      'invalidAccountType',
    );
    const isKnownDebitAccountCurrency = this.validateOptionField(
      'Debit Account Currency',
      'accountCurrency',
      'invalidAccountCurrency',
    );
    const isKnownDebitAccountStatus = this.validateOptionField(
      'Debit Account Status',
      'accountStatus',
      'invalidAccountStatus',
    );

    const startingAction: StartingAction = {
      _id: ulid(),
      directionOfSA: isKnownDirectionOfSA ? this.value['Direction'] : null,
      typeOfFunds: isKnownTypeOfFunds ? this.value['Funds Type'] : null,
      typeOfFundsOther: !isKnownTypeOfFunds ? this.value['Funds Type'] : null,
      amount: this.parseNumber(this.value['Debit Amount']),
      currency: isKnownDebitCurrency ? this.value['Debit Currency'] : null,
      fiuNo: this.value['Debit FIU'] || null,
      branch: this.value['Debit Branch'] || null,
      account: this.value['Debit Account'] || null,
      accountType: isKnownDebitAccountType
        ? this.value['Debit Account Type']
        : null,
      accountTypeOther: !isKnownDebitAccountType
        ? this.value['Debit Account Type']
        : null,
      accountCurrency: isKnownDebitAccountCurrency
        ? this.value['Debit Account Currency']
        : null,
      accountOpen: this.value['Debit Account Open'] || null,
      accountClose: this.value['Debit Account Close'] || null,
      accountStatus: isKnownDebitAccountStatus
        ? this.value['Debit Account Status']
        : null,
      howFundsObtained: this.value['How Funds Were Obtained?'] || null,
      hasAccountHolders: null,
      accountHolders: [],
      wasSofInfoObtained: null,
      sourceOfFunds: [],
      wasCondInfoObtained: conductor ? true : null,
      conductors: conductor ? [conductor] : [],
    };

    this.transaction.startingActions = [startingAction];
    return this;
  }

  withCompletingAction(): this {
    const beneficiary = this.buildBeneficiary();

    // Validate all credit-side fields
    const isKnownDetailsOfDispo = this.validateOptionField(
      'Disposition Details',
      'detailsOfDisposition',
      'invalidDetailsOfDisposition',
    );
    const isKnownCreditCurrency = this.validateOptionField(
      'Credit Currency',
      'amountCurrency',
      'invalidAmountCurrency',
    );
    const isKnownCreditAccountType = this.validateOptionField(
      'Credit Account Type',
      'accountType',
      'invalidAccountType',
    );
    const isKnownCreditAccountCurrency = this.validateOptionField(
      'Credit Account Currency',
      'accountCurrency',
      'invalidAccountCurrency',
    );
    const isKnownCreditAccountStatus = this.validateOptionField(
      'Credit Account Status',
      'accountStatus',
      'invalidAccountStatus',
    );

    const completingAction: CompletingAction = {
      _id: ulid(),
      detailsOfDispo: isKnownDetailsOfDispo
        ? this.value['Disposition Details']
        : null,
      detailsOfDispoOther: !isKnownDetailsOfDispo
        ? this.value['Disposition Details']
        : null,
      amount: this.parseNumber(this.value['Credit Amount']),
      exchangeRate: null,
      valueInCad: null,
      currency: isKnownCreditCurrency ? this.value['Credit Currency'] : null,
      fiuNo: this.value['Credit FIU'] || null,
      branch: this.value['Credit Branch'] || null,
      account: this.value['Credit Account'] || null,
      accountType: isKnownCreditAccountType
        ? this.value['Credit Account Type']
        : null,
      accountTypeOther: !isKnownCreditAccountType
        ? this.value['Credit Account Type']
        : null,
      accountCurrency: isKnownCreditAccountCurrency
        ? this.value['Credit Account Currency']
        : null,
      accountOpen: this.value['Credit Account Open'] || null,
      accountClose: this.value['Credit Account Close'] || null,
      accountStatus: isKnownCreditAccountStatus
        ? this.value['Credit Account Status']
        : null,
      hasAccountHolders: null,
      accountHolders: [],
      wasAnyOtherSubInvolved: null,
      involvedIn: [],
      wasBenInfoObtained: beneficiary ? true : null,
      beneficiaries: beneficiary ? [beneficiary] : [],
    };

    this.transaction.completingActions = [completingAction];
    return this;
  }

  // note: overrites validation errors prop
  withRowValidation(): this {
    setRowValidationInfo(this.transaction as StrTransactionWithChangeLogs);
    return this;
  }

  // note: must run after row validation
  withValidationErrors(): this {
    this.transaction._hiddenValidation ??= [];
    this.transaction._hiddenValidation.push(...this.validationErrors);
    return this;
  }

  build(): StrTransactionWithChangeLogs {
    return this.transaction as StrTransactionWithChangeLogs;
  }

  // Helper methods
  private parseNumber(val: string | null | undefined): number | null {
    if (!val || val.trim() === '') return null;
    const parsed = Number.parseFloat(val);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private hasValue(val: string | null | undefined): boolean {
    return val !== null && val !== undefined && val.trim() !== '';
  }

  private isValidOption(
    field: ColumnHeaderLabels,
    optionKey: keyof FormOptions,
  ): boolean {
    if (!this.value[field]) return true;
    return !EditFormComponent.validateFormOptions(
      this.value[field],
      this.formOptions,
      optionKey,
    );
  }

  private validateOptionField(
    field: ColumnHeaderLabels,
    optionKey: keyof FormOptions,
    errorType: _hiddenValidationType,
  ): boolean {
    const isValid = this.isValidOption(field, optionKey);
    if (!isValid) {
      this.validationErrors.push(errorType);
    }
    return isValid;
  }

  private parseDateField(field: ColumnHeaderLabels) {
    if (!this.value[field]) return null;

    const parsedDate = TransactionDateDirective.parse(this.value[field]);
    if (!isValid(parsedDate)) {
      this.validationErrors.push('invalidDate');
      return null;
    }

    return this.value[field] as string;
  }

  private parseTimeField(field: ColumnHeaderLabels) {
    if (!this.value[field]) return null;

    const parsedTime = TransactionTimeDirective.parseAndFormatTime(
      this.value[field],
    );

    if (!parsedTime) {
      this.validationErrors.push('invalidTime');
      return null;
    }

    return this.value[field] as string;
  }

  private buildConductor(): Conductor | null {
    if (
      !this.hasValue(this.value['Conductor Party Key']) &&
      !this.hasValue(this.value['Conductor Surname']) &&
      !this.hasValue(this.value['Conductor Given Name']) &&
      !this.hasValue(this.value['Conductor Entity Name'])
    ) {
      return null;
    }

    return {
      _id: ulid(),
      partyKey: this.value['Conductor Party Key'] || null,
      surname: this.value['Conductor Surname'] || null,
      givenName: this.value['Conductor Given Name'] || null,
      otherOrInitial: this.value['Conductor Other Name'] || null,
      nameOfEntity: this.value['Conductor Entity Name'] || null,
      wasConductedOnBehalf: null,
      onBehalfOf: [],
    };
  }

  private buildBeneficiary(): Beneficiary | null {
    if (
      !this.hasValue(this.value['Beneficiary Party Key']) &&
      !this.hasValue(this.value['Beneficiary Surname']) &&
      !this.hasValue(this.value['Beneficiary Given Name']) &&
      !this.hasValue(this.value['Beneficiary Entity Name'])
    ) {
      return null;
    }

    return {
      _id: ulid(),
      partyKey: this.value['Beneficiary Party Key'] || null,
      surname: this.value['Beneficiary Surname'] || null,
      givenName: this.value['Beneficiary Given Name'] || null,
      otherOrInitial: this.value['Beneficiary Other Name'] || null,
      nameOfEntity: this.value['Beneficiary Entity Name'] || null,
    };
  }
}

// todo: convert to a service which verifies/populates account info
// todo:? use schema lib validate manual transaction object
