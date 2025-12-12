import {
  FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE,
  FormOptions,
} from '../edit-form/form-options.service';
import { ManualTransactionBuilder } from './manual-transaction-builder';
import { type ColumnHeaderLabels } from './manual-upload-stepper.component';

describe('ManualTransactionBuilder', () => {
  let builder: ManualTransactionBuilder;
  let mockValue: Record<ColumnHeaderLabels, string | null>;
  let mockFormOptions: FormOptions;

  beforeEach(() => {
    // Setup minimal mock data
    mockValue = {
      'Txn Date': '2024/01/13',
      'Txn Time': '7:21:16',
      'Post Date': null,
      'Post Time': null,
      'Txn Type': 'ABM',
      'Method of Txn': 'Online',
      'Reporting Entity': '84255',
      Direction: 'In',
      'Funds Type': 'Cash',
      'Debit Amount': '3840',
      'Debit Currency': 'CAD',
      'Debit FIU': null,
      'Debit Branch': null,
      'Debit Account': null,
      'Debit Account Type': null,
      'Conductor Party Key': '3415674561',
      'Conductor Given Name': 'James',
      'Conductor Surname': 'Carter',
      'Conductor Other Name': 'L',
      'Conductor Entity Name': null,
      'Disposition Details': 'Deposit to account',
      'Credit Amount': '3840',
      'Credit Currency': 'CAD',
      'Credit FIU': '010',
      'Credit Branch': '84255',
      'Credit Account': '5582195',
      'Credit Account Type': 'Personal',
      'Beneficiary Party Key': '3415674561',
      'Beneficiary Given Name': 'James',
      'Beneficiary Surname': 'Carter',
      'Beneficiary Other Name': 'L',
      'Beneficiary Entity Name': null,
      'AML Id': '999999',
    } as Record<ColumnHeaderLabels, string | null>;

    mockFormOptions = FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE;

    builder = new ManualTransactionBuilder(mockValue, mockFormOptions);
  });

  describe('integrity checks', () => {
    it('should always create empty array for array props', () => {
      const transaction = builder
        .withMetadata()
        .withBasicInfo()
        .withFlowOfFundsInfo()
        .withStartingAction()
        .withCompletingAction()
        .withRowValidation()
        .withValidationErrors()
        .build();

      // Verify top-level arrays are always initialized
      expect(Array.isArray(transaction.changeLogs)).toBe(true);
      expect(Array.isArray(transaction.startingActions)).toBe(true);
      expect(Array.isArray(transaction.completingActions)).toBe(true);

      // Verify nested arrays in startingActions
      expect(Array.isArray(transaction.startingActions[0].accountHolders)).toBe(
        true,
      );

      expect(Array.isArray(transaction.startingActions[0].sourceOfFunds)).toBe(
        true,
      );

      expect(Array.isArray(transaction.startingActions[0].conductors)).toBe(
        true,
      );

      expect(
        Array.isArray(transaction.startingActions[0].conductors![0].onBehalfOf),
      ).toBe(true);

      // Verify nested arrays in completingActions
      expect(
        Array.isArray(transaction.completingActions[0].accountHolders),
      ).toBe(true);

      expect(Array.isArray(transaction.completingActions[0].involvedIn)).toBe(
        true,
      );

      expect(
        Array.isArray(transaction.completingActions[0].beneficiaries),
      ).toBe(true);

      expect(Array.isArray(transaction._hiddenValidation)).toBe(true);
    });

    it('should define empty array even when conductor/beneficiary are absent', () => {
      // Test without conductor and beneficiary
      const valueWithoutConductorBeneficiary = {
        ...mockValue,
        'Conductor Party Key': null,
        'Conductor Given Name': null,
        'Conductor Surname': null,
        'Conductor Other Name': null,
        'Conductor Entity Name': null,

        'Beneficiary Party Key': null,
        'Beneficiary Given Name': null,
        'Beneficiary Surname': null,
        'Beneficiary Other Name': null,
        'Beneficiary Entity Name': null,
      };

      builder = new ManualTransactionBuilder(
        valueWithoutConductorBeneficiary,
        mockFormOptions,
      );

      const transaction = builder
        .withMetadata()
        .withBasicInfo()
        .withFlowOfFundsInfo()
        .withStartingAction()
        .withCompletingAction()
        .withRowValidation()
        .withValidationErrors()
        .build();

      expect(Array.isArray(transaction.startingActions[0].conductors)).toBe(
        true,
      );

      expect(
        Array.isArray(transaction.completingActions[0].beneficiaries),
      ).toBe(true);
    });

    // note: add checks for array props like accountHolders, sourceOfFunds, involvedIn if manual upload is updated to accept these values
    it('should always create _id prop for array items', () => {
      // Test with conductor and beneficiary present
      const valueWithConductorAndBeneficiary = {
        ...mockValue,
        'Conductor Party Key': '1231241444',
        'Conductor Surname': 'Smith',
        'Beneficiary Party Key': '6231241465',
        'Beneficiary Surname': 'Jones',
      };

      builder = new ManualTransactionBuilder(
        valueWithConductorAndBeneficiary,
        mockFormOptions,
      );

      const transaction = builder
        .withMetadata()
        .withBasicInfo()
        .withFlowOfFundsInfo()
        .withStartingAction()
        .withCompletingAction()
        .withRowValidation()
        .withValidationErrors()
        .build();

      // Verify startingAction has _id
      const startingAction = transaction.startingActions[0];

      expect(startingAction._id).toBeDefined();
      expect(typeof startingAction._id).toBe('string');
      expect(startingAction._id!.length).toBeGreaterThan(0);

      // Verify completingAction has _id
      const completingAction = transaction.completingActions[0];

      expect(completingAction._id).toBeDefined();
      expect(typeof completingAction._id).toBe('string');
      expect(completingAction._id!.length).toBeGreaterThan(0);

      // Verify conductor has _id when present
      const conductor = startingAction.conductors![0];

      expect(conductor._id).toBeDefined();
      expect(typeof conductor._id).toBe('string');
      expect(conductor._id!.length).toBeGreaterThan(0);

      // Verify beneficiary has _id when present
      const beneficiary = completingAction.beneficiaries![0];

      expect(beneficiary._id).toBeDefined();
      expect(typeof beneficiary._id).toBe('string');
      expect(beneficiary._id!.length).toBeGreaterThan(0);

      // Verify all _id values are unique
      const ids = [
        startingAction._id,
        completingAction._id,
        conductor._id,
        beneficiary._id,
      ].filter(Boolean);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
