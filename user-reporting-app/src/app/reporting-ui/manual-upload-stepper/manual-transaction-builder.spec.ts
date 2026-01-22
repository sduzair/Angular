import { FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE } from '../edit-form/form-options.fixture';
import { of } from 'rxjs';
import { ManualTransactionBuilder } from './manual-transaction-builder';
import { FormOptions } from '../edit-form/form-options.service';
import {
  EditFormComponent,
  InvalidFormOptionsErrors,
} from '../edit-form/edit-form.component';
import { TransactionDateDirective } from '../edit-form/transaction-date.directive';
import { TransactionTimeDirective } from '../edit-form/transaction-time.directive';
import { GetPartyInfoRes } from '../../transaction-search/transaction-search.service';
import { ColumnHeaderLabels } from './manual-upload-stepper.component';

describe('ManualTransactionBuilder', () => {
  let mockFormOptions: FormOptions;
  let mockGetPartyInfo: jasmine.Spy;
  let baseRowData: Record<ColumnHeaderLabels, string | null>;

  beforeEach(() => {
    // Mock FormOptions
    mockFormOptions = FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE;

    // Mock getPartyInfo function
    mockGetPartyInfo = jasmine.createSpy('getPartyInfo').and.returnValue(
      of({
        partyKey: 'P12345',
        surname: 'Doe',
        givenName: 'John',
        otherOrInitial: 'M',
        nameOfEntity: '',
      } satisfies GetPartyInfoRes),
    );

    // Base row data with all fields null
    baseRowData = {
      'AML Id': null,
      'Txn Date': null,
      'Txn Time': null,
      'Post Date': null,
      'Post Time': null,
      'Reporting Entity': null,
      'Method of Txn': null,
      Direction: null,
      'Funds Type': null,
      'Debit Amount': null,
      'Debit Currency': null,
      'Debit FIU': null,
      'Debit Branch': null,
      'Debit Account': null,
      'Debit Account Type': null,
      'Credit Amount': null,
      'Credit Currency': null,
      'Credit FIU': null,
      'Credit Branch': null,
      'Credit Account': null,
      'Credit Account Type': null,
      'Disposition Details': null,
      'Conductor Party Key': null,
      'Conductor Surname': null,
      'Conductor Given Name': null,
      'Conductor Other Name': null,
      'Conductor Entity Name': null,
      'Beneficiary Party Key': null,
      'Beneficiary Surname': null,
      'Beneficiary Given Name': null,
      'Beneficiary Other Name': null,
      'Beneficiary Entity Name': null,
    } as Record<ColumnHeaderLabels, string | null>;

    // Spy on static methods
    spyOn(EditFormComponent, 'validateFormOptions').and.returnValue(
      {} as InvalidFormOptionsErrors,
    );
    spyOn(TransactionDateDirective, 'parse').and.returnValue(
      new Date('2025-01-15'),
    );
    spyOn(TransactionTimeDirective, 'parseAndFormatTime').and.returnValue(
      '14:30:00',
    );
  });

  describe('Constructor', () => {
    it('should initialize with empty transaction and validation errors', () => {
      const builder = new ManualTransactionBuilder(
        baseRowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      expect(builder).toBeTruthy();
      expect(builder.flowOfFundsAmlTransactionId).toMatch(/^MTXN-/);
    });
  });

  describe('withMetadata()', () => {
    it('should set changeLogs and sourceId', () => {
      const builder = new ManualTransactionBuilder(
        baseRowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withMetadata();

      builder.build().subscribe((transaction) => {
        expect(transaction.changeLogs).toEqual([]);
        expect(transaction.sourceId).toBe('Manual');
      });
    });

    it('should return this for method chaining', () => {
      const builder = new ManualTransactionBuilder(
        baseRowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      const result = builder.withMetadata();

      expect(result).toBe(builder);
    });
  });

  describe('withBasicInfo()', () => {
    it('should set basic transaction fields', () => {
      const rowData = {
        ...baseRowData,
        'Txn Date': '2025-01-15',
        'Txn Time': '14:30',
        'Reporting Entity': 'RE-001',
        'Method of Txn': 'Wire Transfer',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withBasicInfo();

      builder.build().subscribe((transaction) => {
        expect(transaction.dateOfTxn).toBe('2025-01-15');
        expect(transaction.timeOfTxn).toBe('14:30');
        expect(transaction.reportingEntityLocationNo).toBe('RE-001');
        expect(transaction.methodOfTxn).toBe('Wire Transfer');
      });
    });

    it('should set hasPostingDate to true when Post Date has value', () => {
      const rowData = {
        ...baseRowData,
        'Post Date': '2025-01-16',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withBasicInfo();

      builder.build().subscribe((transaction) => {
        expect(transaction.hasPostingDate).toBe(true);
      });
    });

    it('should set methodOfTxnOther when method is unknown', () => {
      (EditFormComponent.validateFormOptions as jasmine.Spy).and.returnValue(
        null,
      );

      const rowData = {
        ...baseRowData,
        'Method of Txn': 'Unknown Method',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withBasicInfo();

      builder.build().subscribe((transaction) => {
        expect(transaction.methodOfTxn).toBeNull();
        expect(transaction.methodOfTxnOther).toBe('Unknown Method');
      });
    });
  });

  describe('withFlowOfFundsInfo()', () => {
    it('should set flow of funds fields', () => {
      const rowData = {
        ...baseRowData,
        'AML Id': '12345',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withFlowOfFundsInfo();

      builder.build().subscribe((transaction) => {
        expect(transaction.flowOfFundsAmlId).toBe(12345);
        expect(transaction.flowOfFundsSource).toBe('Manual');
        expect(transaction.flowOfFundsTransactionDesc).toBe('');
      });
    });
  });

  describe('withStartingAction()', () => {
    it('should create starting action with valid fields', () => {
      const rowData = {
        ...baseRowData,
        Direction: 'Incoming',
        'Funds Type': 'Cash',
        'Debit Amount': '1000.50',
        'Debit Currency': 'CAD',
        'Debit FIU': '002',
        'Debit Branch': '12345',
        'Debit Account': '987654321',
        'Debit Account Type': 'Savings',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withStartingAction();

      builder.build().subscribe((transaction) => {
        const sa = transaction.startingActions![0];

        expect(sa.directionOfSA).toBe('Incoming');
        expect(sa.typeOfFunds).toBe('Cash');
        expect(sa.amount).toBe(1000.5);
        expect(sa.currency).toBe('CAD');
        expect(sa.fiuNo).toBe('002');
        expect(sa.branch).toBe('12345');
        expect(sa.account).toBe('987654321');
        expect(sa.accountType).toBe('Savings');
      });
    });

    it('should add bankInfoMissing validation error for FIU 010 - starting action', () => {
      const rowData = {
        ...baseRowData,
        'Debit FIU': '010',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withStartingAction().withRowValidation().withValidationErrors();

      builder.build().subscribe((transaction) => {
        expect(transaction._hiddenValidation).toContain('bankInfoMissing');
      });
    });

    it('should set typeOfFundsOther when type is unknown', () => {
      (EditFormComponent.validateFormOptions as jasmine.Spy).and.callFake(
        (value: string, options: unknown, key: string) => {
          if (key === 'typeOfFunds') return null;
          return {};
        },
      );

      const rowData = {
        ...baseRowData,
        'Funds Type': 'Custom Type',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withStartingAction();

      builder.build().subscribe((transaction) => {
        const sa = transaction.startingActions![0];

        expect(sa.typeOfFunds).toBeNull();
        expect(sa.typeOfFundsOther).toBe('Custom Type');
      });
    });
  });

  describe('withCompletingAction()', () => {
    it('should create completing action with valid fields', () => {
      const rowData = {
        ...baseRowData,
        'Disposition Details': 'Deposited',
        'Credit Amount': '2500.75',
        'Credit Currency': 'USD',
        'Credit FIU': '003',
        'Credit Branch': '54321',
        'Credit Account': '123456789',
        'Credit Account Type': 'Checking',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withCompletingAction();

      builder.build().subscribe((transaction) => {
        const ca = transaction.completingActions![0];

        expect(ca.detailsOfDispo).toBe('Deposited');
        expect(ca.amount).toBe(2500.75);
        expect(ca.currency).toBe('USD');
        expect(ca.fiuNo).toBe('003');
        expect(ca.branch).toBe('54321');
        expect(ca.account).toBe('123456789');
        expect(ca.accountType).toBe('Checking');
      });
    });

    it('should add bankInfoMissing validation error for FIU 010 - completing action', () => {
      const rowData = {
        ...baseRowData,
        'Credit FIU': '010',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withCompletingAction().withRowValidation().withValidationErrors();

      builder.build().subscribe((transaction) => {
        expect(transaction._hiddenValidation).toContain('bankInfoMissing');
      });
    });
  });

  describe('build() with observables', () => {
    it('should fetch conductor info when party key is provided', (done) => {
      const rowData = {
        ...baseRowData,
        'Conductor Party Key': 'P12345',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withStartingAction();

      builder.build().subscribe((transaction) => {
        expect(mockGetPartyInfo).toHaveBeenCalledWith('P12345');
        expect(transaction.startingActions![0].conductors).toHaveSize(1);
        expect(transaction.startingActions![0].conductors![0].surname).toBe(
          'Doe',
        );

        expect(transaction.startingActions![0].wasCondInfoObtained).toBe(true);
        done();
      });
    });

    it('should create conductor from manual fields when party key is not provided', (done) => {
      const rowData = {
        ...baseRowData,
        'Conductor Surname': 'Smith',
        'Conductor Given Name': 'Jane',
        'Conductor Other Name': 'A',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withStartingAction();

      builder.build().subscribe((transaction) => {
        expect(mockGetPartyInfo).not.toHaveBeenCalled();
        expect(transaction.startingActions![0].conductors).toHaveSize(1);
        expect(transaction.startingActions![0].conductors![0].surname).toBe(
          'Smith',
        );

        expect(transaction.startingActions![0].conductors![0].givenName).toBe(
          'Jane',
        );
        done();
      });
    });

    it('should fetch beneficiary info when party key is provided', (done) => {
      const rowData = {
        ...baseRowData,
        'Beneficiary Party Key': 'P67890',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withCompletingAction();

      builder.build().subscribe((transaction) => {
        expect(mockGetPartyInfo).toHaveBeenCalledWith('P67890');
        expect(transaction.completingActions![0].beneficiaries).toHaveSize(1);
        expect(transaction.completingActions![0].wasBenInfoObtained).toBe(true);
        done();
      });
    });

    it('should handle both conductor and beneficiary with forkJoin', (done) => {
      const rowData = {
        ...baseRowData,
        'Conductor Party Key': 'P12345',
        'Beneficiary Party Key': 'P67890',
      };

      const builder = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withStartingAction().withCompletingAction();

      builder.build().subscribe((transaction) => {
        expect(mockGetPartyInfo).toHaveBeenCalledTimes(2);
        expect(transaction.startingActions![0].conductors).toHaveSize(1);
        expect(transaction.completingActions![0].beneficiaries).toHaveSize(1);
        done();
      });
    });

    it('should set null values when no conductor or beneficiary data provided', (done) => {
      const builder = new ManualTransactionBuilder(
        baseRowData,
        mockFormOptions,
        mockGetPartyInfo,
      );

      builder.withStartingAction().withCompletingAction();

      builder.build().subscribe((transaction) => {
        expect(transaction.startingActions![0].conductors).toEqual([]);
        expect(transaction.startingActions![0].wasCondInfoObtained).toBeNull();
        expect(transaction.completingActions![0].beneficiaries).toEqual([]);
        expect(transaction.completingActions![0].wasBenInfoObtained).toBeNull();
        done();
      });
    });
  });

  describe('Helper Methods', () => {
    describe('parseNumber()', () => {
      it('should parse valid number strings', () => {
        const builder = new ManualTransactionBuilder(
          baseRowData,
          mockFormOptions,
          mockGetPartyInfo,
        );

        const rowData = {
          ...baseRowData,
          'Debit Amount': '1234.56',
        };

        const builderWithData = new ManualTransactionBuilder(
          rowData,
          mockFormOptions,
          mockGetPartyInfo,
        );

        builderWithData.withStartingAction();

        builderWithData.build().subscribe((transaction) => {
          expect(transaction.startingActions![0].amount).toBe(1234.56);
        });
      });

      it('should return null for empty strings', () => {
        const rowData = {
          ...baseRowData,
          'Debit Amount': '',
        };

        const builder = new ManualTransactionBuilder(
          rowData,
          mockFormOptions,
          mockGetPartyInfo,
        );

        builder.withStartingAction();

        builder.build().subscribe((transaction) => {
          expect(transaction.startingActions![0].amount).toBeNull();
        });
      });

      it('should return null for invalid number strings', () => {
        const rowData = {
          ...baseRowData,
          'Debit Amount': 'not-a-number',
        };

        const builder = new ManualTransactionBuilder(
          rowData,
          mockFormOptions,
          mockGetPartyInfo,
        );

        builder.withStartingAction();

        builder.build().subscribe((transaction) => {
          expect(transaction.startingActions![0].amount).toBeNull();
        });
      });
    });

    describe('Date and Time Validation', () => {
      it('should add invalidDate error for invalid dates', () => {
        (TransactionDateDirective.parse as jasmine.Spy).and.returnValue(
          new Date('invalid'),
        );

        const rowData = {
          ...baseRowData,
          'Txn Date': 'invalid-date',
        };

        const builder = new ManualTransactionBuilder(
          rowData,
          mockFormOptions,
          mockGetPartyInfo,
        );

        builder.withBasicInfo().withRowValidation().withValidationErrors();

        builder.build().subscribe((transaction) => {
          expect(transaction._hiddenValidation).toContain('invalidDate');
        });
      });

      it('should add invalidTime error for invalid times', () => {
        (
          TransactionTimeDirective.parseAndFormatTime as jasmine.Spy
        ).and.returnValue(null);

        const rowData = {
          ...baseRowData,
          'Txn Time': 'invalid-time',
        };

        const builder = new ManualTransactionBuilder(
          rowData,
          mockFormOptions,
          mockGetPartyInfo,
        );

        builder.withBasicInfo().withRowValidation().withValidationErrors();

        builder.build().subscribe((transaction) => {
          expect(transaction._hiddenValidation).toContain('invalidTime');
        });
      });
    });
  });

  describe('Method Chaining', () => {
    it('should support full builder chain', (done) => {
      const rowData = {
        ...baseRowData,
        'AML Id': '999',
        'Txn Date': '2025-01-20',
        'Method of Txn': 'Cash',
        'Debit Amount': '500',
        'Credit Amount': '500',
      };

      const transaction$ = new ManualTransactionBuilder(
        rowData,
        mockFormOptions,
        mockGetPartyInfo,
      )
        .withMetadata()
        .withBasicInfo()
        .withFlowOfFundsInfo()
        .withStartingAction()
        .withCompletingAction()
        .withRowValidation()
        .withValidationErrors()
        .build();

      transaction$.subscribe((transaction) => {
        expect(transaction.sourceId).toBe('Manual');
        expect(transaction.flowOfFundsAmlId).toBe(999);
        expect(transaction.startingActions).toBeDefined();
        expect(transaction.completingActions).toBeDefined();
        done();
      });
    });
  });
});
