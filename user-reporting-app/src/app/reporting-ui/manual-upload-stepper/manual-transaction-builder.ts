import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { ulid } from 'ulid';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import { PartyGenType } from '../../transaction-view/transform-to-str-transaction/party-gen.service';
import {
  EditFormComponent,
  InvalidFormOptionsErrorKeys,
} from '../edit-form/edit-form.component';
import { FormOptions } from '../edit-form/form-options.service';
import {
  ParsingError,
  TransactionDateDirective,
} from '../edit-form/transaction-date.directive';
import { TransactionTimeDirective } from '../edit-form/transaction-time.directive';
import {
  _hiddenValidationType,
  CompletingAction,
  StartingAction,
} from '../reporting-ui-table/reporting-ui-table.component';
import { type ColumnHeaderLabels } from './manual-upload-stepper.component';

export class ManualTransactionBuilder {
  private transaction: Partial<StrTransactionWithChangeLogs> = {};
  private validationErrors: _hiddenValidationType[] = [];
  flowOfFundsAmlTransactionId = `MTXN-${ulid()}`;

  constructor(
    private value: Record<ColumnHeaderLabels, string | null>,
    private formOptions: FormOptions,
    private generateParty: (
      party: Omit<PartyGenType, 'partyIdentifier'>,
    ) => Observable<PartyGenType | null>,
  ) {}

  trimValues(): this {
    Object.keys(this.value).forEach((key) => {
      const val = this.value[key as ColumnHeaderLabels];
      this.value[key as ColumnHeaderLabels] =
        typeof val === 'string' ? val.trim() : val;
    });

    return this;
  }

  withMetadata(): this {
    this.transaction.changeLogs = [];
    this.transaction.sourceId = 'Manual';
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
    this.transaction.reportingEntityLocationNo = this.value['Reporting Entity'];

    // Method of transaction with validation
    const isKnownMethodOfTxn = this.validateOptionField(
      'Method of Txn',
      'methodOfTxn',
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
    this.transaction.flowOfFundsTransactionDesc =
      this.value['Transaction Description'] ?? '';
    this.transaction.flowOfFundsTransactionTime = null;
    return this;
  }

  withStartingAction(): this {
    // Validate all debit-side fields
    const isKnownDirectionOfSA = this.validateOptionField(
      'Direction',
      'directionOfSA',
    );
    const isKnownTypeOfFunds = this.validateOptionField(
      'Funds Type',
      'typeOfFunds',
    );
    const isKnownDebitCurrency = this.validateOptionField(
      'Debit Currency',
      'amountCurrency',
    );
    const isKnownDebitAccountType = this.validateOptionField(
      'Debit Account Type',
      'accountType',
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
      accountCurrency: null,
      accountOpen: null,
      accountClose: null,
      accountStatus: null,
      howFundsObtained: null,
      hasAccountHolders: null,
      accountHolders: [],
      wasSofInfoObtained: null,
      sourceOfFunds: [],
      wasCondInfoObtained: null,
      conductors: [],
    };

    this.transaction.startingActions = [startingAction];
    return this;
  }

  withCompletingAction(): this {
    // Validate all credit-side fields
    const isKnownDetailsOfDispo = this.validateOptionField(
      'Disposition Details',
      'detailsOfDisposition',
    );
    const isKnownCreditCurrency = this.validateOptionField(
      'Credit Currency',
      'amountCurrency',
    );
    const isKnownCreditAccountType = this.validateOptionField(
      'Credit Account Type',
      'accountType',
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
      accountCurrency: null,
      accountOpen: null,
      accountClose: null,
      accountStatus: null,
      hasAccountHolders: null,
      accountHolders: [],
      wasAnyOtherSubInvolved: null,
      involvedIn: [],
      wasBenInfoObtained: null,
      beneficiaries: [],
    };

    this.transaction.completingActions = [completingAction];
    return this;
  }

  // note: must run after row validation
  withValidationErrors(): this {
    this.transaction._hiddenValidation ??= [];
    this.transaction._hiddenValidation.push(...this.validationErrors);
    return this;
  }

  build(): Observable<{
    selection: StrTransactionWithChangeLogs;
    parties: PartyGenType[];
  }> {
    return forkJoin({
      conductor: this.buildConductor(this.generateParty).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === HttpStatusCode.NotFound) {
            this.transaction._hiddenValidation ??= [];
            this.transaction._hiddenValidation.push('invalidPartyKey');
          }
          return of(null);
        }),
      ),
      beneficiary: this.buildBeneficiary(this.generateParty).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === HttpStatusCode.NotFound) {
            this.transaction._hiddenValidation ??= [];
            this.transaction._hiddenValidation.push('invalidPartyKey');
          }
          return of(null);
        }),
      ),
    }).pipe(
      map(({ conductor, beneficiary }) => {
        // Update starting action with conductor
        const mapConductor = () => {
          const { givenName, surname, otherOrInitial, nameOfEntity } =
            conductor?.partyName ?? {};
          const { partyKey } = conductor?.identifiers ?? {};

          return {
            linkToSub: conductor?.partyIdentifier!,
            _hiddenPartyKey: partyKey as string,
            _hiddenGivenName: givenName ?? null,
            _hiddenSurname: surname ?? null,
            _hiddenOtherOrInitial: otherOrInitial ?? null,
            _hiddenNameOfEntity: nameOfEntity ?? null,
            wasConductedOnBehalf: null,
            onBehalfOf: [],
          };
        };

        // }
        this.transaction.startingActions![0].wasCondInfoObtained = conductor
          ? true
          : null;

        this.transaction.startingActions![0].conductors = conductor
          ? [mapConductor()]
          : [];

        // Update completing action with beneficiary
        const mapBeneficiary = () => {
          const { givenName, surname, otherOrInitial, nameOfEntity } =
            beneficiary?.partyName ?? {};
          const { partyKey } = beneficiary?.identifiers ?? {};
          return {
            linkToSub: beneficiary?.partyIdentifier!,
            _hiddenPartyKey: partyKey as string,
            _hiddenGivenName: givenName ?? null,
            _hiddenSurname: surname ?? null,
            _hiddenOtherOrInitial: otherOrInitial ?? null,
            _hiddenNameOfEntity: nameOfEntity ?? null,
          };
        };
        this.transaction.completingActions![0].wasBenInfoObtained = beneficiary
          ? true
          : null;

        this.transaction.completingActions![0].beneficiaries = beneficiary
          ? [mapBeneficiary()]
          : [];

        return {
          selection: this.transaction as StrTransactionWithChangeLogs,
          parties: [conductor, beneficiary].filter((item) => !!item),
        };
      }),
    );
  }

  // Helper methods
  private parseNumber(val: string | null | undefined): number | null {
    if (!val || val.trim() === '') return null;

    const parsed = Number(val.trim());
    return Number.isNaN(parsed) ? null : parsed;
  }

  private hasValue(val: string | null | undefined): boolean {
    return val !== null && val !== undefined && val.trim() !== '';
  }

  private isValidOption(
    field: ColumnHeaderLabels,
    optionKey: keyof FormOptions,
  ) {
    if (!this.value[field]) return null;
    return EditFormComponent.validateFormOptions(
      this.value[field],
      this.formOptions,
      optionKey,
    );
  }

  private validateOptionField(
    field: ColumnHeaderLabels,
    optionKey: keyof FormOptions,
  ): boolean {
    const validationError = this.isValidOption(field, optionKey);
    if (validationError) {
      const errorKeys = Object.keys(
        validationError,
      ) as InvalidFormOptionsErrorKeys[];
      this.validationErrors.push(...errorKeys);
      return false;
    }
    return true;
  }

  private parseDateField(field: ColumnHeaderLabels) {
    if (!this.value[field]) return null;

    try {
      TransactionDateDirective.parse(this.value[field]);
    } catch (error) {
      if (error instanceof ParsingError) {
        this.validationErrors.push('invalidDate');
        return null;
      }
      throw error;
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

    return parsedTime;
  }

  private buildConductor(
    generateParty: (
      party: Omit<PartyGenType, 'partyIdentifier'>,
    ) => Observable<PartyGenType | null>,
  ): Observable<PartyGenType | null> {
    if (
      !this.hasValue(this.value['Conductor Party Key']) &&
      !this.hasValue(this.value['Conductor Surname']) &&
      !this.hasValue(this.value['Conductor Given Name']) &&
      !this.hasValue(this.value['Conductor Entity Name'])
    ) {
      return of(null);
    }

    const party: Omit<PartyGenType, 'partyIdentifier'> = {
      identifiers: { partyKey: this.value['Conductor Party Key']! },
      partyName: {
        surname: this.value['Conductor Surname'] || null,
        givenName: this.value['Conductor Given Name'] || null,
        otherOrInitial: this.value['Conductor Other Name'] || null,
        nameOfEntity: this.value['Conductor Entity Name'] || null,
      },
    };

    return generateParty(party);
  }

  private buildBeneficiary(
    generateParty: (
      party: Omit<PartyGenType, 'partyIdentifier'>,
    ) => Observable<PartyGenType | null>,
  ): Observable<PartyGenType | null> {
    if (
      !this.hasValue(this.value['Beneficiary Party Key']) &&
      !this.hasValue(this.value['Beneficiary Surname']) &&
      !this.hasValue(this.value['Beneficiary Given Name']) &&
      !this.hasValue(this.value['Beneficiary Entity Name'])
    ) {
      return of(null);
    }

    const party: Omit<PartyGenType, 'partyIdentifier'> = {
      identifiers: { partyKey: this.value['Beneficiary Party Key']! },
      partyName: {
        surname: this.value['Beneficiary Surname'] || null,
        givenName: this.value['Beneficiary Given Name'] || null,
        otherOrInitial: this.value['Beneficiary Other Name'] || null,
        nameOfEntity: this.value['Beneficiary Entity Name'] || null,
      },
    };

    return generateParty(party);
  }
}
