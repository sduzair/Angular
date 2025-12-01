import {
  CompletingAction,
  ConductorNpdData,
  StartingAction,
} from "../reporting-ui-table/reporting-ui-table.component";
import { RecursiveOmit } from "./edit-form.component";

export function hasMissingConductorInfo(
  value: RecursiveOmit<StartingAction, keyof ConductorNpdData>,
) {
  const hasConductors =
    !value.conductors || (!!value.conductors && value.conductors.length === 0);
  console.assert(
    (!value.wasCondInfoObtained && hasConductors) === false,
    "Assert if no conductor info obtained then no conductors must be initialized",
  );

  if (value.wasCondInfoObtained === false) return false;

  const hasPersonName = (
    cond: Exclude<typeof value.conductors, undefined>[number],
  ) => !!cond.givenName && !!cond.surname && !!cond.otherOrInitial;

  const hasEntityName = (
    cond: Exclude<typeof value.conductors, undefined>[number],
  ) => !!cond.nameOfEntity;

  if (
    value.wasCondInfoObtained === true &&
    value.conductors!.every(
      (cond) => hasPersonName(cond) || hasEntityName(cond),
    )
  )
    return false;

  return true;
}

export function hasMissingCibcInfo(
  action:
    | RecursiveOmit<StartingAction, keyof ConductorNpdData>
    | CompletingAction,
) {
  if (action.fiuNo !== "010") return false;

  // todo: check for account holder
  if (
    !action.branch ||
    !action.account ||
    !action.accountType ||
    (action.accountType === "Other" && !action.accountTypeOther) ||
    !action.accountCurrency ||
    !action.accountStatus ||
    !action.accountOpen ||
    (action.accountStatus === "Closed" && !action.accountClose)
  )
    return true;

  return false;
}
