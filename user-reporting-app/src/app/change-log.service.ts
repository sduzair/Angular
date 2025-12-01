import { Injectable } from "@angular/core";
import { SPECIAL_EMPTY_VALUE } from "./reporting-ui/edit-form/mark-as-empty.directive";

type DiscriminatorType = "_id" | "index";

@Injectable({ providedIn: "root" })
export class ChangeLogService {
  // Closure-based path resolver factory
  private createPathResolver(discriminator: DiscriminatorType) {
    if (discriminator === "_id")
      return (arr: any[], part: string): number => {
        console.assert(part.startsWith("$id=") && discriminator === "_id");
        const targetId = part.split("=")[1];
        return arr.findIndex((item) => item._id === targetId);
      };

    if (discriminator === "index")
      return (arr: any[], part: string): number => {
        console.assert(part.startsWith("$idx=") && discriminator === "index");
        return Number(part.split("=")[1]);
      };
    return;
  }

  // Higher-order function for array comparison
  private getArrayComparator(discriminator: DiscriminatorType) {
    return (
      arr1: any[],
      arr2: any[],
      changes: ChangeLogWithoutVersion[],
      path: string,
    ) => {
      if (discriminator === "_id") {
        this.compareById(arr1, arr2, changes, path);
      } else {
        this.compareByIndex(arr1, arr2, changes, path);
      }
    };
  }

  // array comparison by ID
  private compareById(
    arr1: any[],
    arr2: any[],
    changes: ChangeLogWithoutVersion[],
    path: string,
  ) {
    const originalMap = new Map(arr1.map((item) => [item._id, item]));
    const updatedMap = new Map(arr2.map((item) => [item._id, item]));

    // Process additions and modifications
    arr2.forEach((updatedItem) => {
      const itemPath = `${path}.$id=${updatedItem._id}`;
      const originalItem = originalMap.get(updatedItem._id);

      if (originalItem) {
        this.compareProperties(originalItem, updatedItem, changes, {
          path: itemPath,
          discriminator: "_id",
        });
      } else {
        if (!ChangeLogService.hasObjectIdentifier(updatedItem)) {
          throw new Error("array items must have an identifier");
        }
        changes.push({ path, oldValue: undefined, newValue: updatedItem });
      }
    });

    // Process deletions
    arr1.forEach((originalItem) => {
      if (!updatedMap.has(originalItem._id)) {
        changes.push({
          path: `${path}.$id=${originalItem._id}`,
          oldValue: originalItem,
          newValue: undefined,
        });
      }
    });
  }

  // Refactored array comparison by index
  private compareByIndex(
    arr1: any[],
    arr2: any[],
    changes: ChangeLogWithoutVersion[],
    path: string,
  ) {
    // const maxLength = Math.max(arr1.length, arr2.length);
    const maxLength = arr1.length;

    Array.from({ length: maxLength }).forEach((_, i) => {
      const itemPath = `${path}.$idx=${i}`;
      const originalItem = arr1[i];
      const updatedItem = arr2[i];

      if (!!updatedItem && !ChangeLogService.hasObjectIdentifier(updatedItem)) {
        throw new Error("array items must have an identifier");
      }
      if (i < arr1.length && i < arr2.length) {
        this.compareProperties(originalItem, updatedItem, changes, {
          path: itemPath,
          discriminator: "index",
        });
      } else if (i < arr1.length) {
        changes.push({
          path: itemPath,
          oldValue: originalItem,
          newValue: undefined,
        });
      } else {
        changes.push({ path, oldValue: undefined, newValue: updatedItem });
      }
    });
  }

  // Main applyChanges function using path traversal closure
  applyChanges<T extends WithVersion>(original: T, changes: ChangeLog[]): T {
    // Immutability does not affect syncing UI features like highlights as rows are id-based
    // Immutable clone preserves original on error
    const result = structuredClone(original);

    changes.forEach((change) => {
      const pathSegments = change.path.split(".");
      let current: Record<string, unknown> = result;
      let parent: Record<string, unknown> | null = null;
      let targetIndex: number | null = null;

      pathSegments.forEach((segment, index) => {
        const isLastSegment = index === pathSegments.length - 1;
        const isArraySegment = ["$id=", "$idx="].some((prefix) =>
          segment.startsWith(prefix),
        );

        if (Array.isArray(current) && !isArraySegment)
          throw new Error("unknown array segment");

        // Handle array navigation
        if (isArraySegment) {
          let resolvePath: ReturnType<typeof this.createPathResolver> | null =
            null;
          if (segment.startsWith("$id="))
            resolvePath = this.createPathResolver("_id");
          if (segment.startsWith("$idx="))
            resolvePath = this.createPathResolver("index");

          if (!Array.isArray(current))
            throw new Error("exptected array invalid array access");

          targetIndex = resolvePath!(current, segment);
          if (targetIndex === -1) {
            throw new Error(
              "unknown target index: accessing non existent item in array",
            );
          }

          parent = current;
          current = current[targetIndex];
          if (!isLastSegment) {
            targetIndex = null;
            return;
          }
        }

        // Apply changes at terminal node
        if (isLastSegment) {
          this.applyChange(change, current, parent, targetIndex, segment);
          return;
        }

        // Continue traversal
        parent = current;
        current = current[segment] as any;
      });
    });

    result._version = changes.at(-1)?.version ?? 0;
    return result;
  }

  // apply primitive value change from change log
  private applyChange(
    change: ChangeLog,
    current: any,
    parent: any,
    targetIndex: number | null,
    part: string,
  ) {
    if (
      change.newValue === undefined &&
      Array.isArray(parent) &&
      targetIndex !== null
    ) {
      parent.splice(targetIndex, 1);
    } else if (
      typeof current[part] === "undefined" &&
      !Array.isArray(change.newValue) &&
      typeof change.newValue === "object" &&
      change.newValue !== null
    ) {
      throw new Error(
        "add new array item when current array prop is undefined",
      );
    } else if (
      Array.isArray(current[part]) &&
      current[part].length > 0 &&
      Array.isArray(change.newValue)
    ) {
      throw new Error("entire array addition when current is already array");
    } else if (
      Array.isArray(current[part]) &&
      change.newValue !== undefined &&
      !Array.isArray(change.newValue)
    ) {
      current[part].push(change.newValue);
    } else {
      current[part] = change.newValue;
    }
  }

  // comparison using higher-order comparator
  compareProperties(
    obj1: any,
    obj2: any,
    changes: ChangeLogWithoutVersion[],
    options: {
      path?: string;
      discriminator: DiscriminatorType;
    } = { path: "", discriminator: "_id" },
  ) {
    const { path, discriminator } = options;
    const allKeys = new Set([
      ...Object.keys(obj1 ?? {}),
      ...Object.keys(obj2 ?? {}),
    ]);
    const compareArrays = this.getArrayComparator(discriminator);

    const isNotIgnoredKey = (key: string) =>
      !key.startsWith("_hidden") &&
      key !== "_mongoid" &&
      !key.startsWith("flowOfFunds");

    [...allKeys.values()].filter(isNotIgnoredKey).forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (isIgnoredChange(val1, val2)) {
        return;
      }
      if (typeof val2 === "object" && val2 !== null && !Array.isArray(val2)) {
        this.compareProperties(val1 ?? {}, val2, changes, {
          path: currentPath,
          discriminator,
        });
        return;
      }
      if (!val1 && Array.isArray(val2) && val2.length !== 0) {
        if (!val2.every(ChangeLogService.hasObjectIdentifier)) {
          throw new Error("array items must have an identifier");
        }
        changes.push({
          path: currentPath,
          oldValue: undefined,
          newValue: val2,
        });
        return;
      }
      if (discriminator === "index" && ["_mongoid", "_id"].includes(key)) {
        return;
      }
      // clear props that are not marked for clear
      if (
        discriminator === "index" &&
        typeof val2 !== "boolean" &&
        !val2 &&
        !this.isDependentProp(key)
      ) {
        return;
      }
      if (
        discriminator === "index" &&
        this.isDependentProp(key) &&
        obj2[ChangeLogService.depPropToToggleMap[key]] == null
      ) {
        return;
      }
      if (
        discriminator === "index" &&
        this.isDependentProp(key) &&
        obj2[ChangeLogService.depPropToToggleMap[key]] === true
      ) {
        // replace
        if (!isIgnoredChange(val1, undefined)) {
          changes.push({
            path: currentPath,
            oldValue: val1,
            newValue: undefined,
          });
        }

        if (!isIgnoredChange(undefined, val2)) {
          if (
            Array.isArray(val2) &&
            !val2.every(ChangeLogService.hasObjectIdentifier)
          ) {
            throw new Error("array items must have an identifier");
          }
          changes.push({
            path: currentPath,
            oldValue: undefined,
            newValue: val2,
          });
        }
        return;
      }
      if (
        discriminator === "index" &&
        this.isDependentProp(key) &&
        obj2[ChangeLogService.depPropToToggleMap[key]] === false
      ) {
        if (isIgnoredChange(val1, undefined)) {
          return;
        }
        // clear
        changes.push({
          path: currentPath,
          oldValue: val1,
          newValue: undefined,
        });
        return;
      }
      if (discriminator === "index" && val2 === SPECIAL_EMPTY_VALUE) {
        if (isIgnoredChange(val1, undefined)) {
          return;
        }
        changes.push({
          path: currentPath,
          oldValue: val1,
          newValue: undefined,
        });
        return;
      }
      if (Array.isArray(val2)) {
        compareArrays(val1, val2, changes, currentPath);
        return;
      }
      if (val1 !== val2) {
        changes.push({ path: currentPath, oldValue: val1, newValue: val2 });
      }
    });

    function isIgnoredChange(val1: any, val2: any) {
      return (
        (val1 === "" && val2 == null) ||
        (val1 == null && val2 === "") ||
        (val1 == null && val2 == null) ||
        (val1 == null && Array.isArray(val2) && val2.length === 0) ||
        (val2 == null && Array.isArray(val1) && val1.length === 0) ||
        // (val1 == null && typeof val2 === "boolean" && val2 === false) || // used by dep prop toggles
        (val2 == null && typeof val1 === "boolean" && val1 === false)
      );
    }
  }

  static depPropToToggleMap = {
    accountHolders: "hasAccountHolders" as const,
    sourceOfFunds: "wasSofInfoObtained" as const,
    conductors: "wasCondInfoObtained" as const,
    involvedIn: "wasAnyOtherSubInvolved" as const,
    beneficiaries: "wasBenInfoObtained" as const,
    wasTxnAttemptedReason: "wasTxnAttempted" as const,
    dateOfPosting: "hasPostingDate" as const,
    timeOfPosting: "hasPostingDate" as const,
  };

  static hasObjectIdentifier(obj: unknown) {
    return (
      typeof obj === "object" && obj !== null && "_id" in obj && !!obj["_id"]
    );
  }

  isDependentProp(
    key: string,
  ): key is keyof typeof ChangeLogService.depPropToToggleMap {
    return Object.keys(ChangeLogService.depPropToToggleMap).includes(key);
  }

  static isDependentPropToggle(
    key: string,
  ): key is (typeof ChangeLogService.depPropToToggleMap)[keyof typeof ChangeLogService.depPropToToggleMap] {
    return Object.values(ChangeLogService.depPropToToggleMap).includes(
      key as any,
    );
  }

  static getInitValForDependentPropToggle(
    key:
      | (typeof ChangeLogService.depPropToToggleMap)[keyof typeof ChangeLogService.depPropToToggleMap]
      | string,
    val: unknown,
    isBulkEdit: boolean,
    useRaw: boolean,
  ): any {
    // If no toggle mapped, just return current
    if (!ChangeLogService.isDependentPropToggle(key) || useRaw) {
      return val as string | null | undefined;
    }

    if (typeof val === "boolean") {
      return val;
    }

    if (isBulkEdit) return null;

    return true;
  }
}

export type ChangeLogWithoutVersion = Omit<ChangeLog, "version">;

export interface ChangeLog {
  path: string; // Format: "arrayName.$id=ID.property" or "arrayName"
  oldValue?: any;
  newValue?: any;
  version: number;
}

export type WithVersion<T = object> = T & {
  /**
   * This version is not session version. It represents the last session in which the user was edited
   *
   * @type {(number | null)}
   */
  _version: number | null;
};
