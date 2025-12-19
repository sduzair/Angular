/* eslint-disable no-case-declarations */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import * as JsonPatchTypes from './util/types';
import * as JsonPatchUtil from './util/util';

// reference https://jsonpatch.com/
/**
 * Returns an array of JSONPatch operations that allow you to replicate the changes required to make `origin` equal to `destination`.
 *
 * **Disclaimer:** Both `origin` and `destination` are only allowed to contain `string | number | bigint | boolean | undefined | null | Record<string, ...> | Array<...>`
 * where ... is one of the mentioned types. Also make sure that both `origin` and `destination` don't include ANY circular references.
 *
 * @param origin Initial state
 * @param destination Desired result
 * @returns List of operations (empty if no operations required)
 */
export function diff(
  origin: JsonPatchTypes.Diffable,
  destination: JsonPatchTypes.Diffable,
): JsonPatchTypes.Operation[] {
  if (origin === destination) return [];

  const operations: JsonPatchTypes.Operation[] = [];
  const stack: {
    o: JsonPatchTypes.Diffable;
    d: JsonPatchTypes.Diffable;
    p: string;
  }[] = new Array(JsonPatchUtil.STACK_SIZE);
  stack[0] = { o: origin, d: destination, p: '' };
  let path = '',
    originIsArr = false,
    destIsArr = false,
    originLength = 0,
    destLength = 0,
    combinedLength = 0, // probably faster than Math.min(originLength, destLength)
    stackIndex = 0;

  while (stackIndex >= 0) {
    const { o: origin, d: destination, p: parentPath } = stack[stackIndex--]!;
    if (origin === destination) continue;

    ((originIsArr = Array.isArray(origin)),
      (destIsArr = Array.isArray(destination)));
    if (originIsArr && destIsArr) {
      ((originLength = (origin as []).length),
        (destLength = (destination as []).length),
        (combinedLength = originLength));
      if (destLength === originLength) {
      } else if (destLength > originLength) {
        for (let i = destLength; i-- !== originLength; ) {
          operations.push({
            op: 'add',
            path: parentPath + '/' + i,
            value: (destination as [])[i],
          });
        }
      } else {
        combinedLength = destLength;
        for (let i = originLength; i-- !== destLength; ) {
          operations.push({
            op: 'remove',
            path: parentPath + '/' + i,
          });
        }
      }

      for (let i = combinedLength; i-- !== 0; ) {
        if ((origin as [])[i] !== (destination as [])[i]) {
          const originValue = (origin as [])[i],
            destinationValue = (destination as [])[i];
          path = parentPath + '/' + i;
          if (
            typeof originValue === 'object' &&
            typeof destinationValue === 'object'
          ) {
            if (++stackIndex === stack.length) stack.length *= 2;
            stack[stackIndex] = {
              o: originValue,
              d: destinationValue,
              p: path,
            };
          } else {
            operations.push({
              op: 'replace',
              path,
              value: destinationValue,
            });
          }
        }
      }
    } else if (
      originIsArr === destIsArr && // both would have to be false since one of them is false
      origin !== null &&
      typeof origin === 'object' &&
      destination !== null &&
      typeof destination === 'object'
    ) {
      for (const key in origin) {
        if (JsonPatchUtil.hasOwnProperty(destination, key)) {
          if ((origin as any)[key] !== (destination as any)[key]) {
            const originValue = (origin as any)[key],
              destinationValue = (destination as any)[key];
            path = parentPath + '/' + JsonPatchUtil.escapePathComponent(key);
            if (
              typeof originValue === 'object' &&
              typeof destinationValue === 'object'
            ) {
              if (++stackIndex === stack.length) stack.length *= 2;
              stack[stackIndex] = {
                o: originValue,
                d: destinationValue,
                p: path,
              };
            } else {
              operations.push({
                op: 'replace',
                path,
                value: destinationValue,
              });
            }
          }
        } else {
          operations.push({
            op: 'remove',
            path: parentPath + '/' + JsonPatchUtil.escapePathComponent(key),
          });
        }
      }

      for (const key in destination) {
        if (!JsonPatchUtil.hasOwnProperty(origin, key)) {
          operations.push({
            op: 'add',
            path: parentPath + '/' + JsonPatchUtil.escapePathComponent(key),
            value: (destination as any)[key],
          });
        }
      }
    } else {
      operations.push({
        op: 'replace',
        path: parentPath,
        value: destination,
      });
    }
  }

  return operations;
}

/**
 * Applies the supplied list of JSONPatch operations onto `target` **(in-place, no cloning)** and returns the result.
 * If none of the operations modify the root (`operation.path == ""`), you can safely assume that the returned value matches your first argument's reference.
 *
 * **Disclaimer:** This function will never check for validity of `operations`, like faulty paths, the only security mechanism implemented in the
 * entire library is supporting the [test](https://datatracker.ietf.org/doc/html/rfc6902#section-4.6) JSONPatch operation. Make sure that you know what you're doing.
 *
 * @param target Initial state
 * @param operations List of JSONPatch operations
 * @returns Desired result
 */
export function patch(
  target: JsonPatchTypes.Diffable,
  operations: JsonPatchTypes.Operation[],
): JsonPatchTypes.Diffable {
  let result: JsonPatchTypes.Diffable = target;
  for (const operation of operations) {
    if (operation.path === '') {
      switch (operation.op) {
        case 'add':
        case 'replace':
          result = operation.value;
          break;
        case 'remove':
          target = null;
          break;
        case 'move':
        case 'copy':
          result = JsonPatchUtil.accessPath(
            result as JsonPatchTypes.DiffableCollection,
            operation.from,
          );
          break;
        case 'test':
          if (!JsonPatchUtil.isEqual(result, operation.value))
            throw new JsonPatchTypes.JSONPatchTestError(
              '',
              operation.value,
              result,
            );
          break;
      }
    } else {
      switch (operation.op) {
        case 'add': {
          let parent = result as JsonPatchTypes.DiffableCollection;
          const pathSegments = JsonPatchUtil.unescapedPathSegments(
            operation.path,
          );
          const last = pathSegments.length - 1;

          for (let i = 1; i < last; i++) {
            parent = parent[
              pathSegments[i] as keyof typeof parent
            ] as JsonPatchTypes.DiffableCollection;
          }

          const lastPointer = pathSegments[last]!;
          if (Array.isArray(parent)) {
            if (lastPointer === '-') {
              parent.push(operation.value);
            } else {
              parent.splice(parseInt(lastPointer), 0, operation.value);
            }
          } else {
            (parent[
              pathSegments[last] as keyof typeof parent
            ] as JsonPatchTypes.Diffable) = operation.value;
          }
          break;
        }
        case 'replace': {
          let parent = result as JsonPatchTypes.DiffableCollection;
          const pathSegments = JsonPatchUtil.unescapedPathSegments(
            operation.path,
          );
          const last = pathSegments.length - 1;

          for (let i = 1; i < last; i++) {
            parent = parent[
              pathSegments[i] as keyof typeof parent
            ] as JsonPatchTypes.DiffableCollection;
          }

          (parent[
            pathSegments[last] as keyof typeof parent
          ] as JsonPatchTypes.Diffable) = operation.value;
          break;
        }
        case 'remove': {
          let parent = result as JsonPatchTypes.DiffableCollection;
          const pathSegments = JsonPatchUtil.unescapedPathSegments(
            operation.path,
          );
          const last = pathSegments.length - 1;

          for (let i = 1; i < last; i++) {
            parent = parent[
              pathSegments[i] as keyof typeof parent
            ] as JsonPatchTypes.DiffableCollection;
          }

          const lastPointer = pathSegments[last]!;
          if (Array.isArray(parent)) {
            parent.splice(parseInt(lastPointer), 1);
          } else {
            delete parent[lastPointer];
          }
          break;
        }
        case 'move': {
          if (operation.from === operation.path) break;

          let fromValue: JsonPatchTypes.Diffable;
          {
            let parent = result as JsonPatchTypes.DiffableCollection;
            const pathSegments = JsonPatchUtil.unescapedPathSegments(
              operation.from,
            );
            const last = pathSegments.length - 1;

            for (let i = 1; i < last; i++) {
              parent = parent[
                pathSegments[i] as keyof typeof parent
              ] as JsonPatchTypes.DiffableCollection;
            }

            if (Array.isArray(parent)) {
              const idx = parseInt(pathSegments[last]!);
              fromValue = parent[idx];
              parent.splice(idx, 1);
            } else {
              fromValue = parent[pathSegments[last]!];
              delete parent[pathSegments[last]!];
            }
          }
          {
            let parent = result as JsonPatchTypes.DiffableCollection;
            const pathSegments = JsonPatchUtil.unescapedPathSegments(
              operation.path,
            );
            const last = pathSegments.length - 1;

            for (let i = 1; i < last; i++) {
              parent = parent[
                pathSegments[i] as keyof typeof parent
              ] as JsonPatchTypes.DiffableCollection;
            }

            (parent[
              pathSegments[last] as keyof typeof parent
            ] as JsonPatchTypes.Diffable) = fromValue;
          }
          break;
        }
        case 'copy': {
          if (operation.from === operation.path) break;

          let fromValue: JsonPatchTypes.Diffable;
          {
            let parent = result as JsonPatchTypes.DiffableCollection;
            const pathSegments = JsonPatchUtil.unescapedPathSegments(
              operation.from,
            );
            const last = pathSegments.length - 1;

            for (let i = 1; i < last; i++) {
              parent = parent[
                pathSegments[i] as keyof typeof parent
              ] as JsonPatchTypes.DiffableCollection;
            }

            fromValue = parent[
              pathSegments[last] as keyof typeof parent
            ] as JsonPatchTypes.Diffable;
          }
          {
            let parent = result as JsonPatchTypes.DiffableCollection;
            const pathSegments = JsonPatchUtil.unescapedPathSegments(
              operation.path,
            );
            const last = pathSegments.length - 1;

            for (let i = 1; i < last; i++) {
              parent = parent[
                pathSegments[i] as keyof typeof parent
              ] as JsonPatchTypes.DiffableCollection;
            }

            (parent[
              pathSegments[last] as keyof typeof parent
            ] as JsonPatchTypes.Diffable) =
              typeof fromValue === 'object'
                ? structuredClone(fromValue)
                : fromValue;
          }
          break;
        }
        case 'test':
          const actualValue = JsonPatchUtil.accessPath(
            result as JsonPatchTypes.DiffableCollection,
            operation.path,
          );
          if (!JsonPatchUtil.isEqual(actualValue, operation.value))
            throw new JsonPatchTypes.JSONPatchTestError(
              operation.path,
              operation.value,
              actualValue,
            );
          break;
      }
    }
  }
  return result;
}
