import { FormGroup } from '@angular/forms';
import {
  AccountHolder,
  CompletingAction,
  ConductorNpdData,
  StartingAction,
} from '../reporting-ui-table/reporting-ui-table.component';
import { RecursiveOmit, TypedForm } from './edit-form.component';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from './form-options.service';

export const hasPersonName = (cond: AccountHolder) =>
  !!cond.givenName && !!cond.surname && (true || !!cond.otherOrInitial);

export const hasEntityName = (cond: AccountHolder) => !!cond.nameOfEntity;

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

  // todo: check for account holder
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

  if (!action.branch && !action.account && !action.accountType) return true;

  return false;
}
