import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { firstValueFrom, map } from 'rxjs';
import { CaseRecordStore } from '../../aml/case-record.store';
import { AccountMethodsService } from '../../analytics/account-methods.service';
import { TransactionSearchService } from '../../transaction-search/transaction-search.service';

export const getReviewPeriod = createTool({
  name: 'getReviewPeriod',
  description:
    'Returns the currently selected review period range(s) (start/end date pairs) used to scope the transaction activity being reviewed.',
  handler: () => {
    return firstValueFrom(
      inject(CaseRecordStore).state$.pipe(
        map(
          ({ searchParams: { reviewPeriodSelection } }) =>
            reviewPeriodSelection,
        ),
      ),
    );
  },
});

export const getAccountSelection = createTool({
  name: 'getAccountSelection',
  description: 'Returns the selected account(s)',
  handler: () => {
    return firstValueFrom(
      inject(CaseRecordStore).state$.pipe(
        map(
          ({ searchParams: { accountNumbersSelection } }) =>
            accountNumbersSelection,
        ),
      ),
    );
  },
});

export const getPartyKeysByAccount = createTool({
  name: 'getPartyKeysByAccount',
  description:
    'Given an account number, returns the party key(s) for the account holder(s) so ownership can be determined (e.g., single vs joint).',
  schema: s.object('Account number input', {
    accountNo: s.string('The account number of the account'),
  }),
  handler: ({ accountNo }): Promise<string[]> => {
    return firstValueFrom(
      inject(TransactionSearchService)
        .getAccountInfo(accountNo)
        .pipe(
          map(({ accountHolders }) =>
            accountHolders.map(({ partyKey }) => partyKey),
          ),
        ),
    );
  },
});

export const getSubjectInfoByParyKey = createTool({
  name: 'getSubjectInfoByParyKey',
  description:
    'Given a party key, returns subject details (at minimum the subject name) for use in narratives and labeling involved parties.',
  schema: s.object('Party key input', {
    _hiddenPartyKey: s.string('The party key number of the subject'),
  }),
  handler: ({ _hiddenPartyKey }) => {
    return firstValueFrom(
      inject(TransactionSearchService).getPartyInfo(_hiddenPartyKey),
    );
  },
});

export const getAccountMethods = createTool({
  name: 'getAccountMethods',
  description:
    'Returns aggregated transaction activity by account and direction (credits/debits), summarized by method with totals, counts, date coverage, and involved subjects.',
  handler: () => {
    return firstValueFrom(
      inject(AccountMethodsService).getAllAccountTransactionActivity$(),
    );
  },
});
