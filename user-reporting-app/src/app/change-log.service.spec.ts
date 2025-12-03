import {
  ChangeLog,
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from './change-log.service';
import { SPECIAL_EMPTY_VALUE } from './reporting-ui/edit-form/mark-as-empty.directive';
import {
  StartingAction,
  StrTransaction,
} from './reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { DeepPartial } from './test-helpers';

describe('ChangeLogService', () => {
  let service: ChangeLogService;
  let transactionBefore: WithVersion<DeepPartial<StrTransaction>> = null!;
  let transactionAfter: WithVersion<DeepPartial<StrTransaction>> = null!;

  beforeEach(() => {
    service = new ChangeLogService();
    // Mock StrTransaction structure
    const mockTransaction = {
      purposeOfTxn: 'savings',
      startingActions: [
        {
          _id: 'sa1',
          currency: 'CAD',
        },
      ],
      _version: 0,
    };
    transactionBefore = structuredClone(mockTransaction);
    transactionAfter = structuredClone(mockTransaction);
  });

  describe('applyChanges', () => {
    it('should apply simple property change', () => {
      transactionBefore.purposeOfTxn = 'savings';
      const changes: ChangeLog[] = [
        {
          path: 'purposeOfTxn',
          oldValue: 'savings',
          newValue: 'grocery',
          version: 1,
        },
      ];

      const result = service.applyChanges(transactionBefore, changes);

      expect(result.purposeOfTxn).toBe('grocery');
      expect(result._version).toBe(1);
    });

    it('should apply simple property change from undefined', () => {
      transactionBefore.purposeOfTxn = undefined;
      const changes: ChangeLog[] = [
        {
          path: 'purposeOfTxn',
          oldValue: undefined,
          newValue: 'trade',
          version: 1,
        },
      ];

      const result = service.applyChanges(transactionBefore, changes);

      expect(result.purposeOfTxn).toBe('trade');
      expect(result._version).toBe(1);
    });

    it('should apply array property change', () => {
      transactionBefore.startingActions![0]!.currency = 'CAD';
      const changes: ChangeLog[] = [
        {
          path: 'startingActions.$idx=0.currency',
          oldValue: 'CAD',
          newValue: 'USD',
          version: 1,
        },
      ];

      const result = service.applyChanges(transactionBefore, changes);

      expect(result?.startingActions?.[0]?.currency).toBe('USD');
      expect(result._version).toBe(1);
    });

    it('should throw when applying change to non existent item in array', () => {
      transactionBefore.startingActions = [
        {
          _id: 'sa1',
          currency: 'CAD',
        },
      ];
      const changes: ChangeLog[] = [
        {
          path: 'startingActions.$id=sa234.currency',
          oldValue: 'CAD',
          newValue: 'USD',
          version: 1,
        },
      ];

      expect(() =>
        service.applyChanges(transactionBefore, changes),
      ).toThrowError(
        'unknown target index: accessing non existent item in array',
      );
    });

    it('should throw on unknown array segment', () => {
      transactionBefore.startingActions![0]!.currency = 'CAD';
      const changes: ChangeLog[] = [
        {
          path: 'startingActions.firstSA.currency',
          oldValue: 'CAD',
          newValue: 'USD',
          version: 1,
        },
      ];

      expect(() =>
        service.applyChanges(transactionBefore, changes),
      ).toThrowError('unknown array segment');
    });

    it('should throw on array access for nested simple property', () => {
      (
        transactionBefore as unknown as {
          name: { first: string; last: string };
        }
      ).name = {
        first: 'uzair',
        last: 'syed',
      };

      const changes: ChangeLog[] = [
        {
          path: 'name.$idx=0.first',
          oldValue: 'uzair',
          newValue: 'jon',
          version: 1,
        },
      ];

      expect(() =>
        service.applyChanges(transactionBefore, changes),
      ).toThrowError('exptected array invalid array access');
    });

    it('should remove entire array', () => {
      transactionBefore.startingActions = [{ _id: 'sa1', branch: '123' }];
      const changes: ChangeLog[] = [
        {
          path: 'startingActions',
          oldValue: transactionBefore.startingActions,
          newValue: undefined,
          version: 1,
        },
      ];
      const result = service.applyChanges(transactionBefore, changes);

      expect(result.startingActions).toBeUndefined();
      expect(result._version).toBe(1);
    });

    it('should throw for add new array item when current array prop is undefined', () => {
      transactionBefore.startingActions = undefined;
      const newSa: DeepPartial<StartingAction> = {
        _id: 'sa1',
        typeOfFundsOther: 'investment',
      };
      const changes: ChangeLog[] = [
        {
          path: 'startingActions',
          oldValue: undefined,
          newValue: newSa,
          version: 1,
        },
      ];

      expect(() =>
        service.applyChanges(transactionBefore, changes),
      ).toThrowError('add new array item when current array prop is undefined');
    });

    it('should throw for entire array addition when current is already non zero length array', () => {
      transactionBefore.startingActions = [
        { _id: 'sa1', typeOfFundsOther: 'paycheque' },
      ];
      const newSa: DeepPartial<StartingAction> = {
        _id: 'sa1',
        typeOfFundsOther: 'investment',
      };
      const changes: ChangeLog[] = [
        {
          path: 'startingActions',
          oldValue: undefined,
          newValue: [newSa],
          version: 1,
        },
      ];

      expect(() =>
        service.applyChanges(transactionBefore, changes),
      ).toThrowError('entire array addition when current is already array');
    });

    it('should add entire array when property is empty', () => {
      transactionBefore.startingActions = undefined;
      const newArray = [{ _id: 'sa1', branch: '123' }];
      const changes: ChangeLog[] = [
        {
          path: 'startingActions',
          oldValue: undefined,
          newValue: newArray,
          version: 1,
        },
      ];

      const result = service.applyChanges(transactionBefore, changes);

      expect(result.startingActions).toBeDefined();
      expect(result.startingActions!.length).toBe(1);
      expect(result.startingActions!).toEqual(newArray);
      expect(result._version).toBe(1);
    });

    describe('for items with _id as discriminator', () => {
      it('should add new array item', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            currency: 'CAD',
          },
        ];
        const newSa: DeepPartial<StartingAction> = {
          _id: 'sa2',
          typeOfFundsOther: 'investment',
        };
        const changes: ChangeLog[] = [
          {
            path: 'startingActions',
            oldValue: undefined,
            newValue: newSa,
            version: 1,
          },
        ];

        const result = service.applyChanges(transactionBefore, changes);

        expect(result?.startingActions?.length).toBe(2);
        expect(result?.startingActions![1]).toEqual(newSa);
        expect(result._version).toBe(1);
      });

      it('should remove array item', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            currency: 'CAD',
          },
        ];
        const changes: ChangeLog[] = [
          {
            path: 'startingActions.$id=sa1',
            oldValue: {
              _id: 'sa1',
              currency: 'CAD',
            },
            newValue: undefined,
            version: 1,
          },
        ];

        const result = service.applyChanges(transactionBefore, changes);

        expect(result.startingActions!.length).toBe(0);
        expect(result._version).toBe(1);
      });

      it('should modify array item property', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            currency: 'CAD',
          },
        ];
        const changes: ChangeLog[] = [
          {
            path: 'startingActions.$id=sa1.currency',
            oldValue: 'CAD',
            newValue: 'USD',
            version: 1,
          },
        ];

        const result = service.applyChanges(transactionBefore, changes);

        const sa1 = result.startingActions!.find((a) => a!._id === 'sa1');
        expect(sa1?.currency).toBe('USD');
        expect(result._version).toBe(1);
      });
    });

    describe('for items with index as discriminator', () => {
      it('should add new array item', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            currency: 'CAD',
          },
        ];
        const saNew: DeepPartial<StartingAction> = {
          _id: 'sa2',
          wasCondInfoObtained: true,
          conductors: [{ givenName: 'nobody' }],
        };
        const changes: ChangeLog[] = [
          {
            path: 'startingActions',
            oldValue: undefined,
            newValue: saNew,
            version: 1,
          },
        ];

        const result = service.applyChanges(transactionBefore, changes);

        expect(result?.startingActions?.length).toBe(2);
        expect(result?.startingActions![1]).toEqual(saNew);
        expect(result._version).toBe(1);
      });

      it('should remove array item', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            currency: 'CAD',
          },
        ];
        const changes: ChangeLog[] = [
          {
            path: 'startingActions.$idx=0',
            oldValue: {
              _id: 'sa1',
              currency: 'CAD',
            },
            newValue: undefined,
            version: 1,
          },
        ];

        const result = service.applyChanges(transactionBefore, changes);

        expect(result.startingActions!.length).toBe(0);
        expect(result._version).toBe(1);
      });

      it('should modify array item property', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            currency: 'CAD',
          },
        ];
        const changes: ChangeLog[] = [
          {
            path: 'startingActions.$idx=0.currency',
            oldValue: 'CAD',
            newValue: 'USD',
            version: 1,
          },
        ];

        const result = service.applyChanges(transactionBefore, changes);

        const sa1 = result.startingActions![0];
        expect(sa1?.currency).toBe('USD');
        expect(result._version).toBe(1);
      });
    });

    describe('should apply bulk edit change logs', () => {
      it('existing underlying object set to undefined', () => {
        transactionBefore.purposeOfTxn = 'savings';
        transactionBefore.startingActions = [{ directionOfSA: 'Out' }];

        const changes: ChangeLog[] = [
          {
            path: 'startingActions.$idx=0.directionOfSA',
            oldValue: 'Out',
            newValue: undefined,
            version: 1,
          },
        ];

        const result = service.applyChanges(transactionBefore, changes);

        expect(result.startingActions![0]!.directionOfSA).toBeUndefined();
        expect(result._version).toBe(1);
      });
    });

    it('should immutably apply change logs', () => {
      transactionBefore.startingActions = [
        {
          _id: 'sa1',
          currency: 'CAD',
        },
      ];
      const newSa: DeepPartial<StartingAction> = {
        _id: 'sa2',
        typeOfFundsOther: 'investment',
      };
      const changes: ChangeLog[] = [
        {
          path: 'startingActions',
          oldValue: undefined,
          newValue: newSa,
          version: 1,
        },
      ];
      const originalChanges = structuredClone(changes);

      const result = service.applyChanges(transactionBefore, changes);

      expect(result?.startingActions?.length).toBe(2);
      expect(result?.startingActions![1]).toEqual(newSa);
      expect(result._version).toBe(1);

      // mutates change log value if not handled immutably
      result.startingActions![1].typeOfFundsOther = 'cheque';
      expect(changes).toEqual(originalChanges);
    });
  });

  describe('compareProperties', () => {
    it('should detect simple property change', () => {
      transactionBefore.purposeOfTxn = 'savings';
      transactionAfter.purposeOfTxn = 'trade';

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'purposeOfTxn',
          oldValue: 'savings',
          newValue: 'trade',
        },
      ]);
    });

    it('should detect simple property change from undefined', () => {
      transactionBefore.purposeOfTxn = undefined;
      transactionAfter.purposeOfTxn = 'trade';

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'purposeOfTxn',
          oldValue: undefined,
          newValue: 'trade',
        },
      ]);
    });

    it('should detect nested property change', () => {
      transactionBefore.startingActions = [{ _id: 'sa1', amount: 100 }];
      transactionAfter.startingActions = [{ _id: 'sa1', amount: 200 }];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'startingActions.$id=sa1.amount',
          oldValue: 100,
          newValue: 200,
        },
      ]);
    });

    it('should ignore null to undefined property change', () => {
      transactionBefore.purposeOfTxn = null;
      transactionAfter.purposeOfTxn = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore undefined to null property change', () => {
      transactionBefore.purposeOfTxn = undefined;
      transactionAfter.purposeOfTxn = null;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore null to empty string property change', () => {
      transactionBefore.purposeOfTxn = null;
      transactionAfter.purposeOfTxn = '';

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore empty string to null property change', () => {
      transactionBefore.purposeOfTxn = '';
      transactionAfter.purposeOfTxn = null;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore undefined to empty string property change', () => {
      transactionBefore.purposeOfTxn = undefined;
      transactionAfter.purposeOfTxn = '';

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore empty string to undefined property change', () => {
      transactionBefore.purposeOfTxn = '';
      transactionAfter.purposeOfTxn = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore _hidden prefix property changes', () => {
      (transactionBefore as unknown as { _hiddenProp: string })._hiddenProp =
        'oldVal';
      (transactionAfter as unknown as { _hiddenProp: string })._hiddenProp =
        'newVal';

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore null/undefined to empty array property change', () => {
      transactionBefore.startingActions = undefined;
      transactionAfter.startingActions = [];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore empty array to null/undefined property change', () => {
      transactionBefore.startingActions = [];
      transactionAfter.startingActions = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore empty array to empty array property change', () => {
      transactionBefore.startingActions = [];
      transactionAfter.startingActions = [];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    // See change log service for dependent properties and their toggles
    // VALID CHANGE FOR DEPENDENCY PROPERTY TOGGLES
    it('should NOT ignore undefined to boolean false', () => {
      transactionBefore.hasPostingDate = undefined;
      transactionBefore.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: undefined },
      ];
      transactionAfter.hasPostingDate = false;
      transactionAfter.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: false },
      ];

      const changes: ChangeLogWithoutVersion[] = [
        {
          path: 'hasPostingDate',
          oldValue: undefined,
          newValue: false,
        },
        {
          path: 'startingActions.$id=sa1.wasSofInfoObtained',
          oldValue: undefined,
          newValue: false,
        },
      ];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual(changes);
    });

    // VALID CHANGE FOR DEP PROP TOGGLES
    it('should NOT ignore null to boolean false', () => {
      transactionBefore.hasPostingDate = null;
      transactionBefore.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: null },
      ];
      transactionAfter.hasPostingDate = false;
      transactionAfter.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: false },
      ];

      const changes: ChangeLogWithoutVersion[] = [
        {
          path: 'hasPostingDate',
          oldValue: null,
          newValue: false,
        },
        {
          path: 'startingActions.$id=sa1.wasSofInfoObtained',
          oldValue: null,
          newValue: false,
        },
      ];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual(changes);
    });

    it('should ignore boolean false to undefined', () => {
      transactionBefore.hasPostingDate = false;
      transactionBefore.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: false },
      ];
      transactionAfter.hasPostingDate = undefined;
      transactionAfter.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: undefined },
      ];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should ignore boolean false to null', () => {
      transactionBefore.hasPostingDate = false;
      transactionBefore.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: false },
      ];
      transactionAfter.hasPostingDate = null;
      transactionAfter.startingActions = [
        { _id: 'sa1', wasSofInfoObtained: null },
      ];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([]);
    });

    it('should not ignore undefined to boolean true', () => {
      transactionBefore.hasPostingDate = undefined;
      transactionAfter.hasPostingDate = true;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'hasPostingDate',
          oldValue: undefined,
          newValue: true,
        },
      ]);
    });

    it('should not ignore null to boolean true', () => {
      transactionBefore.hasPostingDate = null;
      transactionAfter.hasPostingDate = true;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'hasPostingDate',
          oldValue: null,
          newValue: true,
        },
      ]);
    });

    it('should detect entire array addition', () => {
      transactionBefore.startingActions = undefined;
      transactionAfter.startingActions = [{ _id: 'sa1', branch: '123' }];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'startingActions',
          oldValue: undefined,
          newValue: [{ _id: 'sa1', branch: '123' }],
        },
      ]);
    });

    it('should detect entire array removal', () => {
      transactionBefore.startingActions = [{ _id: 'sa1', branch: '123' }];
      transactionAfter.startingActions = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'startingActions',
          oldValue: transactionBefore.startingActions,
          newValue: undefined,
        },
      ]);
    });

    describe('should detect bulk edits', () => {
      it('should detect removal for dep prop', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: true,
            conductors: [{ _id: 'cond1', givenName: 'jon' }],
          },
          {
            _id: 'sa2',
            hasAccountHolders: true,
            accountHolders: [{ _id: 'cond1', givenName: 'jon' }],
          },
        ];
        transactionAfter.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: false,
            conductors: [],
          },
          {
            _id: 'sa2',
            hasAccountHolders: false,
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: 'startingActions.$idx=0.wasCondInfoObtained',
              oldValue: true,
              newValue: false,
            },
            {
              path: 'startingActions.$idx=0.conductors',
              oldValue: [{ _id: 'cond1', givenName: 'jon' }],
              newValue: undefined,
            },
            {
              path: 'startingActions.$idx=1.hasAccountHolders',
              oldValue: true,
              newValue: false,
            },
            {
              path: 'startingActions.$idx=1.accountHolders',
              oldValue: [{ _id: 'cond1', givenName: 'jon' }],
              newValue: undefined,
            },
          ]),
        );
      });

      it('should ignore removal when dep prop has ignored values', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: false,
            conductors: [],
          },
          {
            _id: 'sa2',
            wasCondInfoObtained: false,
            conductors: undefined,
          },
        ];
        transactionAfter.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: false,
            conductors: null,
          },
          {
            _id: 'sa2',
            wasCondInfoObtained: false,
            conductors: [],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes.length).toEqual(0);
      });

      it('should detect removal for dep simple prop', () => {
        transactionBefore.wasTxnAttempted = true;
        transactionBefore.wasTxnAttemptedReason = 'Bounced cheque';

        transactionBefore.hasPostingDate = true;
        transactionBefore.dateOfPosting = '2024/02/02';
        transactionBefore.timeOfPosting = '06:32';

        transactionAfter.wasTxnAttempted = false;
        transactionAfter.hasPostingDate = false;

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: 'wasTxnAttempted',
              oldValue: true,
              newValue: false,
            },
            {
              path: 'wasTxnAttemptedReason',
              oldValue: 'Bounced cheque',
              newValue: undefined,
            },
            {
              path: 'hasPostingDate',
              oldValue: true,
              newValue: false,
            },
            {
              path: 'dateOfPosting',
              oldValue: '2024/02/02',
              newValue: undefined,
            },
            {
              path: 'timeOfPosting',
              oldValue: '06:32',
              newValue: undefined,
            },
          ]),
        );
      });

      it('should detect replacement for dep prop', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: false,
            conductors: [],
          },
          {
            _id: 'sa2',
            wasCondInfoObtained: true,
            conductors: [{ _id: 'cond1', givenName: 'mary' }],
          },
        ];
        transactionAfter.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: true,
            conductors: [{ _id: 'cond1', givenName: 'uzair' }],
          },
          {
            _id: 'sa2',
            wasCondInfoObtained: true,
            conductors: [
              { _id: 'cond1', givenName: 'jon' },
              { _id: 'cond2', givenName: 'syed' },
            ],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: 'startingActions.$idx=0.wasCondInfoObtained',
              oldValue: false,
              newValue: true,
            },
            {
              path: 'startingActions.$idx=0.conductors',
              oldValue: undefined,
              newValue: [{ _id: 'cond1', givenName: 'uzair' }],
            },
            {
              path: 'startingActions.$idx=1.conductors',
              oldValue: [{ _id: 'cond1', givenName: 'mary' }],
              newValue: undefined,
            },
            {
              path: 'startingActions.$idx=1.conductors',
              oldValue: undefined,
              newValue: [
                { _id: 'cond1', givenName: 'jon' },
                { _id: 'cond2', givenName: 'syed' },
              ],
            },
          ]),
        );
      });

      it('should ignore replacement for dep prop', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: true,
            conductors: undefined,
          },
          {
            _id: 'sa2',
            wasCondInfoObtained: true,
            conductors: [],
          },
        ];
        transactionAfter.startingActions = [
          {
            _id: 'sa1',
            wasCondInfoObtained: true,
            conductors: [],
          },
          {
            _id: 'sa2',
            wasCondInfoObtained: true,
            conductors: undefined,
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes.length).toEqual(0);
      });

      it('should detect replacement for dep simple prop', () => {
        transactionBefore.wasTxnAttempted = undefined;
        transactionBefore.wasTxnAttemptedReason = undefined;

        transactionAfter.wasTxnAttempted = true;
        transactionAfter.wasTxnAttemptedReason = 'Cancelled emt';

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: 'wasTxnAttempted',
              oldValue: undefined,
              newValue: true,
            },
            {
              path: 'wasTxnAttemptedReason',
              oldValue: undefined,
              newValue: 'Cancelled emt',
            },
          ]),
        );
      });

      it('should detect null to false for dep prop toggle', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            hasAccountHolders: null,
            accountHolders: [
              {
                _id: '6800a853-2d1b-4d03-8bcc-dd8f945f5bee',
                givenName: 'uzair',
              },
              {
                _id: 'e62bc67a-4c85-4346-9e71-4055dd363cc2',
                givenName: 'mike',
              },
            ],
          },
        ];

        transactionAfter.startingActions = [
          {
            _id: 'sa1',
            hasAccountHolders: false,
            accountHolders: [],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual(
          jasmine.arrayWithExactContents<ChangeLogWithoutVersion>([
            {
              path: 'startingActions.$idx=0.hasAccountHolders',
              oldValue: null,
              newValue: false,
            },
            {
              path: 'startingActions.$idx=0.accountHolders',
              oldValue: [
                {
                  _id: '6800a853-2d1b-4d03-8bcc-dd8f945f5bee',
                  givenName: 'uzair',
                },
                {
                  _id: 'e62bc67a-4c85-4346-9e71-4055dd363cc2',
                  givenName: 'mike',
                },
              ],
              newValue: undefined,
            },
          ]),
        );
      });

      // bulk edit - tests for properties marked for clearing using a placeholder
      it('should not clear simple props not marked for clearing', () => {
        transactionBefore.dateOfTxn = '2024/09/23';
        transactionBefore.dateOfPosting = '2025/03/03';

        transactionAfter.dateOfTxn = null;
        transactionAfter.dateOfPosting = '';

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes.length).toEqual(0);
      });

      it('should clear simple props marked for clearing', () => {
        transactionBefore.dateOfTxn = '2024/09/23';

        transactionAfter.dateOfTxn = SPECIAL_EMPTY_VALUE;

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: 'dateOfTxn',
              oldValue: '2024/09/23',
              newValue: undefined,
            },
          ]),
        );
      });

      it('should clear nested simple props marked for clearing', () => {
        transactionBefore.startingActions = [
          { _id: 'sa1', directionOfSA: 'Out' },
        ];

        transactionAfter.startingActions = [
          { _id: 'sa1', directionOfSA: SPECIAL_EMPTY_VALUE },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: 'startingActions.$idx=0.directionOfSA',
              oldValue: 'Out',
              newValue: undefined,
            },
          ]),
        );
      });

      // Not needed as for compare by index only properties with different values or special empty value are changed and rest ignored
      // it("should ignore _mongoid when comparing objects", () => {
      //   txnBefore._mongoid = "6860c447517a875a721dfb32";
      //   txnBefore.startingActions = [
      //     {
      //       _id: "89ca68c3-6d63-49f9-bfa5-93062cfab1cf",
      //       conductors: [
      //         {
      //           _id: "69197d34-3713-4305-bd4b-c42a0c2ee0e0",
      //           // linkToSub: "0ba7dc99-5ae0-40c5-96d3-12a08d798eac",
      //         },
      //       ],
      //     },
      //   ];
      //   txnBefore.dateOfTxn = "2024/09/23";

      //   txnAfter._mongoid = "mtxn-7517a876862c21dfb32445a7";
      //   txnAfter.startingActions = [
      //     {
      //       _id: "laskdfj",
      //       conductors: [
      //         {
      //           _id: "alskdjfkkk",
      //           // linkToSub: "olijaslfdkj",
      //         },
      //       ],
      //     },
      //   ];
      //   txnAfter.dateOfTxn = "2025/07/06";

      //   const changes: ChangeLogWithoutVersion[] = [];

      //   service.compareProperties(txnBefore, txnAfter, changes, {
      //     discriminator: "index",
      //   });

      //   expect(changes).toEqual(
      //     jasmine.arrayWithExactContents([
      //       {
      //         path: "dateOfTxn",
      //         oldValue: "2024/09/23",
      //         newValue: "2025/07/06",
      //       },
      //     ]),
      //   );
      // });

      it('should ignore dep propeties if their associated toggle is null', () => {
        transactionBefore.startingActions = [
          {
            _id: 'sa1',
            accountHolders: [
              {
                _id: 'e62bc67a-4c85-4346-9e71-4055dd363cc2',
                givenName: 'jon',
              },
              {
                _id: '6800a853-2d1b-4d03-8bcc-dd8f945f5bee',
                givenName: 'doe',
              },
            ],
          },
        ];

        transactionAfter.startingActions = [
          {
            _id: 'sa1',
            hasAccountHolders: null,
            accountHolders: [
              {
                _id: 'alskdjfkkk',
                givenName: 'mike',
              },
            ],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes.length).toEqual(0);
      });

      it('should ignore extra starting actions if underlying object does not have them', () => {
        transactionBefore.startingActions = [
          {
            _id: '123',
            account: '5582195',
          },
        ];

        transactionAfter.startingActions = [
          {
            _id: '123',
            account: '9999999',
          },
          {
            _id: '124',
            account: '8930000',
          },
          {
            _id: '125',
            account: '2889333',
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual([
          {
            path: 'startingActions.$idx=0.account',
            oldValue: '5582195',
            newValue: '9999999',
          },
        ]);
      });
    });

    describe('for items with _id as discriminator', () => {
      it('should detect array item addition', () => {
        transactionBefore.startingActions = [{ _id: 'sa1', branch: '123' }];
        transactionAfter.startingActions = [
          { _id: 'sa1', branch: '123' },
          { _id: 'sa2', branch: '321' },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(transactionBefore, transactionAfter, changes);

        expect(changes).toEqual([
          {
            path: 'startingActions',
            oldValue: undefined,
            newValue: { _id: 'sa2', branch: '321' },
          },
        ]);
      });

      it('should throw on adding array with no object identifier(s)', () => {
        transactionBefore.startingActions = undefined;
        transactionAfter.startingActions = [{ _id: null, branch: '123' }];

        const changes: ChangeLogWithoutVersion[] = [];
        expect(() =>
          service.compareProperties(
            transactionBefore,
            transactionAfter,
            changes,
          ),
        ).toThrowError('array items must have an identifier');
      });

      it('should throw on adding item with no identifier', () => {
        transactionBefore.startingActions = [{ _id: 'sa1', branch: '123' }];
        transactionAfter.startingActions = [
          { _id: 'sa1', branch: '123' },
          { _id: '', branch: '321' },
        ];

        const changes: ChangeLogWithoutVersion[] = [];
        expect(() =>
          service.compareProperties(
            transactionBefore,
            transactionAfter,
            changes,
          ),
        ).toThrowError('array items must have an identifier');
      });

      it('should detect array item modification', () => {
        transactionBefore.startingActions = [{ _id: 'sa1', amount: 100 }];
        transactionAfter.startingActions = [{ _id: 'sa1', amount: 200 }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(transactionBefore, transactionAfter, changes);

        expect(changes).toEqual([
          {
            path: 'startingActions.$id=sa1.amount',
            oldValue: 100,
            newValue: 200,
          },
        ]);
      });

      it('should detect array item removal', () => {
        transactionBefore.startingActions = [
          { _id: 'sa1', branch: '123' },
          { _id: 'sa2', branch: '321' },
        ];
        transactionAfter.startingActions = [{ _id: 'sa1', branch: '123' }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(transactionBefore, transactionAfter, changes);

        expect(changes).toEqual([
          {
            path: 'startingActions.$id=sa2',
            oldValue: transactionBefore.startingActions[1],
            newValue: undefined,
          },
        ]);
      });
    });

    describe('for items with index as discriminator', () => {
      it('should ignore array item addition (non dep prop)', () => {
        transactionBefore.startingActions = [{ _id: 'sa1', branch: '123' }];
        transactionAfter.startingActions = [
          { _id: 'sa1', branch: '123' },
          { _id: 'sa2', branch: '321' },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          { discriminator: 'index' },
        );

        expect(changes.length).toEqual(0);
      });

      it('should detect array item modification', () => {
        transactionBefore.startingActions = [{ _id: 'sa1', amount: 100 }];
        transactionAfter.startingActions = [{ _id: 'sa1', amount: 200 }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual([
          {
            path: 'startingActions.$idx=0.amount',
            oldValue: 100,
            newValue: 200,
          },
        ]);
      });

      // object identifier not used when index is discriminator this test verifies consitent creation of ids in form groups
      it('should throw on array item modification with no object identifier', () => {
        transactionBefore.startingActions = [{ _id: 'sa1', amount: 100 }];
        transactionAfter.startingActions = [{ _id: '', amount: 200 }];

        const changes: ChangeLogWithoutVersion[] = [];

        expect(() =>
          service.compareProperties(
            transactionBefore,
            transactionAfter,
            changes,
            {
              discriminator: 'index',
            },
          ),
        ).toThrowError('array items must have an identifier');
      });

      it('should detect array item removal', () => {
        transactionBefore.startingActions = [
          { _id: 'sa1', branch: '123' },
          { _id: 'sa2', branch: '321' },
        ];
        transactionAfter.startingActions = [{ _id: 'sa1', branch: '123' }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual([
          {
            path: 'startingActions.$idx=1',
            oldValue: { _id: 'sa2', branch: '321' },
            newValue: undefined,
          },
        ]);
      });

      it('should remove dep to other property when toggle is updated', () => {
        transactionBefore.startingActions = [
          { _id: 'sa1', typeOfFunds: 'Other', typeOfFundsOther: 'Quasi cash' },
        ];
        transactionAfter.startingActions = [
          { _id: 'sa1', typeOfFunds: 'Cash' },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          transactionBefore,
          transactionAfter,
          changes,
          {
            discriminator: 'index',
          },
        );

        expect(changes).toEqual([
          {
            path: 'startingActions.$idx=0.typeOfFunds',
            oldValue: 'Other',
            newValue: 'Cash',
          },
          {
            path: 'startingActions.$idx=0.typeOfFundsOther',
            oldValue: 'Quasi cash',
            newValue: undefined,
          },
        ]);
      });
    });

    it('should detect multiple changes', () => {
      transactionBefore.purposeOfTxn = 'savings';
      transactionBefore.startingActions = [{ _id: 'sa1', amount: 100 }];

      transactionAfter.purposeOfTxn = 'trade';
      transactionAfter.startingActions = [
        { _id: 'sa1', amount: 200 },
        { _id: 'sa2', branch: '321' },
      ];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(transactionBefore, transactionAfter, changes);

      expect(changes).toEqual([
        {
          path: 'purposeOfTxn',
          oldValue: 'savings',
          newValue: 'trade',
        },
        {
          path: 'startingActions.$id=sa1.amount',
          oldValue: 100,
          newValue: 200,
        },
        {
          path: 'startingActions',
          oldValue: undefined,
          newValue: { _id: 'sa2', branch: '321' },
        },
      ]);
    });
  });
});
