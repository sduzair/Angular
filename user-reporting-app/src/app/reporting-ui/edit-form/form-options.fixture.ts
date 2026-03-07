export const FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE = {
  methodOfTxn: {
    ABM: 'ABM',
    'In-Person': 'In-Person',
    Online: 'Online',
    Other: 'Other',
  },
  typeOfFunds: {
    'Funds Withdrawal': 'Funds Withdrawal',
    Cash: 'Cash',
    Cheque: 'Cheque',
    'Domestic Funds Transfer': 'Domestic Funds Transfer',
    'Email money transfer': 'Email money transfer',
    'International Funds Transfer': 'International Funds Transfer',
    Other: 'Other',
  },
  accountType: {
    Business: 'Business',
    Casino: 'Casino',
    Personal: 'Personal',
    Other: 'Other',
  },
  amountCurrency: {
    CAD: 'CAD',
    USD: 'USD',
    INR: 'INR',
  },
  accountCurrency: {
    CAD: 'CAD',
    USD: 'USD',
  },
  accountStatus: {
    Active: 'Active',
    Closed: 'Closed',
    Inactive: 'Inactive',
    Dorment: 'Dorment',
  },
  directionOfSA: {
    In: 'In',
    Out: 'Out',
  },
  detailsOfDisposition: {
    'Deposit to account': 'Deposit to account',
    'Cash Withdrawal (account based)': 'Cash Withdrawal (account based)',
    'Issued Cheque': 'Issued Cheque',
    'Outgoing email money transfer': 'Outgoing email money transfer',
    'Purchase of / Payment for services': 'Purchase of / Payment for services',
    'Purchase of / Payment for goods': 'Purchase of / Payment for goods',
    Other: 'Other',
  },
} as const;
