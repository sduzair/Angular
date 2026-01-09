import { MARKED_AS_CLEARED } from '../reporting-ui/edit-form/mark-as-cleared.directive';
import {
  StartingAction,
  StrTransaction,
  WithVersion,
} from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { DeepPartial } from '../test-helpers';
import * as ChangeLog from './change-log';

describe('ChangeLog', () => {
  let transactionBefore: WithVersion<DeepPartial<StrTransaction>> = null!;
  let transactionAfter: WithVersion<DeepPartial<StrTransaction>> = null!;

  beforeEach(() => {
    // Mock StrTransaction structure
    const mockTransaction = {
      purposeOfTxn: 'savings',
      startingActions: [
        {
          currency: 'CAD',
        },
      ],
      eTag: 0,
    } satisfies WithVersion<DeepPartial<StrTransaction>>;
    transactionBefore = structuredClone(mockTransaction);
    transactionAfter = structuredClone(mockTransaction);
  });

  describe('applyChanges', () => {
    describe('tests for object property', () => {
      it('should update object property when change log contains new value', () => {
        transactionBefore.purposeOfTxn = 'savings';
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'replace',
            path: '/purposeOfTxn',
            value: 'grocery',
          },
        ];

        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result.purposeOfTxn).toBe('grocery');
      });

      it('should set object property when current value is undefined', () => {
        transactionBefore.purposeOfTxn = undefined;
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'replace',
            path: '/purposeOfTxn',
            value: 'trade',
          },
        ];

        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result.purposeOfTxn).toBe('trade');
      });
    });

    describe('tests for array item', () => {
      it('should update nested array item property by index', () => {
        transactionBefore.startingActions![0]!.currency = 'CAD';
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'replace',
            path: '/startingActions/0/currency',
            value: 'USD',
          },
        ];

        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result?.startingActions?.[0]?.currency).toBe('USD');
      });

      it('should throw error when applying change to non-existent array item', () => {
        transactionBefore.startingActions = [
          {
            currency: 'CAD',
          },
        ];
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'replace',
            path: '/startingActions/5/currency',
            value: 'USD',
          },
        ];

        expect(() =>
          ChangeLog.applyChangeLogs(transactionBefore, changes),
        ).toThrowError(/Cannot set properties of undefined/);
      });

      it('should throw error when path contains invalid array segment', () => {
        transactionBefore.startingActions![0]!.currency = 'CAD';
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'replace',
            path: '/startingActions/firstSA/currency',
            value: 'USD',
          },
        ];

        expect(() =>
          ChangeLog.applyChangeLogs(transactionBefore, changes),
        ).toThrowError(/Cannot set properties of undefined/);
      });

      it('should throw error when using array syntax on non-array property', () => {
        (
          transactionBefore as unknown as {
            name: {
              first: string;
              last: string;
            };
          }
        ).name = {
          first: 'uzair',
          last: 'syed',
        };

        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'replace',
            path: '/name/0/first',
            value: 'jon',
          },
        ];

        expect(() =>
          ChangeLog.applyChangeLogs(transactionBefore, changes),
        ).toThrowError(/Cannot set properties of undefined/);
      });

      it('should delete entire array when using remove operation', () => {
        transactionBefore.startingActions = [{ branch: '123' }];
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'remove',
            path: '/startingActions',
          },
        ];
        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result.startingActions).toBeUndefined();
      });

      it('should initialize array when property is undefined', () => {
        transactionBefore.startingActions = undefined;
        const newArray = [{ branch: '123' }];
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'add',
            path: '/startingActions',
            value: newArray,
          },
        ];

        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result.startingActions).toBeDefined();
        expect(result.startingActions!.length).toBe(1);
        expect(result.startingActions!).toEqual(newArray);
      });

      it('should set nested array item property to undefined', () => {
        transactionBefore.purposeOfTxn = 'savings';
        transactionBefore.startingActions = [{ directionOfSA: 'Out' }];

        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'remove',
            path: '/startingActions/0/directionOfSA',
          },
        ];

        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result.startingActions![0]!.directionOfSA).toBeUndefined();
      });

      it('should append new item to existing array', () => {
        transactionBefore.startingActions = [
          {
            currency: 'CAD',
          },
        ];
        const newSa: DeepPartial<StartingAction> = {
          typeOfFundsOther: 'investment',
        };
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'add',
            path: '/startingActions/-',
            value: newSa,
          },
        ];

        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result?.startingActions?.length).toBe(2);
        expect(result?.startingActions![1]).toEqual(newSa);
      });

      it('should delete array item by index', () => {
        transactionBefore.startingActions = [
          {
            currency: 'CAD',
          },
        ];
        const changes: ChangeLog.ChangeLogType[] = [
          {
            op: 'remove',
            path: '/startingActions/0',
          },
        ];

        const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

        expect(result.startingActions!.length).toBe(0);
      });
    });

    it('should apply changes without mutating original change log', () => {
      transactionBefore.startingActions = [
        {
          currency: 'CAD',
        },
      ];

      const newSa: DeepPartial<StartingAction> = {
        typeOfFundsOther: 'investment',
      };
      const changes: ChangeLog.ChangeLogType[] = [
        {
          op: 'add',
          path: '/startingActions/1',
          value: newSa,
        },
      ];
      const originalChanges = structuredClone(changes);

      const result = ChangeLog.applyChangeLogs(transactionBefore, changes);

      expect(result?.startingActions?.length).toBe(2);
      expect(result?.startingActions![1]).toEqual(newSa);

      // mutates change log value if not handled immutably
      result.startingActions![1].typeOfFundsOther = 'cheque';

      expect(changes).toEqual(originalChanges);
    });
  });

  describe('compareProperties', () => {
    it('should detect simple property change', () => {
      transactionBefore.purposeOfTxn = 'savings';
      transactionAfter.purposeOfTxn = 'trade';

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/purposeOfTxn',
          value: 'trade',
        },
      ]);
    });

    it('should detect simple property change from undefined', () => {
      transactionBefore.purposeOfTxn = undefined;
      transactionAfter.purposeOfTxn = 'trade';

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/purposeOfTxn',
          value: 'trade',
        },
      ]);
    });

    it('should detect nested property change', () => {
      transactionBefore.startingActions = [{ amount: 100 }];
      transactionAfter.startingActions = [{ amount: 200 }];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/startingActions/0/amount',
          value: 200,
        },
      ]);
    });

    it('should ignore null to undefined property change', () => {
      transactionBefore.purposeOfTxn = null;
      transactionAfter.purposeOfTxn = undefined;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore undefined to null property change', () => {
      transactionBefore.purposeOfTxn = undefined;
      transactionAfter.purposeOfTxn = null;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore null to empty string property change', () => {
      transactionBefore.purposeOfTxn = null;
      transactionAfter.purposeOfTxn = '';

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore empty string to null property change', () => {
      transactionBefore.purposeOfTxn = '';
      transactionAfter.purposeOfTxn = null;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore undefined to empty string property change', () => {
      transactionBefore.purposeOfTxn = undefined;
      transactionAfter.purposeOfTxn = '';

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore empty string to undefined property change', () => {
      transactionBefore.purposeOfTxn = '';
      transactionAfter.purposeOfTxn = undefined;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore _hidden prefix property changes', () => {
      (
        transactionBefore as unknown as {
          _hiddenProp: string;
        }
      )._hiddenProp = 'oldVal';
      (
        transactionAfter as unknown as {
          _hiddenProp: string;
        }
      )._hiddenProp = 'newVal';

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore _mongoid property changes', () => {
      (
        transactionBefore as unknown as {
          _mongoid: string;
        }
      )._mongoid = '11111111111';
      (
        transactionAfter as unknown as {
          _mongoid: string;
        }
      )._mongoid = '11111111112';

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore changes for properties starting with flowOfFunds', () => {
      (
        transactionBefore as unknown as {
          _mongoid: string;
        }
      )._mongoid = '11111111111';
      (
        transactionAfter as unknown as {
          _mongoid: string;
        }
      )._mongoid = '11111111112';

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore null/undefined to empty array property change', () => {
      transactionBefore.startingActions = undefined;
      transactionAfter.startingActions = [];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore empty array to null/undefined property change', () => {
      transactionBefore.startingActions = [];
      transactionAfter.startingActions = undefined;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    it('should ignore empty array to empty array property change', () => {
      transactionBefore.startingActions = [];
      transactionAfter.startingActions = [];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([]);
    });

    // following are VALID CHANGES for property toggles
    it('should NOT ignore undefined to boolean false', () => {
      transactionBefore.hasPostingDate = undefined;
      transactionBefore.startingActions = [{ wasSofInfoObtained: undefined }];
      transactionAfter.hasPostingDate = false;
      transactionAfter.startingActions = [{ wasSofInfoObtained: false }];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: false,
        },
        {
          op: 'replace',
          path: '/startingActions/0/wasSofInfoObtained',
          value: false,
        },
      ]);
    });

    it('should NOT ignore null to boolean false', () => {
      transactionBefore.hasPostingDate = null;
      transactionBefore.startingActions = [{ wasSofInfoObtained: null }];
      transactionAfter.hasPostingDate = false;
      transactionAfter.startingActions = [{ wasSofInfoObtained: false }];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: false,
        },
        {
          op: 'replace',
          path: '/startingActions/0/wasSofInfoObtained',
          value: false,
        },
      ]);
    });

    it('should NOT ignore boolean false to undefined', () => {
      transactionBefore.hasPostingDate = false;
      transactionBefore.startingActions = [{ wasSofInfoObtained: false }];
      transactionAfter.hasPostingDate = undefined;
      transactionAfter.startingActions = [{ wasSofInfoObtained: undefined }];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: undefined,
        },
        {
          op: 'replace',
          path: '/startingActions/0/wasSofInfoObtained',
          value: undefined,
        },
      ]);
    });

    it('should NOT ignore boolean false to null', () => {
      transactionBefore.hasPostingDate = false;
      transactionBefore.startingActions = [{ wasSofInfoObtained: false }];
      transactionAfter.hasPostingDate = null;
      transactionAfter.startingActions = [{ wasSofInfoObtained: null }];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: null,
        },
        {
          op: 'replace',
          path: '/startingActions/0/wasSofInfoObtained',
          value: null,
        },
      ]);
    });

    it('should NOT ignore undefined to boolean true', () => {
      transactionBefore.hasPostingDate = undefined;
      transactionAfter.hasPostingDate = true;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: true,
        },
      ]);
    });

    it('should NOT ignore null to boolean true', () => {
      transactionBefore.hasPostingDate = null;
      transactionAfter.hasPostingDate = true;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: true,
        },
      ]);
    });

    it('should NOT ignore boolean true to undefined', () => {
      transactionBefore.hasPostingDate = true;
      transactionAfter.hasPostingDate = undefined;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: undefined,
        },
      ]);
    });

    it('should NOT ignore boolean true to null', () => {
      transactionBefore.hasPostingDate = true;
      transactionAfter.hasPostingDate = null;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/hasPostingDate',
          value: null,
        },
      ]);
    });

    it('should detect entire array addition', () => {
      transactionBefore.startingActions = undefined;
      transactionAfter.startingActions = [{ branch: '123' }];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/startingActions',
          value: [{ branch: '123' }],
        },
      ]);
    });

    it('should detect entire array removal', () => {
      transactionBefore.startingActions = [{ branch: '123' }];
      transactionAfter.startingActions = undefined;

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/startingActions',
          value: undefined,
        },
      ]);
    });

    it('should detect null to false for dep prop toggle', () => {
      transactionBefore.startingActions = [
        {
          hasAccountHolders: null,
          accountHolders: [],
        },
      ];

      transactionAfter.startingActions = [
        {
          hasAccountHolders: false,
          accountHolders: [],
        },
      ];

      const changes = ChangeLog.generateChangeLogs(
        transactionBefore,
        transactionAfter,
      );

      expect(changes).toEqual([
        {
          op: 'replace',
          path: '/startingActions/0/hasAccountHolders',
          value: false,
        },
      ]);
    });

    describe('integrity violations', () => {
      it('should throw if dependent property exists and associated toggle is false', () => {
        transactionBefore.startingActions = [
          {
            wasCondInfoObtained: true,
            conductors: [{ givenName: 'jon' }],
          },
        ];
        transactionAfter.startingActions = [
          {
            wasCondInfoObtained: false,
            conductors: [{ givenName: 'jon' }],
          },
        ];

        expect(() =>
          ChangeLog.generateChangeLogs(transactionBefore, transactionAfter),
        ).toThrowError(ChangeLog.ChangeLogError);
      });

      it('should throw if dependent property exists and associated toggle is null', () => {
        transactionBefore.startingActions = [
          {
            hasAccountHolders: true,
            accountHolders: [
              {
                givenName: 'jon',
              },
              {
                givenName: 'doe',
              },
            ],
          },
        ];

        transactionAfter.startingActions = [
          {
            hasAccountHolders: null,
            accountHolders: [
              {
                givenName: 'mike',
              },
            ],
          },
        ];

        expect(() =>
          ChangeLog.generateChangeLogs(transactionBefore, transactionAfter),
        ).toThrowError(ChangeLog.ChangeLogError);
      });

      it("should throw if dependent property exists and associated toggle is not set to 'Other' value", () => {
        transactionBefore.startingActions = [
          { typeOfFunds: 'Other', typeOfFundsOther: 'Quasi cash' },
        ];
        transactionAfter.startingActions = [
          { typeOfFunds: 'Cash', typeOfFundsOther: 'Quasi cash' },
        ];

        expect(() =>
          ChangeLog.generateChangeLogs(transactionBefore, transactionAfter),
        ).toThrowError(ChangeLog.ChangeLogError);
      });
    });

    describe('should detect bulk edits', () => {
      it('should clear simple props marked for clearing', () => {
        transactionBefore.dateOfTxn = '2024/09/23';

        transactionAfter.dateOfTxn = MARKED_AS_CLEARED;

        const changes = ChangeLog.generateChangeLogs(
          transactionBefore,
          transactionAfter,
          { isBulkEdit: true },
        );

        expect(changes).toEqual([
          {
            op: 'replace',
            path: '/dateOfTxn',
            value: MARKED_AS_CLEARED,
          },
        ]);
      });

      describe('bulk edit integrity checks', () => {
        it('should ignore properties not defined in incoming edit', () => {
          transactionBefore.startingActions = [
            {
              account: '9999999',
            },
          ];

          transactionAfter.startingActions = [{}];

          const changes = ChangeLog.generateChangeLogs(
            transactionBefore,
            transactionAfter,
            { isBulkEdit: true },
          );

          expect(changes).toEqual([]);
        });

        it('should ignore extra starting actions if underlying object does not have them', () => {
          transactionBefore.startingActions = [
            {
              account: '9999999',
            },
          ];

          transactionAfter.startingActions = [
            {
              account: '9999999',
            },
            {
              account: '8930000',
            },
            {
              account: '2889333',
            },
          ];

          const changes = ChangeLog.generateChangeLogs(
            transactionBefore,
            transactionAfter,
            { isBulkEdit: true },
          );

          expect(changes).toEqual([]);
        });

        it('should ignore extra completing actions if underlying object does not have them', () => {
          transactionBefore.completingActions = [
            {
              account: '9999999',
            },
          ];

          transactionAfter.completingActions = [
            {
              account: '9999999',
            },
            {
              account: '8930000',
            },
            {
              account: '2889333',
            },
          ];

          const changes = ChangeLog.generateChangeLogs(
            transactionBefore,
            transactionAfter,
            { isBulkEdit: true },
          );

          expect(changes).toEqual([]);
        });
      });

      it('should detect multiple changes', () => {
        transactionBefore.purposeOfTxn = 'savings';
        transactionBefore.startingActions = [{ amount: 100 }];

        transactionAfter.purposeOfTxn = 'trade';
        transactionAfter.startingActions = [{ amount: 200 }, { branch: '321' }];

        const changes = ChangeLog.generateChangeLogs(
          transactionBefore,
          transactionAfter,
        );

        expect(changes).toEqual([
          {
            op: 'replace',
            path: '/purposeOfTxn',
            value: 'trade',
          },
          {
            op: 'add',
            path: '/startingActions/1',
            value: { branch: '321' },
          },
          {
            op: 'replace',
            path: '/startingActions/0/amount',
            value: 200,
          },
        ]);
      });
    });
  });
});
