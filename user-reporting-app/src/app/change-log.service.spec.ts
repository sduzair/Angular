import {
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "./change-log.service";
import { ChangeLog } from "./change-log.service";
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

      it("should remove entire array", () => {
        const changes: ChangeLog[] = [
          {
            path: "startingActions",
            oldValue: mockTxn.startingActions!,
            newValue: undefined,
            version: 1,
          },
        ];
        const result = service.applyChanges(mockTxn, changes);

        expect(result.startingActions).toBeUndefined();
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

      it("should remove entire array", () => {
        const changes: ChangeLog[] = [
          {
            path: "startingActions",
            oldValue: mockTxn.startingActions!,
            newValue: undefined,
            version: 1,
          },
        ];
        const result = service.applyChanges(mockTxn, changes);

        expect(result.startingActions).toBeUndefined();
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

    it("should ignore undefined to boolean false", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.hasPostingDate = undefined;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.hasPostingDate = false;

      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(txnBefore, txnAfter, changes);

      expect(changes).toEqual([]);
    });

    it("should ignore null to boolean false", () => {
      const txnBefore = structuredClone(mockTxn);
      txnBefore.hasPostingDate = null;
      const txnAfter = structuredClone(mockTxn);
      txnAfter.hasPostingDate = false;

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

    describe("for items with _id as discriminator", () => {
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
