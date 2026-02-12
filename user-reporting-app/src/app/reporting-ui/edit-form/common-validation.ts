import { FormGroup } from '@angular/forms';
import {
  CompletingAction,
  ConductorNpdData,
  StartingAction,
} from '../reporting-ui-table/reporting-ui-table.component';
import { RecursiveOmit, TypedForm } from './edit-form.component';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from './form-options.service';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';

export const hasPersonName = (cond: {
  _hiddenSurname?: string | null;
  _hiddenGivenName?: string | null;
  _hiddenOtherOrInitial?: string | null;
  _hiddenNameOfEntity?: string | null;
}) =>
  !!cond._hiddenGivenName &&
  !!cond._hiddenSurname &&
  (true || !!cond._hiddenOtherOrInitial);

export const hasEntityName = (cond: {
  _hiddenSurname?: string | null;
  _hiddenGivenName?: string | null;
  _hiddenOtherOrInitial?: string | null;
  _hiddenNameOfEntity?: string | null;
}) => !!cond._hiddenNameOfEntity;

export function hasMissingConductorInfo(
  value: RecursiveOmit<StartingAction, keyof ConductorNpdData>,
) {
  if (value.wasCondInfoObtained === false) return false;

  if (
    value.wasCondInfoObtained === true &&
    value.conductors!.every(
      (cond) => hasPersonName(cond) || hasEntityName(cond),
    )
  )
    return false;

  return true;
}

export function hasMissingAccountInfo(
  action: FormGroup<
    TypedForm<
      RecursiveOmit<StartingAction, keyof ConductorNpdData> | CompletingAction
    >
  >['value'],
) {
  const isDepositToAccount =
    'detailsOfDispo' in action &&
    (action.detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION) ===
      'Deposit to account';

  if (
    (isDepositToAccount || action.fiuNo === '010') &&
    (!action.branch ||
      !action.account ||
      !action.accountType ||
      (action.accountType === 'Other' && !action.accountTypeOther) ||
      !action.accountCurrency ||
      !action.accountStatus ||
      !action.accountOpen ||
      (action.accountStatus === 'Closed' && !action.accountClose))
  )
    return true;

  if ((action.accountHolders ?? []).some(hasMissingHolderInfo)) return true;

  return false;
}

export function hasInvalidFiu(
  action: FormGroup<
    TypedForm<
      RecursiveOmit<StartingAction, keyof ConductorNpdData> | CompletingAction
    >
  >['value'],
) {
  if (!action.fiuNo) return false;

  if (
    'typeOfFunds' in action &&
    action.typeOfFunds ===
      ('International Funds Transfer' satisfies FORM_OPTIONS_TYPE_OF_FUNDS)
  ) {
    return false;
  }

  if (action.fiuNo.length > 0 && action.fiuNo.length !== 3) return true;

  return false;
}

export function hasMissingCheque(action: StartingAction) {
  if (
    action.directionOfSA !== 'In' ||
    action.typeOfFunds !== ('Cheque' satisfies FORM_OPTIONS_TYPE_OF_FUNDS)
  )
    return false;

  if (!action.fiuNo || !action.branch || !action.account || !action.accountType)
    return true;

  if ((action.accountHolders ?? []).length == 0) return true;

  if ((action.accountHolders ?? []).some(hasMissingHolderInfo)) return true;

  return false;
}

function hasMissingHolderInfo(value: {
  _hiddenSurname?: string | null;
  _hiddenGivenName?: string | null;
  _hiddenOtherOrInitial?: string | null;
  _hiddenNameOfEntity?: string | null;
}): boolean {
  return !hasPersonName(value) && !hasEntityName(value);
}

export function hasMissingBasicInfo(
  txn: StrTransactionWithChangeLogs,
): boolean {
  // Validate methodOfTxn
  if (!txn.methodOfTxn) {
    return true;
  }

  // Validate startingActions array exists and has at least one action
  if (!txn.startingActions || txn.startingActions.length === 0) {
    return true;
  }

  // Validate each starting action
  for (const sa of txn.startingActions) {
    // Validate starting action required fields
    if (sa.amount == null || isNaN(sa.amount)) {
      return true;
    }

    if (!sa.currency) {
      return true;
    }

    if (!sa.typeOfFunds) {
      return true;
    }

    // Validate conductors (each starting action needs exactly one conductor)
    if (!sa.conductors || sa.conductors.length !== 1) {
      return true;
    }

    if (!sa.conductors[0].linkToSub) {
      return true;
    }
  }

  // Validate completingActions array structure
  if (!txn.completingActions || txn.completingActions.length === 0) {
    return true;
  }

  // Validate completingActions array structure
  if (!txn.completingActions || txn.completingActions.length !== 1) {
    return true;
  }

  const ca = txn.completingActions[0];

  // Validate completing action required fields
  if (ca.amount == null || isNaN(ca.amount)) {
    return true;
  }

  if (!ca.currency) {
    return true;
  }

  if (!ca.detailsOfDispo) {
    return true;
  }

  if (txn.wasTxnAttempted === false && (ca.beneficiaries ?? []).length === 0)
    return true;

  // All validations passed
  return false;
}
