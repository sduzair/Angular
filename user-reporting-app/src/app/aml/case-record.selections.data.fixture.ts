import * as inEmtNonCibcSender from '../../../../data/inEMTCompleteWithRawSubjectNonCibcSenderWithBackup.json';
import * as inEmtCibcSender from '../../../../data/inEMTCompleteWithRawSubjectCibcSenderWithBackup.json';

import * as outEmtNonCibcReceipient from '../../../../data/outEMTCompleteWithRawSubjectNonCibcRecipientWithBackup.json';
import * as outEmtCibcRecepient from '../../../../data/outEMTCompleteWithRawSubjectCibcRecipientWithBackup.json';

import * as cashDep from '../../../../data/cashDepositCompleteWithRawSubjectWithBackup.json';
import * as cashWith from '../../../../data/cashWithdrawalCompleteWithRawSubjectWithBackup.json';

import * as inWire from '../../../../data/wireInCompleteWithBackup.json';

import { StrTransaction } from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';

const IMPORT_SIZE = 20;

const inEmtNonCibcSenderData = (inEmtNonCibcSender as any).default.slice(0, IMPORT_SIZE);
const inEmtCibcSenderData = (inEmtCibcSender as any).default.slice(0, IMPORT_SIZE);
const outEmtNonCibcRecepientData = (
  outEmtNonCibcReceipient as any
).default.slice(0, IMPORT_SIZE);
const outEmtCibcRecepientData = (outEmtCibcRecepient as any).default.slice(
  0,
  IMPORT_SIZE,
);
const cashDepData = (cashDep as any).default.slice(0, IMPORT_SIZE);
const cashWithData = (cashWith as any).default.slice(0, IMPORT_SIZE);
const inWireData = (inWire as any).default.slice(0, IMPORT_SIZE);

export const SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE: StrTransaction[] = [
  ...inEmtNonCibcSenderData,
  ...inEmtCibcSenderData,
  ...outEmtNonCibcRecepientData,
  ...outEmtCibcRecepientData,
  ...cashDepData,
  ...cashWithData,
  ...inWireData,
];
