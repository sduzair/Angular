import { of, throwError } from 'rxjs';
import { GetPartyInfoRes } from '../../transaction-search/transaction-search.service';
import { FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE } from '../edit-form/form-options.fixture';
import { ManualTransactionBuilder } from './manual-transaction-builder';
import { ColumnHeaderLabels } from './manual-upload-stepper.component';

describe('ManualTransactionBuilder', () => {
  let mockGetPartyInfo: jasmine.Spy;
  let baseValue: Record<ColumnHeaderLabels, string | null>;

  beforeEach(() => {
    mockGetPartyInfo = jasmine.createSpy('getPartyInfo');

    baseValue = {
      'AML Id': '123',
      'Txn Date': '2025-01-15',
      'Txn Time': '14:30',
      'Post Date': null,
      'Post Time': null,
      'Reporting Entity': 'Entity001',
      'Method of Txn': 'Online',
      'Transaction Description': 'Test transaction',
      Direction: 'In',
      'Funds Type': 'Cash',
      'Debit Amount': '1000',
      'Debit Currency': 'CAD',
      'Debit FIU': 'FIU001',
      'Debit Branch': 'Branch001',
      'Debit Account': 'ACC123',
      'Debit Account Type': 'Personal',
      'Disposition Details': 'Deposit to account',
      'Credit Amount': '1000',
      'Credit Currency': 'CAD',
      'Credit FIU': 'FIU002',
      'Credit Branch': 'Branch002',
      'Credit Account': 'ACC456',
      'Credit Account Type': 'Business',
      'Conductor Party Key': null,
      'Conductor _hiddenSurname': null,
      'Conductor Given Name': null,
      'Conductor Other Name': null,
      'Conductor Entity Name': null,
      'Beneficiary Party Key': null,
      'Beneficiary _hiddenSurname': null,
      'Beneficiary Given Name': null,
      'Beneficiary Other Name': null,
      'Beneficiary Entity Name': null,
    } as Record<ColumnHeaderLabels, string | null>;
  });

  describe('constructor', () => {
    it('should initialize with empty transaction and validation errors', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      expect(builder).toBeTruthy();
      expect(builder['transaction']).toEqual({});
      expect(builder['validationErrors']).toEqual([]);
    });

    it('should generate unique flowOfFundsAmlTransactionId starting with MTXN-', () => {
      const builder1 = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const builder2 = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      expect(builder1.flowOfFundsAmlTransactionId).toMatch(/^MTXN-/);
      expect(builder2.flowOfFundsAmlTransactionId).toMatch(/^MTXN-/);
      expect(builder1.flowOfFundsAmlTransactionId).not.toBe(
        builder2.flowOfFundsAmlTransactionId,
      );
    });
  });

  describe('trimValues', () => {
    it('should trim all string values in the value record', () => {
      const valueWithSpaces = {
        ...baseValue,
        'Transaction Description': '  Test transaction  ',
        'Debit FIU': '  FIU001  ',
      };

      const builder = new ManualTransactionBuilder(
        valueWithSpaces,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.trimValues();

      expect(builder['value']['Transaction Description']).toBe(
        'Test transaction',
      );

      expect(builder['value']['Debit FIU']).toBe('FIU001');
    });

    it('should handle null values without error', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.trimValues();

      expect(builder['value']['Post Date']).toBeNull();
    });

    it('should return this for chaining', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.trimValues();

      expect(result).toBe(builder);
    });
  });

  describe('withMetadata', () => {
    it('should set empty changeLogs and Manual sourceId', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.withMetadata();

      expect(builder['transaction'].changeLogs).toEqual([]);
      expect(builder['transaction'].sourceId).toBe('Manual');
    });

    it('should return this for chaining - metadata', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withMetadata();

      expect(result).toBe(builder);
    });
  });

  describe('withBasicInfo', () => {
    it('should populate basic transaction info with valid data', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.withBasicInfo();

      expect(builder['transaction'].wasTxnAttempted).toBeNull();
      expect(builder['transaction'].wasTxnAttemptedReason).toBeNull();
      expect(builder['transaction'].dateOfTxn).toBe('2025-01-15');
      expect(builder['transaction'].timeOfTxn).toBe('14:30:00');
      expect(builder['transaction'].hasPostingDate).toBeNull();
      expect(builder['transaction'].dateOfPosting).toBeNull();
      expect(builder['transaction'].timeOfPosting).toBeNull();
      expect(builder['transaction'].reportingEntityTxnRefNo).toMatch(/^MTXN-/);
      expect(builder['transaction'].purposeOfTxn).toBeNull();
      expect(builder['transaction'].reportingEntityLocationNo).toBe(
        'Entity001',
      );

      expect(builder['transaction'].methodOfTxn).toBe('Online');
      expect(builder['transaction'].methodOfTxnOther).toBeNull();
    });

    it('should handle posting date and time when provided', () => {
      const valueWithPosting = {
        ...baseValue,
        'Post Date': '2025-01-16',
        'Post Time': '10:00',
      };
      const builder = new ManualTransactionBuilder(
        valueWithPosting,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.withBasicInfo();

      expect(builder['transaction'].hasPostingDate).toBe(true);
      expect(builder['transaction'].dateOfPosting).toBe('2025-01-16');
      expect(builder['transaction'].timeOfPosting).toBe('10:00:00');
    });

    it('should handle unknown methodOfTxn as Other', () => {
      const valueWithUnknownMethod = {
        ...baseValue,
        'Method of Txn': 'UnknownMethod',
      };
      const builder = new ManualTransactionBuilder(
        valueWithUnknownMethod,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder.withBasicInfo();

      expect(builder['transaction'].methodOfTxn).toBeNull();
      expect(builder['transaction'].methodOfTxnOther).toBe('UnknownMethod');
      expect(builder['validationErrors']).toContain('invalidMethodOfTxn');
    });

    it('should return this for chaining - basic info', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withBasicInfo();

      expect(result).toBe(builder);
    });
  });

  describe('withFlowOfFundsInfo', () => {
    it('should populate flow of funds information', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.withFlowOfFundsInfo();

      const txn = builder['transaction'];

      expect(txn.flowOfFundsAccountCurrency).toBeNull();
      expect(txn.flowOfFundsAmlId).toBe(123);
      expect(txn.flowOfFundsAmlTransactionId).toMatch(/^MTXN-/);
      expect(txn.flowOfFundsCasePartyKey).toBeNull();
      expect(txn.flowOfFundsSource).toBe('Manual');
      expect(txn.flowOfFundsTransactionDesc).toBe('Test transaction');
    });

    it('should handle missing AML ID', () => {
      const valueWithoutAmlId = {
        ...baseValue,
        'AML Id': null,
      };
      const builder = new ManualTransactionBuilder(
        valueWithoutAmlId,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.withFlowOfFundsInfo();

      expect(builder['transaction'].flowOfFundsAmlId).toBe(0);
    });

    it('should return this for chaining - fof info', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withFlowOfFundsInfo();

      expect(result).toBe(builder);
    });
  });

  describe('withStartingAction', () => {
    it('should create starting action with valid data', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.withStartingAction();

      const startingAction = builder['transaction'].startingActions![0];

      expect(startingAction._id).toBeTruthy();
      expect(startingAction.directionOfSA).toBe('In');
      expect(startingAction.typeOfFunds).toBe('Cash');
      expect(startingAction.typeOfFundsOther).toBeNull();
      expect(startingAction.amount).toBe(1000);
      expect(startingAction.currency).toBe('CAD');
      expect(startingAction.fiuNo).toBe('FIU001');
      expect(startingAction.branch).toBe('Branch001');
      expect(startingAction.account).toBe('ACC123');
      expect(startingAction.accountType).toBe('Personal');
      expect(startingAction.accountTypeOther).toBeNull();
      expect(startingAction.conductors).toEqual([]);
    });

    it('should handle unknown field values as Other', () => {
      const valueWithUnknownFields = {
        ...baseValue,
        Direction: 'UnknownDirection',
        'Funds Type': 'UnknownFunds',
        'Debit Currency': 'XXX',
        'Debit Account Type': 'UnknownType',
      };

      const builder = new ManualTransactionBuilder(
        valueWithUnknownFields,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder.withStartingAction();

      const startingAction = builder['transaction'].startingActions![0];

      expect(startingAction.directionOfSA).toBeNull();
      expect(startingAction.typeOfFunds).toBeNull();
      expect(startingAction.typeOfFundsOther).toBe('UnknownFunds');
      expect(startingAction.currency).toBeNull();
      expect(startingAction.accountType).toBeNull();
      expect(startingAction.accountTypeOther).toBe('UnknownType');
    });

    it('should return this for chaining - starting action', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withStartingAction();

      expect(result).toBe(builder);
    });

    it('should create arrays - starting action', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withStartingAction();

      expect(
        Array.isArray(
          result['transaction'].startingActions![0]!.accountHolders,
        ),
      ).toBeTrue();

      expect(
        Array.isArray(result['transaction'].startingActions![0]!.sourceOfFunds),
      ).toBeTrue();

      expect(
        Array.isArray(result['transaction'].startingActions![0]!.conductors),
      ).toBeTrue();
    });
  });

  describe('withCompletingAction', () => {
    it('should create completing action with valid data', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder.withCompletingAction();

      const completingAction = builder['transaction'].completingActions![0];

      expect(completingAction._id).toBeTruthy();
      expect(completingAction.detailsOfDispo).toBe('Deposit to account');
      expect(completingAction.detailsOfDispoOther).toBeNull();
      expect(completingAction.amount).toBe(1000);
      expect(completingAction.currency).toBe('CAD');
      expect(completingAction.fiuNo).toBe('FIU002');
      expect(completingAction.branch).toBe('Branch002');
      expect(completingAction.account).toBe('ACC456');
      expect(completingAction.accountType).toBe('Business');
      expect(completingAction.accountTypeOther).toBeNull();
      expect(completingAction.beneficiaries).toEqual([]);
    });

    it('should handle unknown disposition details as Other', () => {
      const valueWithUnknownDispo = {
        ...baseValue,
        'Disposition Details': 'UnknownDisposition',
      };

      const builder = new ManualTransactionBuilder(
        valueWithUnknownDispo,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder.withCompletingAction();

      const completingAction = builder['transaction'].completingActions![0];

      expect(completingAction.detailsOfDispo).toBeNull();
      expect(completingAction.detailsOfDispoOther).toBe('UnknownDisposition');
    });

    it('should return this for chaining - completing action', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withCompletingAction();

      expect(result).toBe(builder);
    });

    it('should create arrays - completing action', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withCompletingAction();

      expect(
        Array.isArray(
          result['transaction'].completingActions![0]!.accountHolders,
        ),
      ).toBeTrue();

      expect(
        Array.isArray(result['transaction'].completingActions![0]!.involvedIn),
      ).toBeTrue();

      expect(
        Array.isArray(
          result['transaction'].completingActions![0]!.beneficiaries,
        ),
      ).toBeTrue();
    });
  });

  describe('withValidationErrors', () => {
    it('should add validation errors to transaction', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder['validationErrors'] = ['invalidDate', 'invalidTime'];
      builder.withValidationErrors();

      expect(builder['transaction']._hiddenValidation).toContain('invalidDate');
      expect(builder['transaction']._hiddenValidation).toContain('invalidTime');
    });

    it('should initialize _hiddenValidation array if undefined', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      builder['validationErrors'] = ['invalidDate'];
      builder.withValidationErrors();

      expect(builder['transaction']._hiddenValidation).toBeDefined();
      expect(builder['transaction']._hiddenValidation).toEqual(['invalidDate']);
    });

    it('should return this for chaining - validation errors', () => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
      const result = builder.withValidationErrors();

      expect(result).toBe(builder);
    });
  });

  describe('build', () => {
    it('should build complete transaction with conductor and beneficiary from party keys', (done) => {
      const mockConductorParty: GetPartyInfoRes = {
        _hiddenPartyKey: 'PARTY001',
        _hiddenSurname: 'Doe',
        _hiddenGivenName: 'John',
        _hiddenOtherOrInitial: 'M',
        _hiddenNameOfEntity: '',
      };

      const mockBeneficiaryParty: GetPartyInfoRes = {
        _hiddenPartyKey: 'PARTY002',
        _hiddenSurname: 'Smith',
        _hiddenGivenName: 'Jane',
        _hiddenOtherOrInitial: '',
        _hiddenNameOfEntity: '',
      };

      mockGetPartyInfo.and.returnValues(
        of(mockConductorParty),
        of(mockBeneficiaryParty),
      );

      const valueWithPartyKeys = {
        ...baseValue,
        'Conductor Party Key': 'PARTY001',
        'Beneficiary Party Key': 'PARTY002',
      };

      const builder = new ManualTransactionBuilder(
        valueWithPartyKeys,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder
        .withMetadata()
        .withBasicInfo()
        .withStartingAction()
        .withCompletingAction()
        .build()
        .subscribe((transaction) => {
          expect(transaction.startingActions![0].wasCondInfoObtained).toBe(
            true,
          );

          expect(transaction.startingActions![0].conductors!.length).toBe(1);
          expect(
            transaction.startingActions![0].conductors![0]._hiddenPartyKey,
          ).toBe('PARTY001');

          expect(transaction.completingActions![0].wasBenInfoObtained).toBe(
            true,
          );

          expect(transaction.completingActions![0].beneficiaries!.length).toBe(
            1,
          );

          expect(
            transaction.completingActions![0].beneficiaries![0]._hiddenPartyKey,
          ).toBe('PARTY002');

          done();
        });
    });

    it('should build transaction with manual party names when no party keys', (done) => {
      const valueWithNames = {
        ...baseValue,
        'Conductor _hiddenSurname': 'Doe',
        'Conductor Given Name': 'John',
        'Beneficiary Entity Name': 'Acme Corp',
      };

      const builder = new ManualTransactionBuilder(
        valueWithNames,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder
        .withMetadata()
        .withStartingAction()
        .withCompletingAction()
        .build()
        .subscribe((transaction) => {
          const conductor = transaction.startingActions![0].conductors![0];

          expect(conductor._hiddenSurname).toBe('Doe');
          expect(conductor._hiddenGivenName).toBe('John');
          expect(conductor._hiddenPartyKey).toBeNull();

          const beneficiary =
            transaction.completingActions![0].beneficiaries![0];

          expect(beneficiary._hiddenNameOfEntity).toBe('Acme Corp');
          expect(beneficiary._hiddenPartyKey).toBeNull();

          done();
        });
    });

    it('should handle missing conductor and beneficiary', (done) => {
      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder
        .withStartingAction()
        .withCompletingAction()
        .build()
        .subscribe((transaction) => {
          expect(
            transaction.startingActions![0].wasCondInfoObtained,
          ).toBeNull();

          expect(transaction.startingActions![0].conductors).toEqual([]);
          expect(
            transaction.completingActions![0].wasBenInfoObtained,
          ).toBeNull();

          expect(transaction.completingActions![0].beneficiaries).toEqual([]);

          done();
        });
    });

    it('should add invalidPartyKey error when getPartyInfo fails', (done) => {
      mockGetPartyInfo.and.returnValue(
        throwError(() => new Error('Party not found')),
      );

      const valueWithInvalidKey = {
        ...baseValue,
        'Conductor Party Key': 'INVALID',
      };

      const builder = new ManualTransactionBuilder(
        valueWithInvalidKey,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder
        .withStartingAction()
        .withCompletingAction()
        .build()
        .subscribe((transaction) => {
          expect(transaction._hiddenValidation).toContain('invalidPartyKey');
          expect(transaction.startingActions![0].conductors).toEqual([]);

          done();
        });
    });
  });

  describe('parseNumber', () => {
    let builder: ManualTransactionBuilder;

    beforeEach(() => {
      builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
    });

    it('should parse valid number strings', () => {
      expect(builder['parseNumber']('1000')).toBe(1000);
      expect(builder['parseNumber']('1000.50')).toBe(1000.5);
      expect(builder['parseNumber']('0')).toBe(0);
      expect(builder['parseNumber']('-500')).toBe(-500);
    });

    it('should return null for empty or whitespace strings', () => {
      expect(builder['parseNumber']('')).toBeNull();
      expect(builder['parseNumber']('   ')).toBeNull();
      expect(builder['parseNumber'](null)).toBeNull();
      expect(builder['parseNumber'](undefined)).toBeNull();
    });

    it('should return null for invalid numbers', () => {
      expect(builder['parseNumber']('abc')).toBeNull();
      expect(builder['parseNumber']('12abc')).toBeNull();
    });
  });

  describe('hasValue', () => {
    let builder: ManualTransactionBuilder;

    beforeEach(() => {
      builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
    });

    it('should return true for non-empty strings', () => {
      expect(builder['hasValue']('test')).toBe(true);
      expect(builder['hasValue']('0')).toBe(true);
    });

    it('should return false for null, undefined, or empty strings', () => {
      expect(builder['hasValue'](null)).toBe(false);
      expect(builder['hasValue'](undefined)).toBe(false);
      expect(builder['hasValue']('')).toBe(false);
      expect(builder['hasValue']('   ')).toBe(false);
    });
  });

  describe('parseDateField', () => {
    let builder: ManualTransactionBuilder;
    let baseValueClone: Record<ColumnHeaderLabels, string | null>;

    beforeEach(() => {
      baseValueClone = structuredClone(baseValue);
      builder = new ManualTransactionBuilder(
        baseValueClone,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
    });

    it('should parse valid date and return original string', () => {
      builder['parseDateField']('Txn Date');

      expect(builder['validationErrors'].length).toBe(0);
    });

    it('should return null for missing dates', () => {
      const result = builder['parseDateField']('Post Date');

      expect(result).toBeNull();
    });

    it('should add invalidDate error and return null for invalid dates', () => {
      baseValueClone['Txn Date'] = '33.33.2022';
      builder.withBasicInfo();

      expect(builder['validationErrors']).toContain('invalidDate');
    });
  });

  describe('parseTimeField', () => {
    let builder: ManualTransactionBuilder;
    let baseValueClone: Record<ColumnHeaderLabels, string | null>;

    beforeEach(() => {
      baseValueClone = structuredClone(baseValue);
      builder = new ManualTransactionBuilder(
        baseValueClone,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );
    });

    it('should parse valid time and return original string', () => {
      const result = builder['parseTimeField']('Txn Time');

      expect(result).toBe('14:30:00');
    });

    it('should return null for missing times', () => {
      const result = builder['parseTimeField']('Post Time');

      expect(result).toBeNull();
    });

    it('should add invalidTime error and return null for invalid times', () => {
      baseValueClone['Txn Time'] = '33:33';
      builder.withBasicInfo();

      expect(builder['validationErrors']).toContain('invalidTime');
    });
  });

  describe('integration: full builder chain', () => {
    it('should build complete transaction using method chaining', (done) => {
      mockGetPartyInfo.and.returnValues(of(null), of(null));

      const builder = new ManualTransactionBuilder(
        baseValue,
        FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
        mockGetPartyInfo,
      );

      builder
        .trimValues()
        .withMetadata()
        .withBasicInfo()
        .withFlowOfFundsInfo()
        .withStartingAction()
        .withCompletingAction()
        .withValidationErrors()
        .build()
        .subscribe((transaction) => {
          expect(transaction.sourceId).toBe('Manual');
          expect(transaction.changeLogs).toEqual([]);
          expect(transaction.dateOfTxn).toBe('2025-01-15');
          expect(transaction.flowOfFundsAmlId).toBe(123);
          expect(transaction.startingActions).toBeDefined();
          expect(transaction.completingActions).toBeDefined();
          expect(transaction.startingActions!.length).toBe(1);
          expect(transaction.completingActions!.length).toBe(1);

          done();
        });
    });
  });
});
