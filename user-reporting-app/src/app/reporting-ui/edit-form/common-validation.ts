import { FormGroup } from '@angular/forms';
import {
  AccountHolder,
  CompletingAction,
  ConductorNpdData,
  StartingAction,
} from '../reporting-ui-table/reporting-ui-table.component';
import { RecursiveOmit, TypedForm } from './edit-form.component';

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
  if (action.fiuNo !== '010') return false;

  // todo: check for account holder
  if (
    !action.branch ||
    !action.account ||
    !action.accountType ||
    (action.accountType === 'Other' && !action.accountTypeOther) ||
    !action.accountCurrency ||
    !action.accountStatus ||
    !action.accountOpen ||
    (action.accountStatus === 'Closed' && !action.accountClose)
  )
    return true;

  return false;
}
