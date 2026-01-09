import { TEST_USER_ADMIN } from '../auth.fixture';
import { TRANSACTION_SEARCH_RES_DEV_ONLY } from '../transaction-search/transaction-search.data.fixture';
import { SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE } from './case-record.selections.data.fixture';
import { CaseRecordState } from './case-record.store';

export const AML_ID_DEV_OR_TEST_ONLY_FIXTURE = 99999999;
export const CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE =
  '33a41dcc-ab8e-4a9b-89ea-c6a2fec46356';

export const CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE: CaseRecordState = {
  searchResult: TRANSACTION_SEARCH_RES_DEV_ONLY,
  caseRecordId: CASE_RECORD_ID_DEV_OR_TEST_ONLY_FIXTURE,
  amlId: String(AML_ID_DEV_OR_TEST_ONLY_FIXTURE),
  searchParams: {
    partyKeysSelection: ['3415674561', '1846597320'],
    accountNumbersSelection: [
      { transit: '84255', account: '5582195' },
      { transit: '31980', account: '8692413' },
      { transit: '87594', account: '5647218' },
    ],
    sourceSystemsSelection: ['ABM', 'OLB'],
    productTypesSelection: [
      'Asset-Based Loan',
      'Book-Only Net Yield Instrument',
    ],
    reviewPeriodSelection: [
      {
        start: '2024/01/01',
        end: '2025/06/01',
      },
    ],
  },
  createdAt: new Date().toISOString(),
  createdBy: TEST_USER_ADMIN.username,
  status: 'Active',
  eTag: 0,
  lastUpdated: '1996-06-13',
  selections: SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE.map((txn) => ({
    ...txn,
    eTag: 0,
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

export const SUBJECT_INFO_BY_ACCOUNT_DEV_OR_TEST_ONLY_FIXTURE = [
  {
    accountTransit: '84255',
    accountNumber: '5582195',
    partyKeys: ['3415674561', '1846597320'],
  },
  {
    accountTransit: '31980',
    accountNumber: '8692413',
    partyKeys: ['3415674561', '1846597320'],
  },
  {
    accountTransit: '87594',
    accountNumber: '5647218',
    partyKeys: ['3415674561', '1846597320'],
  },
  {
    accountNumber: '4242424242424242',
    partyKeys: ['3415674561'],
  },
  {
    accountNumber: '5555555555554444',
    partyKeys: ['1846597320'],
  },
];

export const SUBJECT_INFO_BY_PARTY_KEY_DEV_OR_TEST_ONLY_FIXTURE = [
  {
    partyKey: '3415674561',
    surname: 'Carter',
    givenName: 'James',
    otherOrInitial: 'L',
    nameOfEntity: '',
  },
  {
    partyKey: '1846597320',
    surname: 'Nguyen',
    givenName: 'Laura',
    otherOrInitial: 'M',
    nameOfEntity: '',
  },
];

export const ACCOUNT_INFO_DEV_OR_TEST_ONLY_FIXTURE = [
  {
    fiuNo: '010',
    branch: '84255',
    account: '5582195',
    accountType: 'Personal',
    accountTypeOther: null,
    accountOpen: '2003/08/24',
    accountClose: '',
    accountStatus: 'Active',
    accountCurrency: 'CAD',
    accountHolders: [{ partyKey: '3415674561' }, { partyKey: '1846597320' }],
  },
  {
    fiuNo: '010',
    branch: '31980',
    account: '8692413',
    accountType: 'Personal',
    accountTypeOther: null,
    accountOpen: '2001/07/14',
    accountClose: '',
    accountStatus: 'Active',
    accountCurrency: 'CAD',
    accountHolders: [{ partyKey: '3415674561' }, { partyKey: '1846597320' }],
  },
  {
    fiuNo: '010',
    branch: '87594',
    account: '5647218',
    accountType: 'Personal',
    accountTypeOther: null,
    accountOpen: '2005/06/23',
    accountClose: '',
    accountStatus: 'Active',
    accountCurrency: 'CAD',
    accountHolders: [{ partyKey: '3415674561' }, { partyKey: '1846597320' }],
  },
];
