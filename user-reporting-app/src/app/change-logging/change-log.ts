/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as JsonPatch from './diff';
import * as JsonPatchTypes from './diff/util/types';
import * as JsonPatchUtil from './diff/util/util';

export function applyChangeLogs<T extends object>(
  before: T,
  changeLogs: ChangeLogType[],
): T {
  // Immutably handling before txn preserves original on error

  return JsonPatch.patch(
    structuredClone(before) as JsonPatchTypes.Diffable,
    structuredClone(changeLogs),
  ) as T;
}

export function generateChangeLogs<T extends object>(
  before: T,
  after: T,
  options: {
    isBulkEdit: boolean;
  } = { isBulkEdit: false },
): ChangeLogType[] {
  const { isBulkEdit } = options;

  const isNotIgnoredKey = (key: string) =>
    !key.startsWith('_hidden') &&
    key !== '_mongoid' &&
    !key.startsWith('flowOfFunds') &&
    key !== '_id' &&
    key !== 'changeLogs' &&
    key !== 'eTag' &&
    key !== 'caseRecordId' &&
    !key.startsWith('npd') &&
    key !== 'sourceId';

  function isIgnoredChange(val1: any, val2: any) {
    return (
      (val1 === '' && val2 == null) ||
      (val1 == null && val2 === '') ||
      (val1 == null && val2 == null) ||
      (val1 == null && Array.isArray(val2) && val2.length === 0) ||
      (val2 == null && Array.isArray(val1) && val1.length === 0)
    );
  }

  let processedDiffs: JsonPatchTypes.Operation[];

  processedDiffs = JsonPatch.diff(
    before as JsonPatchTypes.Diffable,
    after as JsonPatchTypes.Diffable,
  )
    .filter((diff) => {
      const pathSegments = JsonPatchUtil.unescapedPathSegments(diff.path);
      const propBeingChanged = pathSegments.splice(-1)[0];
      return isNotIgnoredKey(propBeingChanged);
    })
    .filter((diff) => {
      if (diff.op !== 'replace') return true;

      const pathSegments = JsonPatchUtil.unescapedPathSegments(diff.path);
      let beforeVal = before as JsonPatchTypes.DiffableCollection;
      for (let i = 1; i < pathSegments.length; i++) {
        beforeVal = beforeVal[
          pathSegments[i] as keyof typeof beforeVal
        ] as JsonPatchTypes.DiffableCollection;
      }

      return !isIgnoredChange(beforeVal, diff.value);
    });

  const afterClone = JsonPatch.patch(
    structuredClone(after as JsonPatchTypes.Diffable),
    processedDiffs,
  );

  processedDiffs.forEach((diff) => {
    const pathSegments = JsonPatchUtil.unescapedPathSegments(diff.path);
    const propBeingChanged = pathSegments.splice(-1)[0];

    if (
      !isBoolToggle(propBeingChanged as ToggleType) &&
      !isOtherToggle(propBeingChanged as ToggleType)
    )
      return;

    const dependentProps = Object.keys(DEP_PROP_TO_TOGGLE_MAP).filter(
      (key) => DEP_PROP_TO_TOGGLE_MAP[key as DepPropType] === propBeingChanged,
    );

    if (dependentProps.length === 0) return;

    const depPropPathSegments = dependentProps.map((depProp) => {
      const pathSegmentsClone = structuredClone(pathSegments);
      pathSegmentsClone.push(depProp);
      return pathSegmentsClone;
    });

    const depPropValues = depPropPathSegments.map((pathSegment) => {
      let depPropValue = afterClone as JsonPatchTypes.DiffableCollection;
      for (let i = 1; i < pathSegment.length; i++) {
        depPropValue = depPropValue[
          pathSegment[i] as keyof typeof depPropValue
        ] as JsonPatchTypes.DiffableCollection;
      }

      return depPropValue;
    });

    for (let i = 0; i < depPropValues.length; i++) {
      const depPropVal = depPropValues[i];

      if (
        isDependentPropValueEmpty(
          dependentProps[i] as DepPropType,
          depPropVal as unknown as string | unknown[],
        )
      )
        continue;

      if (diff.op === 'remove') {
        throw new ChangeLogError(
          'DEP_PROP_MUST_BE_EMPTY',
          depPropPathSegments[i],
        );
      }

      if (
        (diff.op === 'add' || diff.op === 'replace') &&
        isBoolToggle(propBeingChanged as ToggleType) &&
        !diff.value
      ) {
        throw new ChangeLogError(
          'DEP_PROP_MUST_BE_EMPTY',
          depPropPathSegments[i],
        );
      }

      if (
        (diff.op === 'add' || diff.op === 'replace') &&
        isOtherToggle(propBeingChanged as ToggleType) &&
        (diff.value as string).trim().toLowerCase() !== 'other'
      ) {
        throw new ChangeLogError(
          'DEP_PROP_MUST_BE_EMPTY',
          depPropPathSegments[i],
        );
      }
    }
  });

  if (!isBulkEdit) return processedDiffs;

  processedDiffs = processedDiffs
    .flatMap((diff) => {
      if (diff.op === 'remove') return [];
      return diff;
    })
    .flatMap((diff) => {
      if (SA_ITEM_REGEX.test(diff.path)) return [];
      if (CA_ITEM_REGEX.test(diff.path)) return [];

      return [diff];
    });

  return processedDiffs;
}

export function getToggleInitVal(
  key: ToggleType,
  val: boolean | null | undefined,
  isBulkEdit: boolean,
): boolean | null {
  console.assert(
    isBoolToggle(key),
    'Assert valid toggle that exists in toggle map',
  );

  if (isBulkEdit) return null;

  return !!val;
}

export const DEP_PROP_TO_TOGGLE_MAP = {
  accountHolders: 'hasAccountHolders' as const,
  sourceOfFunds: 'wasSofInfoObtained' as const,
  conductors: 'wasCondInfoObtained' as const,
  involvedIn: 'wasAnyOtherSubInvolved' as const,
  beneficiaries: 'wasBenInfoObtained' as const,
  wasTxnAttemptedReason: 'wasTxnAttempted' as const,
  dateOfPosting: 'hasPostingDate' as const,
  timeOfPosting: 'hasPostingDate' as const,
  methodOfTxnOther: 'methodOfTxn' as const,
  typeOfFundsOther: 'typeOfFunds' as const,
  accountTypeOther: 'accountType' as const,
  detailsOfDispoOther: 'detailsOfDispo' as const,
};

export type ChangeLogType = JsonPatchTypes.Operation;

export class ChangeLogError extends Error {
  override name: ChangeLogErrorName;
  constructor(name: ChangeLogErrorName, pathSegments: string[]) {
    const path = pathSegments.join('/');

    const message = `[${name}] Unexpected value at path "${path}"`;
    super(message);
    this.name = name;
    Object.setPrototypeOf(this, ChangeLogError.prototype);
  }
}

type ChangeLogErrorName = 'DEP_PROP_MUST_BE_EMPTY' | 'DEP_PROP_UNKNOWN';

const SA_ITEM_REGEX = /^\/startingActions\/\d+$/;
const CA_ITEM_REGEX = /^\/completingActions\/\d+$/;

function isDependentPropValueEmpty(depProp: DepPropType, val: unknown) {
  switch (depProp) {
    case 'accountHolders':
      return !val || (Array.isArray(val) && val.length === 0);
    case 'conductors':
      return !val || (Array.isArray(val) && val.length === 0);
    case 'beneficiaries':
      return !val || (Array.isArray(val) && val.length === 0);
    case 'sourceOfFunds':
      return !val || (Array.isArray(val) && val.length === 0);
    case 'involvedIn':
      return !val || (Array.isArray(val) && val.length === 0);
    case 'wasTxnAttemptedReason':
      return !val || (typeof val === 'string' && val.trim().length === 0);
    case 'dateOfPosting':
      return !val || (typeof val === 'string' && val.trim().length === 0);
    case 'timeOfPosting':
      return !val || (typeof val === 'string' && val.trim().length === 0);
    case 'accountTypeOther':
      return !val || (typeof val === 'string' && val.trim().length === 0);
    case 'detailsOfDispoOther':
      return !val || (typeof val === 'string' && val.trim().length === 0);
    case 'methodOfTxnOther':
      return !val || (typeof val === 'string' && val.trim().length === 0);
    case 'typeOfFundsOther':
      return !val || (typeof val === 'string' && val.trim().length === 0);
  }
}

export type DepPropType = keyof typeof DEP_PROP_TO_TOGGLE_MAP;
type ToggleType = (typeof DEP_PROP_TO_TOGGLE_MAP)[DepPropType];

function isBoolToggle(prop: ToggleType) {
  return (
    [
      'wasTxnAttempted',
      'hasPostingDate',
      'hasAccountHolders',
      'wasSofInfoObtained',
      'wasCondInfoObtained',
      'wasAnyOtherSubInvolved',
      'wasBenInfoObtained',
    ] as ToggleType[]
  ).some((t) => t === prop);
}

function isOtherToggle(prop: ToggleType) {
  return (
    [
      'accountType',
      'detailsOfDispo',
      'methodOfTxn',
      'typeOfFunds',
    ] as ToggleType[]
  ).some((t) => t === prop);
}

export class UnknownDepPropError extends Error {
  override name: string;
  constructor(prop: string) {
    const name = 'UNKNOWN_DEP_PROP';
    const message = `[${name}] "${prop}"`;
    super(message);
    this.name = name;
    Object.setPrototypeOf(this, UnknownDepPropError.prototype);
  }
}
