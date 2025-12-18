import { TEST_USER_ADMIN } from '../auth.fixture';
import { SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE } from './case-record.selections.data.fixture';
import { CaseRecordState } from './case-record.store';

export const AML_ID_DEV_OR_TEST_ONLY_FIXTURE = 99999999;
export const CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE =
  '33a41dcc-ab8e-4a9b-89ea-c6a2fec46356';

export const SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE: CaseRecordState = {
  caseRecordId: CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE,
  amlId: String(AML_ID_DEV_OR_TEST_ONLY_FIXTURE),
  transactionSearchParams: {
    partyKeysSelection: ['3415674561', '1846597320'],
    accountNumbersSelection: [
      '84255 / 5582195',
      '31980 / 8692413',
      '87594 / 5647218',
    ],
    sourceSystemsSelection: ['ABM', 'OLB'],
    productTypesSelection: [
      'Asset-Based Loan',
      'Book-Only Net Yield Instrument',
    ],
    reviewPeriodSelection: [
      {
        start: '2025/09/01',
        end: '2025/09/01',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  createdBy: TEST_USER_ADMIN.username,
  status: 'Active',
  etag: 0,
  lastUpdated: '1996-06-13',
  selections: SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE.map((txn) => ({
    ...txn,
    _hiddenTxnType: txn.flowOfFundsSource,
    _hiddenAmlId: String(AML_ID_DEV_OR_TEST_ONLY_FIXTURE),
    _hiddenStrTxnId: txn.flowOfFundsAmlTransactionId,
    _version: 0,
    changeLogs: [],
    caseRecordId: CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE,
  })),
};

export const ACCOUNT_INFO_BY_AML_ID_DEV_OR_TEST_ONLY_FIXTURE = {
  amlId: String(AML_ID_DEV_OR_TEST_ONLY_FIXTURE),
  partyKeys: [
    {
      partyKey: '3415674561',
      accountModels: [
        { accountTransit: '84255', accountNumber: '5582195' },
        { accountTransit: '31980', accountNumber: '8692413' },
        { accountTransit: '87594', accountNumber: '5647218' },
        {
          accountNumber: '4242424242424242',
        },
      ],
    },
    {
      partyKey: '1846597320',
      accountModels: [
        { accountTransit: '84255', accountNumber: '5582195' },
        { accountTransit: '31980', accountNumber: '8692413' },
        { accountTransit: '87594', accountNumber: '5647218' },
        {
          accountNumber: '5555555555554444',
        },
      ],
    },
  ],
};
