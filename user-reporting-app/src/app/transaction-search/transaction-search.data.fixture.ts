/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AbmSourceData,
  EmtSourceData,
  FlowOfFundsSourceData,
  OlbSourceData,
  TransactionSearchResponse,
  WireSourceData,
} from './transaction-search.service';

import * as fofInEmtNonCibcSender from '../../../../data/fofInEmtNonCibcSender.json';
import * as fofInEmtCibcSender from '../../../../data/fofInEmtCibcSender.json';
import * as fofOutEmtNonCibcReceipient from '../../../../data/fofOutEmtNonCibcRecipient.json';
import * as fofOutEmtCibcRecepient from '../../../../data/fofOutEmtCibcRecipient.json';
import * as fofCashDep from '../../../../data/fofCashDeposit.json';
import * as fofCashWith from '../../../../data/fofCashWithdrawal.json';
import * as fofInWire from '../../../../data/fofWireIn.json';
import { IMPORT_SIZE } from '../aml/case-record.selections.data.fixture';

import * as inEmtNonCibcSender from '../../../../data/emtInEmtNonCibcSender.json';
import * as inEmtCibcSender from '../../../../data/emtInEmtCibcSender.json';
import * as olbInEmtNonCibcSender from '../../../../data/olbInEmtNonCibcSender.json';
import * as olbInEmtCibcSender from '../../../../data/olbInEmtCibcSender.json';

import * as outEmtNonCibcReceipient from '../../../../data/emtOutEmtNonCibcRecipient.json';
import * as outEmtCibcRecepient from '../../../../data/emtOutEmtCibcRecipient.json';
import * as olbOutEmtNonCibcReceipient from '../../../../data/olbOutEmtNonCibcRecipient.json';
import * as olbOutEmtCibcReceipient from '../../../../data/olbOutEmtCibcRecipient.json';

import * as cashDep from '../../../../data/abmCashDeposit.json';
import * as cashWith from '../../../../data/abmCashWithdrawal.json';

import * as inWire from '../../../../data/wireIn.json';

const fofInEmtNonCibcSenderData = (fofInEmtNonCibcSender as any).default.slice(
  0,
  IMPORT_SIZE,
);
const fofInEmtCibcSenderData = (fofInEmtCibcSender as any).default.slice(
  0,
  IMPORT_SIZE,
);
const fofOutEmtNonCibcRecepientData = (
  fofOutEmtNonCibcReceipient as any
).default.slice(0, IMPORT_SIZE);
const fofOutEmtCibcRecepientData = (
  fofOutEmtCibcRecepient as any
).default.slice(0, IMPORT_SIZE);
const fofCashDepData = (fofCashDep as any).default.slice(0, IMPORT_SIZE);
const fofCashWithData = (fofCashWith as any).default.slice(0, IMPORT_SIZE);
const fofInWireData = (fofInWire as any).default.slice(0, IMPORT_SIZE);

const inEmtNonCibcSenderData = (inEmtNonCibcSender as any).default.slice(
  0,
  IMPORT_SIZE,
);
const inEmtCibcSenderData = (inEmtCibcSender as any).default.slice(
  0,
  IMPORT_SIZE,
);
const olbInEmtNonCibcSenderData = (olbInEmtNonCibcSender as any).default.slice(
  0,
  IMPORT_SIZE,
);
const olbInEmtCibcSenderData = (olbInEmtCibcSender as any).default.slice(
  0,
  IMPORT_SIZE,
);
const outEmtNonCibcReceipientData = (
  outEmtNonCibcReceipient as any
).default.slice(0, IMPORT_SIZE);
const outEmtCibcRecepientData = (outEmtCibcRecepient as any).default.slice(
  0,
  IMPORT_SIZE,
);
const olbOutEmtNonCibcReceipientData = (
  olbOutEmtNonCibcReceipient as any
).default.slice(0, IMPORT_SIZE);
const olbOutEmtCibcReceipientData = (
  olbOutEmtCibcReceipient as any
).default.slice(0, IMPORT_SIZE);
const cashDepData = (cashDep as any).default.slice(0, IMPORT_SIZE);
const cashWithData = (cashWith as any).default.slice(0, IMPORT_SIZE);
const inWireData = (inWire as any).default.slice(0, IMPORT_SIZE);

export const TRANSACTION_SEARCH_RES_DEV_ONLY: TransactionSearchResponse = [
  {
    sourceId: 'FlowOfFunds',
    status: 'completed',
    sourceData: [
      ...fofCashDepData,
      ...fofCashWithData,
      ...fofInEmtNonCibcSenderData,
      ...fofInEmtCibcSenderData,
      ...fofOutEmtNonCibcRecepientData,
      ...fofOutEmtCibcRecepientData,
      ...fofInWireData,
    ] as FlowOfFundsSourceData[],
  },
  {
    sourceId: 'ABM',
    status: 'completed',
    sourceData: [...cashDepData, ...cashWithData] as AbmSourceData[],
  },
  {
    sourceId: 'OLB',
    status: 'completed',
    sourceData: [
      ...olbInEmtNonCibcSenderData,
      ...olbInEmtCibcSenderData,
      ...olbOutEmtNonCibcReceipientData,
      ...olbOutEmtCibcReceipientData,
    ] as OlbSourceData[],
  },
  {
    sourceId: 'EMT',
    status: 'completed',
    sourceData: [
      ...inEmtNonCibcSenderData,
      ...inEmtCibcSenderData,
      ...outEmtNonCibcReceipientData,
      ...outEmtCibcRecepientData,
    ] as EmtSourceData[],
  },
  {
    sourceId: 'Wire',
    status: 'completed',
    sourceData: [...inWireData] as WireSourceData[],
  },
];
