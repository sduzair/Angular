import {
  ChangeLogService,
  ChangeLogWithoutVersion,
  WithVersion,
} from "./change-log.service";
import { ChangeLog } from "./change-log.service";
import { Address, User, WorkExperience } from "./table/table.component";

describe("ChangeLogService", () => {
  let service: ChangeLogService<DeepPartial<User>>;
  // Mock user structure
  let mockUserUsingIdAsDiscriminator: DeepPartial<WithVersion<User>> = null!;
  let mockUserUsingIndexDiscriminator: DeepPartial<User> = null!;

  beforeEach(() => {
    service = new ChangeLogService();
    mockUserUsingIdAsDiscriminator = {
      _id: "user1",
      firstName: "John Doe",
      age: 30,
      hair: { color: "black", type: "afro" },
      address: [
        {
          _id: "add1",
          state: "ON",
          city: "Metropolis",
        },
      ],
    };
    mockUserUsingIndexDiscriminator = {
      firstName: "John Doe",
      age: 30,
      hair: { color: "black", type: "afro" },
      address: [
        {
          state: "ON",
          city: "Metropolis",
        },
      ],
    };
  });

  describe("applyChanges", () => {
    it("should apply simple property change", () => {
      const changes: ChangeLog[] = [
        {
          path: "firstName",
          oldValue: "John Doe",
          newValue: "Jane Smith",
          version: 1,
        },
      ];

      const result = service.applyChanges(
        mockUserUsingIdAsDiscriminator,
        changes,
      );

      expect(result.firstName).toBe("Jane Smith");
      expect(result._version).toBe(1);
    });

    it("should apply nested property change", () => {
      const changes: ChangeLog[] = [
        {
          path: "hair.color",
          oldValue: "black",
          newValue: "white",
          version: 1,
        },
      ];

      const result = service.applyChanges(
        mockUserUsingIdAsDiscriminator,
        changes,
      );

      expect(result?.hair?.color).toBe("white");
      expect(result._version).toBe(1);
    });

    it("should add new array item", () => {
      const workAddress: DeepPartial<Address> = {
        _id: "add2",
        city: "toronto",
      };
      const changes: ChangeLog[] = [
        {
          path: "address",
          oldValue: undefined,
          newValue: workAddress,
          version: 1,
        },
      ];

      const result = service.applyChanges(
        mockUserUsingIdAsDiscriminator,
        changes,
      );

      expect(result?.address?.length).toBe(2);
      expect(result?.address![1]).toEqual(workAddress);
      expect(result._version).toBe(1);
    });

    describe("for items with _id as discriminator", () => {
      it("should remove array item", () => {
        const changes: ChangeLog[] = [
          {
            path: "address.$id=add1",
            oldValue: mockUserUsingIdAsDiscriminator.address![0],
            newValue: undefined,
            version: 1,
          },
        ];

        const result = service.applyChanges(
          mockUserUsingIdAsDiscriminator,
          changes,
        );

        expect(result.address!.length).toBe(0);
        expect(result._version).toBe(1);
      });

      it("should modify array item property", () => {
        const changes: ChangeLog[] = [
          {
            path: "address.$id=add1.state",
            oldValue: "ON",
            newValue: "AB",
            version: 1,
          },
        ];

        const result = service.applyChanges(
          mockUserUsingIdAsDiscriminator,
          changes,
        );

        const add1 = result.address!.find((a) => a!._id === "add1");
        expect(add1?.state).toBe("AB");
        expect(result._version).toBe(1);
      });
    });

    describe("for items with index as discriminator", () => {
      it("should remove array item", () => {
        const changes: ChangeLog[] = [
          {
            path: "address.$idx=0",
            oldValue: mockUserUsingIdAsDiscriminator.address![0],
            newValue: undefined,
            version: 1,
          },
        ];

        const result = service.applyChanges(
          mockUserUsingIndexDiscriminator,
          changes,
        );

        expect(result.address!.length).toBe(0);
        expect(result._version).toBe(1);
      });

      it("should modify array item property", () => {
        const changes: ChangeLog[] = [
          {
            path: "address.$idx=0.state",
            oldValue: "ON",
            newValue: "AB",
            version: 1,
          },
        ];

        const result = service.applyChanges(
          mockUserUsingIndexDiscriminator,
          changes,
        );

        const add1 = result.address![0];
        expect(add1?.state).toBe("AB");
        expect(result._version).toBe(1);
      });
    });
  });

  describe("compareProperties", () => {
    it("should detect simple property change", () => {
      const updatedUser: DeepPartial<User> = {
        ...mockUserUsingIdAsDiscriminator,
        firstName: "Iqbal Ahmed",
      };
      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(
        mockUserUsingIdAsDiscriminator,
        updatedUser,
        changes,
      );

      expect(changes).toEqual([
        {
          path: "firstName",
          oldValue: "John Doe",
          newValue: "Iqbal Ahmed",
        },
      ]);
    });

    it("should detect nested property change", () => {
      const updatedUser: DeepPartial<User> = {
        ...mockUserUsingIdAsDiscriminator,
        hair: { ...mockUserUsingIdAsDiscriminator.hair, color: "blonde" },
      };
      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(
        mockUserUsingIdAsDiscriminator,
        updatedUser,
        changes,
      );

      expect(changes).toEqual([
        {
          path: "hair.color",
          oldValue: "black",
          newValue: "blonde",
        },
      ]);
    });

    describe("for items with _id as discriminator", () => {
      it("should detect array item modification", () => {
        const updatedUser: DeepPartial<User> = {
          ...mockUserUsingIdAsDiscriminator,
          address: mockUserUsingIdAsDiscriminator.address!.map((address) =>
            address!._id === "add1" ? { ...address, state: "BC" } : address,
          ),
        };
        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          mockUserUsingIdAsDiscriminator,
          updatedUser,
          changes,
        );

        expect(changes).toEqual([
          {
            path: "address.$id=add1.state",
            oldValue: "ON",
            newValue: "BC",
          },
        ]);
      });

      it("should detect array item addition", () => {
        const workAddress: DeepPartial<Address> = {
          _id: "add2",
          city: "Paris",
        };
        const updatedUser: DeepPartial<User> = {
          ...mockUserUsingIdAsDiscriminator,
          address: [...mockUserUsingIdAsDiscriminator.address!, workAddress],
        };
        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          mockUserUsingIdAsDiscriminator,
          updatedUser,
          changes,
        );

        expect(changes).toEqual([
          {
            path: "address",
            oldValue: undefined,
            newValue: workAddress,
          },
        ]);
      });

      it("should detect array item removal", () => {
        const updatedUser: DeepPartial<User> = {
          ...mockUserUsingIdAsDiscriminator,
          address: mockUserUsingIdAsDiscriminator.address?.filter(
            (add) => add?._id !== "add1",
          ),
        };
        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          mockUserUsingIdAsDiscriminator,
          updatedUser,
          changes,
        );

        expect(changes).toEqual([
          {
            path: "address.$id=add1",
            oldValue: mockUserUsingIdAsDiscriminator.address![0],
            newValue: undefined,
          },
        ]);
      });
    });

    describe("for items with index as discriminator", () => {
      it("should detect array item modification", () => {
        const updatedUser: DeepPartial<User> = {
          ...mockUserUsingIndexDiscriminator,
          address: mockUserUsingIndexDiscriminator.address!.map((add, i) =>
            i === 0 ? { ...add, state: "BC" } : add,
          ),
        };
        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          mockUserUsingIndexDiscriminator,
          updatedUser,
          changes,
          "",
          "index",
        );

        expect(changes).toEqual([
          {
            path: "address.$idx=0.state",
            oldValue: "ON",
            newValue: "BC",
          },
        ]);
      });

      it("should detect array item addition", () => {
        const workAddress: DeepPartial<Address> = { city: "Paris" };
        const updatedUser: DeepPartial<User> = {
          ...mockUserUsingIndexDiscriminator,
          address: [...mockUserUsingIndexDiscriminator.address!, workAddress],
        };
        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          mockUserUsingIndexDiscriminator,
          updatedUser,
          changes,
          "",
          "index",
        );

        expect(changes).toEqual([
          {
            path: "address",
            oldValue: undefined,
            newValue: workAddress,
          },
        ]);
      });

      it("should detect array item removal", () => {
        const updatedUser: DeepPartial<User> = {
          ...mockUserUsingIndexDiscriminator,
          address: mockUserUsingIndexDiscriminator.address!.filter(
            (_, i) => i !== 0,
          ),
        };
        const changes: ChangeLogWithoutVersion[] = [];

        service.compareProperties(
          mockUserUsingIndexDiscriminator,
          updatedUser,
          changes,
          "",
          "index",
        );

        expect(changes).toEqual([
          {
            path: "address.$idx=0",
            oldValue: mockUserUsingIndexDiscriminator.address![0],
            newValue: undefined,
          },
        ]);
      });
    });

    it("should detect multiple changes", () => {
      const workAddress: DeepPartial<Address> = {
        _id: "add2",
        city: "Vancouver",
      };
      const updatedUser: DeepPartial<User> = {
        ...mockUserUsingIdAsDiscriminator,
        firstName: "Jane Smith",
        age: 31,
        address: [
          { ...mockUserUsingIdAsDiscriminator.address![0], state: "SK" },
          workAddress,
        ],
      };
      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(
        mockUserUsingIdAsDiscriminator,
        updatedUser,
        changes,
      );

      expect(changes).toEqual([
        { path: "firstName", oldValue: "John Doe", newValue: "Jane Smith" },
        { path: "age", oldValue: 30, newValue: 31 },
        {
          path: "address.$id=add1.state",
          oldValue: "ON",
          newValue: "SK",
        },
        {
          path: "address",
          oldValue: undefined,
          newValue: workAddress,
        },
      ]);
    });

    it("should handle whole array addition", () => {
      const initWorkExpArray: DeepPartial<WorkExperience>[] = [
        { _id: "work1", employer: "cibc" },
      ];

      const updatedUser: DeepPartial<User> = {
        ...mockUserUsingIdAsDiscriminator,
        workExperience: initWorkExpArray,
      };
      const changes: ChangeLogWithoutVersion[] = [];

      service.compareProperties(
        mockUserUsingIdAsDiscriminator,
        updatedUser,
        changes,
      );

      expect(changes).toEqual([
        {
          path: "workExperience",
          oldValue: undefined,
          newValue: initWorkExpArray,
        },
      ]);
    });
  });
});

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
