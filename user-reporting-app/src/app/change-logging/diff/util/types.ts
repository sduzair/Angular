// thanks to https://github.com/Starcounter-Jack/JSON-Patch/blob/master/src/core.ts
export class JSONPatchTestError extends Error {
  constructor(
    public testedPath: string,
    public testedValue: Diffable,
    public actualValue: Diffable,
  ) {
    super(`Failed jsonpatchtest - path: ${testedPath}`);
  }
}

export type Operation =
  | AddOperation
  | RemoveOperation
  | ReplaceOperation
  | MoveOperation
  | CopyOperation
  | TestOperation;

interface BaseOperation {
  path: string;
}

interface AddOperation extends BaseOperation {
  op: 'add';
  value: Diffable;
}

interface RemoveOperation extends BaseOperation {
  op: 'remove';
}

interface ReplaceOperation extends BaseOperation {
  op: 'replace';
  value: Diffable;
}

interface MoveOperation extends BaseOperation {
  op: 'move';
  from: string;
}

interface CopyOperation extends BaseOperation {
  op: 'copy';
  from: string;
}

interface TestOperation extends BaseOperation {
  op: 'test';
  value: Diffable;
}

type Primitive = string | boolean | number | bigint | null | undefined;

export type Diffable<D extends number = 10> = D extends 0
  ? Primitive
  :
      | Primitive
      | Diffable<Decrement<D>>[]
      | { [index: string]: Diffable<Decrement<D>> };

export type DiffableCollection = Record<string, Diffable> | Diffable[];

// Helper type to decrement depth counter
// prevents type instantiation too deep and possibly infinite
type Decrement<N extends number> = N extends 10
  ? 9
  : N extends 9
    ? 8
    : N extends 8
      ? 7
      : N extends 7
        ? 6
        : N extends 6
          ? 5
          : N extends 5
            ? 4
            : N extends 4
              ? 3
              : N extends 3
                ? 2
                : N extends 2
                  ? 1
                  : N extends 1
                    ? 0
                    : 0;
