import {
  ChangeLog,
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "./change-log.service";
import { SPECIAL_EMPTY_VALUE } from "./reporting-ui/edit-form/clear-field.directive";
import { StartingAction, StrTxn } from "./table/table.component";

describe("ChangeLogService", () => {
  let service: ChangeLogService<DeepPartial<StrTxn>>;
  // Mock StrTxn structure
  let mockTxn: DeepPartial<WithVersion<StrTxn>> = null!;

  beforeEach(() => {
    service = new ChangeLogService();
    mockTxn = {
      _mongoid: "txn1",
      purposeOfTxn: "savings",
      startingActions: [
        {
          _id: "sa1",
          currency: "CAD",
        },
      ],
      _version: 0,
    };
  });

  describe("applyChanges", () => {
    it("should apply simple property change", () => {
      const changes: ChangeLog[] = [
        {
          path: "purposeOfTxn",
          oldValue: "savings",
          newValue: "grocery",
          version: 1,
        },
      ];

      const result = service.applyChanges(mockTxn, changes);

      expect(result.purposeOfTxn).toBe("grocery");
      expect(result._version).toBe(1);
    });

    it("should apply simple property change from undefined", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = undefined;

      const changes: ChangeLog[] = [
        {
          path: "purposeOfTxn",
          oldValue: undefined,
          newValue: "trade",
          version: 1,
        },
      ];

      const result = service.applyChanges(txnBefore, changes);

      expect(result.purposeOfTxn).toBe("trade");
      expect(result._version).toBe(1);
    });

    it("should apply nested property change", () => {
      const changes: ChangeLog[] = [
        {
          path: "startingActions.$idx=0.currency",
          oldValue: "CAD",
          newValue: "USD",
          version: 1,
        },
      ];

      const result = service.applyChanges(mockTxn, changes);

      expect(result?.startingActions?.[0]?.currency).toBe("USD");
      expect(result._version).toBe(1);
    });

    it("should remove entire array", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = [{ _id: "sa1", branch: "123" }];
      const changes: ChangeLog[] = [
        {
          path: "startingActions",
          oldValue: txnBefore.startingActions,
          newValue: undefined,
          version: 1,
        },
      ];
      const result = service.applyChanges(txnBefore, changes);

      expect(result.startingActions).toBeUndefined();
      expect(result._version).toBe(1);
    });

    it("should throw for add new array item when current has no array", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = undefined;
      const newSa: DeepPartial<StartingAction> = {
        _id: "sa1",
        typeOfFundsOther: "investment",
      };
      const changes: ChangeLog[] = [
        {
          path: "startingActions",
          oldValue: undefined,
          newValue: newSa,
          version: 1,
        },
      ];

      expect(() => service.applyChanges(txnBefore, changes)).toThrowError(
        "add new array item when current has no array",
      );
    });

    it("should throw for entire array addition when current is already array", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = [];
      const newSa: DeepPartial<StartingAction> = {
        _id: "sa1",
        typeOfFundsOther: "investment",
      };
      const changes: ChangeLog[] = [
        {
          path: "startingActions",
          oldValue: undefined,
          newValue: [newSa],
          version: 1,
        },
      ];

      expect(() => service.applyChanges(txnBefore, changes)).toThrowError(
        "entire array addition when current is already array",
      );
    });

    it("should entire array addition", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = undefined;
      const newArray = [{ _id: "sa1", branch: "123" }];
      const changes: ChangeLog[] = [
        {
          path: "startingActions",
          oldValue: undefined,
          newValue: newArray,
          version: 1,
        },
      ];

      const result = service.applyChanges(txnBefore, changes);

      expect(result.startingActions).toBeDefined();
      expect(result.startingActions!.length).toBe(1);
      expect(result.startingActions!).toEqual(newArray);
      expect(result._version).toBe(1);
    });

    describe("for items with _id as discriminator", () => {
      it("should add new array item", () => {
        const newSa: DeepPartial<StartingAction> = {
          _id: "sa2",
          typeOfFundsOther: "investment",
        };
        const changes: ChangeLog[] = [
          {
            path: "startingActions",
            oldValue: undefined,
            newValue: newSa,
            version: 1,
          },
        ];

        const result = service.applyChanges(mockTxn, changes);

        expect(result?.startingActions?.length).toBe(2);
        expect(result?.startingActions![1]).toEqual(newSa);
        expect(result._version).toBe(1);
      });

      it("should remove array item", () => {
        const changes: ChangeLog[] = [
          {
            path: "startingActions.$id=sa1",
            oldValue: mockTxn.startingActions![0],
            newValue: undefined,
            version: 1,
          },
        ];

        const result = service.applyChanges(mockTxn, changes);

        expect(result.startingActions!.length).toBe(0);
        expect(result._version).toBe(1);
      });

      it("should modify array item property", () => {
        const changes: ChangeLog[] = [
          {
            path: "startingActions.$id=sa1.currency",
            oldValue: "CAD",
            newValue: "USD",
            version: 1,
          },
        ];

        const result = service.applyChanges(mockTxn, changes);

        const sa1 = result.startingActions!.find((a) => a!._id === "sa1");
        expect(sa1?.currency).toBe("USD");
        expect(result._version).toBe(1);
      });
    });

    describe("for items with index as discriminator", () => {
      it("should add new array item", () => {
        const saNew: DeepPartial<StartingAction> = {
          _id: "sa2",
          wasCondInfoObtained: true,
          conductors: [{ email: "nobody@me.com" }],
        };
        const changes: ChangeLog[] = [
          {
            path: "startingActions",
            oldValue: undefined,
            newValue: saNew,
            version: 1,
          },
        ];

        const result = service.applyChanges(mockTxn, changes);

        expect(result?.startingActions?.length).toBe(2);
        expect(result?.startingActions![1]).toEqual(saNew);
        expect(result._version).toBe(1);
      });

      it("should remove array item", () => {
        const changes: ChangeLog[] = [
          {
            path: "startingActions.$idx=0",
            oldValue: mockTxn.startingActions![0],
            newValue: undefined,
            version: 1,
          },
        ];

        const result = service.applyChanges(mockTxn, changes);

        expect(result.startingActions!.length).toBe(0);
        expect(result._version).toBe(1);
      });

      it("should modify array item property", () => {
        const changes: ChangeLog[] = [
          {
            path: "startingActions.$idx=0.currency",
            oldValue: "CAD",
            newValue: "USD",
            version: 1,
          },
        ];

        const result = service.applyChanges(mockTxn, changes);

        const sa1 = result.startingActions![0];
        expect(sa1?.currency).toBe("USD");
        expect(result._version).toBe(1);
      });
    });

    describe("should apply bulk edit change logs", () => {
      it("existing underlying object set to undefined", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.purposeOfTxn = "savings";
        txnBefore.startingActions = [{ directionOfSA: "Out" }];

        const changes: ChangeLog[] = [
          {
            path: "startingActions.$idx=0.directionOfSA",
            oldValue: "Out",
            version: 1,
          },
        ];

        const result = service.applyChanges(txnBefore, changes);

        expect(result.startingActions![0]!.directionOfSA).toBeUndefined();
        expect(result._version).toBe(1);
      });
    });
  });

  describe("compareProperties", () => {
    it("should detect simple property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = "savings";
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = "trade";

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "purposeOfTxn",
          oldValue: "savings",
          newValue: "trade",
        },
      ]);
    });

    it("should detect simple property change from undefined", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = undefined;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = "trade";

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "purposeOfTxn",
          oldValue: undefined,
          newValue: "trade",
        },
      ]);
    });

    it("should detect nested property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = [{ _id: "sa1", amount: 100 }];
      const txnAfter = structuredClone(mockTxn);
      txnAfter.startingActions = [{ _id: "sa1", amount: 200 }];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "startingActions.$id=sa1.amount",
          oldValue: 100,
          newValue: 200,
        },
      ]);
    });

    it("should ignore null to undefined property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = null;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore undefined to null property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = undefined;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = null;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore null to empty string property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = null;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = "";

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore empty string to null property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = "";
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = null;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore undefined to empty string property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = undefined;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = "";

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore empty string to undefined property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = "";
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore _hidden prefix property changes", () => {
      const txnBefore = structuredClone(mockTxn);
      (txnBefore as { _hiddenProp: string })._hiddenProp = "oldVal";
      const txnAfter = structuredClone(mockTxn);
      (txnAfter as { _hiddenProp: string })._hiddenProp = "newVal";

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore null/undefined to empty array property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = undefined;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.startingActions = [];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore empty array to null/undefined property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = [];
      const txnAfter = structuredClone(mockTxn);
      txnAfter.startingActions = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore empty array to empty array property change", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = [];
      const txnAfter = structuredClone(mockTxn);
      txnAfter.startingActions = [];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    // VALID CHANGE FOR DEP PROP TOGGLES
    // it("should ignore undefined to boolean false", () => {
    //   const txnBefore = structuredClone(mockTxn);
    //   txnBefore.hasPostingDate = undefined;
    //   txnBefore.startingActions = [
    //     { _id: "sa1", wasSofInfoObtained: undefined },
    //   ];
    //   const txnAfter = structuredClone(mockTxn);
    //   txnAfter.hasPostingDate = false;
    //   txnAfter.startingActions = [{ _id: "sa1", wasSofInfoObtained: false }];

    //   const changes: ChangeLogWithoutVersion[] = [];

    //   service.compareProperties(txnBefore, txnAfter, changes);

    //   expect(changes).toEqual([]);
    // });

    // it("should ignore null to boolean false", () => {
    //   const txnBefore = structuredClone(mockTxn);
    //   txnBefore.hasPostingDate = null;
    //   txnBefore.startingActions = [{ _id: "sa1", wasSofInfoObtained: null }];
    //   const txnAfter = structuredClone(mockTxn);
    //   txnAfter.hasPostingDate = false;
    //   txnAfter.startingActions = [{ _id: "sa1", wasSofInfoObtained: false }];

    //   const changes: ChangeLogWithoutVersion[] = [];

    //   service.compareProperties(txnBefore, txnAfter, changes);

    //   expect(changes).toEqual([]);
    // });

    it("should ignore boolean false to undefined", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.hasPostingDate = false;
      txnBefore.startingActions = [{ _id: "sa1", wasSofInfoObtained: false }];
      const txnAfter = structuredClone(mockTxn);
      txnAfter.hasPostingDate = undefined;
      txnAfter.startingActions = [
        { _id: "sa1", wasSofInfoObtained: undefined },
      ];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore boolean false to null", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.hasPostingDate = false;
      txnBefore.startingActions = [{ _id: "sa1", wasSofInfoObtained: false }];
      const txnAfter = structuredClone(mockTxn);
      txnAfter.hasPostingDate = null;
      txnAfter.startingActions = [{ _id: "sa1", wasSofInfoObtained: null }];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should not ignore undefined to boolean true", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.hasPostingDate = undefined;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.hasPostingDate = true;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "hasPostingDate",
          oldValue: undefined,
          newValue: true,
        },
      ]);
    });

    it("should not ignore null to boolean true", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.hasPostingDate = null;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.hasPostingDate = true;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "hasPostingDate",
          oldValue: null,
          newValue: true,
        },
      ]);
    });

    it("should detect entire array addition", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = undefined;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.startingActions = [{ _id: "sa1", branch: "123" }];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "startingActions",
          oldValue: undefined,
          newValue: [{ _id: "sa1", branch: "123" }],
        },
      ]);
    });

    it("should detect entire array removal", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.startingActions = [{ _id: "sa1", branch: "123" }];
      const txnAfter = structuredClone(mockTxn);
      txnAfter.startingActions = undefined;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "startingActions",
          oldValue: txnBefore.startingActions,
          newValue: undefined,
        },
      ]);
    });

    describe("should detect bulk edits", () => {
      it("should detect removal for dep prop", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: true,
            conductors: [{ _id: "cond1", clientNo: "123" }],
          },
          {
            _id: "sa2",
            hasAccountHolders: true,
            accountHolders: [{ _id: "cond1", linkToSub: "123" }],
          },
        ];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: false,
            conductors: [],
          },
          {
            _id: "sa2",
            hasAccountHolders: false,
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: "startingActions.$idx=0.wasCondInfoObtained",
              oldValue: true,
              newValue: false,
            },
            {
              path: "startingActions.$idx=0.conductors",
              oldValue: txnBefore.startingActions[0]!.conductors,
              newValue: undefined,
            },
            {
              path: "startingActions.$idx=1.hasAccountHolders",
              oldValue: true,
              newValue: false,
            },
            {
              path: "startingActions.$idx=1.accountHolders",
              oldValue: txnBefore.startingActions[1]!.accountHolders,
              newValue: undefined,
            },
          ]),
        );
      });

      it("should ignore removal when dep prop has ignored values", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: false,
            conductors: [],
          },
          {
            _id: "sa2",
            wasCondInfoObtained: false,
            conductors: undefined,
          },
        ];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: false,
            conductors: null,
          },
          {
            _id: "sa2",
            wasCondInfoObtained: false,
            conductors: [],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes.length).toEqual(0);
      });

      it("should detect removal for dep simple prop", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.wasTxnAttempted = true;
        txnBefore.wasTxnAttemptedReason = "Bounced cheque";

        txnBefore.hasPostingDate = true;
        txnBefore.dateOfPosting = "2024/02/02";
        txnBefore.timeOfPosting = "06:32";

        const txnAfter = structuredClone(mockTxn);
        txnAfter.wasTxnAttempted = false;
        txnAfter.hasPostingDate = false;

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: "wasTxnAttempted",
              oldValue: true,
              newValue: false,
            },
            {
              path: "wasTxnAttemptedReason",
              oldValue: "Bounced cheque",
              newValue: undefined,
            },
            {
              path: "hasPostingDate",
              oldValue: true,
              newValue: false,
            },
            {
              path: "dateOfPosting",
              oldValue: "2024/02/02",
              newValue: undefined,
            },
            {
              path: "timeOfPosting",
              oldValue: "06:32",
              newValue: undefined,
            },
          ]),
        );
      });

      it("should detect replacement for dep prop", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: false,
            conductors: [],
          },
          {
            _id: "sa2",
            wasCondInfoObtained: true,
            conductors: [{ _id: "cond1", clientNo: "123" }],
          },
        ];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: true,
            conductors: [{ _id: "cond1", clientNo: "123" }],
          },
          {
            _id: "sa2",
            wasCondInfoObtained: true,
            conductors: [
              { _id: "cond1", clientNo: "123" },
              { _id: "cond2", clientNo: "345" },
            ],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: "startingActions.$idx=0.wasCondInfoObtained",
              oldValue: false,
              newValue: true,
            },
            {
              path: "startingActions.$idx=0.conductors",
              oldValue: undefined,
              newValue: txnAfter.startingActions[0]!.conductors,
            },
            {
              path: "startingActions.$idx=1.conductors",
              oldValue: txnBefore.startingActions[1]!.conductors,
              newValue: undefined,
            },
            {
              path: "startingActions.$idx=1.conductors",
              oldValue: undefined,
              newValue: txnAfter.startingActions[1]!.conductors,
            },
          ]),
        );
      });

      it("should ignore replacement for dep prop", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: true,
            conductors: undefined,
          },
          {
            _id: "sa2",
            wasCondInfoObtained: true,
            conductors: [],
          },
        ];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          {
            _id: "sa1",
            wasCondInfoObtained: true,
            conductors: [],
          },
          {
            _id: "sa2",
            wasCondInfoObtained: true,
            conductors: undefined,
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes.length).toEqual(0);
      });

      it("should detect replacement for dep simple prop", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.wasTxnAttempted = undefined;
        txnBefore.wasTxnAttemptedReason = undefined;

        const txnAfter = structuredClone(mockTxn);
        txnAfter.wasTxnAttempted = true;
        txnAfter.wasTxnAttemptedReason = "Cancelled emt";

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: "wasTxnAttempted",
              oldValue: undefined,
              newValue: true,
            },
            {
              path: "wasTxnAttemptedReason",
              oldValue: undefined,
              newValue: "Cancelled emt",
            },
          ]),
        );
      });

      it("should detect null to false for dep prop toggle", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          {
            hasAccountHolders: undefined,
            accountHolders: [
              {
                _id: "6800a853-2d1b-4d03-8bcc-dd8f945f5bee",
                linkToSub: "78b7022a-5fc4-4495-9dca-7b50c6c4e8b0",
              },
              {
                _id: "e62bc67a-4c85-4346-9e71-4055dd363cc2",
                linkToSub: "0ba7dc99-5ae0-40c5-96d3-12a08d798eac",
              },
            ],
          },
        ];

        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          {
            hasAccountHolders: false,
            accountHolders: [],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents<ChangeLogWithoutVersion>([
            {
              path: "startingActions.$idx=0.accountHolders",
              oldValue: [
                {
                  _id: "6800a853-2d1b-4d03-8bcc-dd8f945f5bee",
                  linkToSub: "78b7022a-5fc4-4495-9dca-7b50c6c4e8b0",
                },
                {
                  _id: "e62bc67a-4c85-4346-9e71-4055dd363cc2",
                  linkToSub: "0ba7dc99-5ae0-40c5-96d3-12a08d798eac",
                },
              ],
              newValue: undefined,
            },
            {
              path: "startingActions.$idx=0.hasAccountHolders",
              oldValue: undefined,
              newValue: false,
            },
          ]),
        );
      });

      it("should not clear simple props marked for clearing", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.dateOfTxn = "2024/09/23";
        txnBefore.dateOfPosting = "2025/03/03";

        const txnAfter = structuredClone(mockTxn);
        txnAfter.dateOfTxn = null;
        txnAfter.dateOfPosting = "";

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes.length).toEqual(0);
      });

      it("should clear simple props marked for clearing", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.dateOfTxn = "2024/09/23";

        const txnAfter = structuredClone(mockTxn);
        txnAfter.dateOfTxn = SPECIAL_EMPTY_VALUE;

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: "dateOfTxn",
              oldValue: "2024/09/23",
              newValue: undefined,
            },
          ]),
        );
      });

      it("should clear nested simple props marked for clearing", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [{ directionOfSA: "Out" }];

        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [{ directionOfSA: SPECIAL_EMPTY_VALUE }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: "startingActions.$idx=0.directionOfSA",
              oldValue: "Out",
              newValue: undefined,
            },
          ]),
        );
      });

      it("should ignore _mongoid when comparing objects", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore._mongoid = "6860c447517a875a721dfb32";
        txnBefore.startingActions = [
          {
            _id: "89ca68c3-6d63-49f9-bfa5-93062cfab1cf",
            conductors: [
              {
                _id: "69197d34-3713-4305-bd4b-c42a0c2ee0e0",
                // linkToSub: "0ba7dc99-5ae0-40c5-96d3-12a08d798eac",
              },
            ],
          },
        ];
        txnBefore.dateOfTxn = "2024/09/23";

        const txnAfter = structuredClone(mockTxn);
        txnAfter._mongoid = "mtxn-7517a876862c21dfb32445a7";
        txnAfter.startingActions = [
          {
            _id: "laskdfj",
            conductors: [
              {
                _id: "alskdjfkkk",
                // linkToSub: "olijaslfdkj",
              },
            ],
          },
        ];
        txnAfter.dateOfTxn = "2025/07/06";

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual(
          jasmine.arrayWithExactContents([
            {
              path: "dateOfTxn",
              oldValue: "2024/09/23",
              newValue: "2025/07/06",
            },
          ]),
        );
      });

      it("should ignore dep propeties if their associated toggle is null" /** See change log service for dep props and their toggles */, () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          {
            accountHolders: [
              {
                _id: "e62bc67a-4c85-4346-9e71-4055dd363cc2",
                linkToSub: "0ba7dc99-5ae0-40c5-96d3-12a08d798eac",
              },
              {
                _id: "6800a853-2d1b-4d03-8bcc-dd8f945f5bee",
                linkToSub: "78b7022a-5fc4-4495-9dca-7b50c6c4e8b0",
              },
            ],
          },
        ];

        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          {
            hasAccountHolders: null,
            accountHolders: [
              {
                _id: "alskdjfkkk",
                linkToSub: "",
              },
            ],
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes.length).toEqual(0);
      });

      it("should ignore multiple starting actions if underlying obj does not have them", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          {
            account: "5582195",
          },
        ];

        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          {
            account: undefined,
          },
          {
            account: "8930000",
          },
          {
            account: "2889333",
          },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes.length).toEqual(0);
      });
    });

    describe("for items with _id as discriminator", () => {
      it("should detect array item modification", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [{ _id: "sa1", amount: 100 }];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [{ _id: "sa1", amount: 200 }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes);

        expect(changes).toEqual([
          {
            path: "startingActions.$id=sa1.amount",
            oldValue: 100,
            newValue: 200,
          },
        ]);
      });

      it("should detect array item addition", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [{ _id: "sa1", branch: "123" }];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          { _id: "sa1", branch: "123" },
          { _id: "sa2", branch: "321" },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes);

        expect(changes).toEqual([
          {
            path: "startingActions",
            oldValue: undefined,
            newValue: { _id: "sa2", branch: "321" },
          },
        ]);
      });

      it("should detect array item removal", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          { _id: "sa1", branch: "123" },
          { _id: "sa2", branch: "321" },
        ];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [{ _id: "sa1", branch: "123" }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes);

        expect(changes).toEqual([
          {
            path: "startingActions.$id=sa2",
            oldValue: txnBefore.startingActions[1],
            newValue: undefined,
          },
        ]);
      });
    });

    describe("for items with index as discriminator", () => {
      it("should detect array item modification", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [{ _id: "sa1", amount: 100 }];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [{ _id: "sa1", amount: 200 }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual([
          {
            path: "startingActions.$idx=0.amount",
            oldValue: 100,
            newValue: 200,
          },
        ]);
      });

      it("should detect array item addition", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [{ _id: "sa1", branch: "123" }];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [
          { _id: "sa1", branch: "123" },
          { _id: "sa2", branch: "321" },
        ];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes);

        expect(changes).toEqual([
          {
            path: "startingActions",
            oldValue: undefined,
            newValue: { _id: "sa2", branch: "321" },
          },
        ]);
      });

      it("should detect array item removal", () => {
        const txnBefore = structuredClone(mockTxn);
        txnBefore.startingActions = [
          { _id: "sa1", branch: "123" },
          { _id: "sa2", branch: "321" },
        ];
        const txnAfter = structuredClone(mockTxn);
        txnAfter.startingActions = [{ _id: "sa1", branch: "123" }];

        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(txnBefore, txnAfter, changes, {
          discriminator: "index",
        });

        expect(changes).toEqual([
          {
            path: "startingActions.$idx=1",
            oldValue: txnBefore.startingActions[1],
            newValue: undefined,
          },
        ]);
      });
    });

    it("should detect multiple changes", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.purposeOfTxn = "savings";
      txnBefore.startingActions = [{ _id: "sa1", amount: 100 }];
      const txnAfter = structuredClone(mockTxn);
      txnAfter.purposeOfTxn = "trade";
      txnAfter.startingActions = [
        { _id: "sa1", amount: 200 },
        { _id: "sa2", branch: "321" },
      ];

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([
        {
          path: "purposeOfTxn",
          oldValue: "savings",
          newValue: "trade",
        },
        {
          path: "startingActions.$id=sa1.amount",
          oldValue: 100,
          newValue: 200,
        },
        {
          path: "startingActions",
          oldValue: undefined,
          newValue: { _id: "sa2", branch: "321" },
        },
      ]);
    });
  });
});

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> | null : T[P] | null;
};
