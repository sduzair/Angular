import { Injectable } from "@angular/core";

type DiscriminatorType = "_id" | "index";

@Injectable({ providedIn: "root" })
export class ChangeLogService<T extends object> {
  // Closure-based path resolver factory
  private createPathResolver(discriminator: DiscriminatorType) {
    return (arr: any[], part: string): number => {
      if (part.startsWith("$id=") && discriminator === "_id") {
        const targetId = part.split("=")[1];
        return arr.findIndex((item) => item._id === targetId);
      }
      if (part.startsWith("$idx=") && discriminator === "index") {
        return Number(part.split("=")[1]);
      }
      return -1;
    };
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

  // Refactored array comparison by ID
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

      originalItem
        ? this.compareProperties(originalItem, updatedItem, changes, itemPath)
        : changes.push({ path, oldValue: undefined, newValue: updatedItem });
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
    const maxLength = Math.max(arr1.length, arr2.length);

    Array.from({ length: maxLength }).forEach((_, i) => {
      const itemPath = `${path}.$idx=${i}`;
      const originalItem = arr1[i];
      const updatedItem = arr2[i];

      if (i < arr1.length && i < arr2.length) {
        this.compareProperties(originalItem, updatedItem, changes, itemPath);
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
  applyChanges(original: T, changes: ChangeLog[]): WithVersion<T> {
    const result = structuredClone(original) as WithVersion<T>;

    changes.forEach((change) => {
      const pathParts = change.path.split(".");
      let current: Record<string, unknown> = result;
      let parent: Record<string, unknown> | null = null;
      let targetIndex: number | null = null;

      pathParts.forEach((part, index) => {
        const isLastSegment = index === pathParts.length - 1;
        const isArraySegment = ["$id=", "$idx="].some((prefix) =>
          part.startsWith(prefix),
        );

        // Handle array navigation
        if (isArraySegment) {
          let resolvePath: ReturnType<typeof this.createPathResolver> | null =
            null;
          if (part.startsWith("$id="))
            resolvePath = this.createPathResolver("_id");
          if (part.startsWith("$idx="))
            resolvePath = this.createPathResolver("index");

          if (!Array.isArray(current)) throw new Error("exptected array");

          targetIndex = resolvePath!(current, part);
          if (targetIndex === -1) return;

          parent = current;
          current = current[targetIndex];
          if (!isLastSegment) return;
        }

        // Apply changes at terminal node
        if (isLastSegment) {
          this.applyChange(change, current, parent, targetIndex, part);
          return;
        }

        // Continue traversal
        parent = current;
        current = current[part] as any;
      });
    });

    result._version = changes.at(-1)?.version ?? 0;
    return result;
  }

  // Change application logic extracted to method
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
    } else if (change.oldValue === undefined && Array.isArray(current[part])) {
      current[part].push(change.newValue);
    } else {
      current[part] = change.newValue;
    }
  }

  // Refactored comparison using higher-order comparator
  compareProperties(
    obj1: any,
    obj2: any,
    changes: ChangeLogWithoutVersion[] = [],
    path = "",
    discriminator: DiscriminatorType = "_id",
  ) {
    const allKeys = new Set([
      ...Object.keys(obj1 ?? {}),
      ...Object.keys(obj2 ?? {}),
    ]);
    const compareArrays = this.getArrayComparator(discriminator);

    allKeys.forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (!val1 && Array.isArray(val2)) {
        changes.push({
          path: currentPath,
          oldValue: undefined,
          newValue: val2,
        });
      } else if (Array.isArray(val1) && Array.isArray(val2)) {
        compareArrays(val1, val2, changes, currentPath);
      } else if (typeof val2 === "object" && val2 !== null) {
        this.compareProperties(
          val1 ?? {},
          val2,
          changes,
          currentPath,
          discriminator,
        );
      } else if (val1 !== val2) {
        changes.push({ path: currentPath, oldValue: val1, newValue: val2 });
      }
    });
  }
}

export type ChangeLogWithoutVersion = Omit<ChangeLog, "version">;

export interface ChangeLog {
  path: string; // Format: "arrayName.$id=ID.property" or "arrayName"
  oldValue: any;
  newValue: any;
  version: number;
}

export type WithVersion<T> = T & {
  /**
   * This version is not session version. It represents the last session in which the user was edited
   *
   * @type {(number | null)}
   */
  _version: number | null;
};

type WithId = { _id: string };
