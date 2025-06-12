import { Injectable } from "@angular/core";
import { User } from "./table/table.component";

// todo generate tests for prop change, array item addition/removal
@Injectable({
  providedIn: "root",
})
export class ChangeLogService {
  // Function to Recreate User from Changes
  applyChanges(original: User, changes: ChangeLog[]) {
    const result = JSON.parse(JSON.stringify(original)) as UserWithVersion;

    changes.forEach((change) => {
      const pathParts = change.path.split(".");
      let current: any = result;
      let parent: any = null;
      let targetId: string | null = null;

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];

        if (part.startsWith("$id=")) {
          // Array element reference
          targetId = part.split("=")[1];
          console.assert(
            Array.isArray(current),
            `Assert current is an array\n${JSON.stringify(change, null, 2)}`,
          );
          if (!Array.isArray(current)) {
            break;
          }
          const index = current.findIndex((item: any) => item._id === targetId);
          console.assert(
            index !== -1,
            `Assert item ${targetId} found in array\n${JSON.stringify(change, null, 2)}`,
          );
          if (index === -1) {
            break;
          }
          parent = current;
          current = current[index];
          if (i !== pathParts.length - 1) continue;
        }

        if (i === pathParts.length - 1) {
          // Last segment - apply change
          if (change.newValue === undefined) {
            // Array item removal
            if (Array.isArray(parent) && targetId) {
              const index = parent.findIndex(
                (item: any) => item._id === targetId,
              );
              console.assert(
                index !== -1,
                `Assert item ${targetId} found in array\n${JSON.stringify(change, null, 2)}`,
              );
              if (index !== -1) parent.splice(index, 1);
            }
          } else if (
            change.oldValue === undefined &&
            Array.isArray(current[part])
          ) {
            // Array add new item
            current[part].push(change.newValue);
          } else {
            // Modify value
            current[part] = change.newValue;
          }
          continue;
        }

        // Navigate deeper
        console.assert(
          current[part] != null,
          `Assert property ${part} exists\n${JSON.stringify(change, null, 2)}`,
        );
        if (!current[part]) break;
        parent = current;
        current = current[part];
      }
    });

    result._version = changes.at(-1)?.version || 0;

    return result;
  }

  private compareArrays(
    arr1: any[],
    arr2: any[],
    changes: ChangeLogWithoutVersion[] = [],
    path = "",
  ) {
    const originalMap = new Map<string, any>(
      arr1.filter((i) => i._id).map((i) => [i._id, i]),
    );
    const updatedMap = new Map<string, any>(
      arr2.filter((i) => i._id).map((i) => [i._id, i]),
    );

    // Handle modifications and additions
    arr2.forEach((updatedItem) => {
      const itemPath = `${path}.$id=${updatedItem._id}`;
      if (updatedItem._id && originalMap.has(updatedItem._id)) {
        // Existing item - compare properties
        this.compareProperties(
          originalMap.get(updatedItem._id),
          updatedItem,
          changes,
          itemPath,
        );
      } else {
        // New item
        changes.push({
          path: path,
          oldValue: undefined,
          newValue: updatedItem,
        });
      }
    });

    // Handle removals
    arr1.forEach((originalItem) => {
      if (originalItem._id && !updatedMap.has(originalItem._id)) {
        changes.push({
          path: `${path}.$id=${originalItem._id}`,
          oldValue: originalItem,
          newValue: undefined,
        });
      }
    });
  }

  compareProperties(
    obj1: any,
    obj2: any,
    changes: ChangeLogWithoutVersion[] = [],
    path = "",
  ) {
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    allKeys.forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (Array.isArray(val2)) {
        if (!Array.isArray(val1)) {
          // Whole array replacement
          changes.push({
            path: currentPath,
            oldValue: val1,
            newValue: val2,
          });
        } else {
          this.compareArrays(val1, val2, changes, currentPath);
        }
      } else if (typeof val2 === "object" && val2 !== null) {
        this.compareProperties(val1 || {}, val2, changes, currentPath);
      } else if (val1 !== val2) {
        changes.push({
          path: currentPath,
          oldValue: val1,
          newValue: val2,
        });
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

export type UserWithVersion = User & {
  /**
   * This version is not session version. It represents the last session in which the user was edited
   *
   * @type {(number | null)}
   */
  _version: number | null;
};
