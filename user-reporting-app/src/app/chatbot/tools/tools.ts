import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { firstValueFrom, map } from 'rxjs';
import {
  CaseRecordStore,
  StrTransactionChangeLogs,
  StrTransactionWithChangeLogs,
} from '../../aml/case-record.store';
import { AccountTransactionTotalsService } from '../../analytics/account-transaction-totals.service';
import { VALIDATION_KEYS } from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { TransactionSearchService } from '../../transaction-search/transaction-search.service';
import { hasDataIntegrity } from '../../reporting-ui/edit-form/common-validation';

export const getReviewPeriod = createTool({
  name: 'getReviewPeriod',
  description:
    'Returns the currently selected review period range(s) (start/end date pairs) used to scope the transaction activity being reviewed.',
  schema: s.object('No parameters required.', {}),
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
  schema: s.object('No parameters required.', {}),
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

export const getSubjectInfoByPartyKey = createTool({
  name: 'getSubjectInfoByPartyKey',
  description:
    'Given a party key, returns subject details (at minimum the subject name) for use in narratives and labeling involved parties.',
  schema: s.object('Party key input', {
    partyKey: s.string('The party key number of the subject'),
  }),
  handler: ({ partyKey }) => {
    return firstValueFrom(
      inject(TransactionSearchService).getPartyInfo(partyKey),
    );
  },
});

export const getAccountTransactionTotals = createTool({
  name: 'getAccountTransactionTotals',
  description:
    'Returns aggregated transaction totals by account and direction (credits/debits), summarized by transaction type with amounts, counts, date coverage, and involved subjects.',
  schema: s.object('No parameters required.', {}),
  handler: () => {
    // Converts Maps to arrays of objects for serialization
    return firstValueFrom(
      inject(AccountTransactionTotalsService)
        .getAccountTransactionTotals$()
        .pipe(
          map((accountTotals) =>
            accountTotals.map((account) => ({
              ...account,
              totalsList: Array.from(account.totalsMap.entries()).map(
                ([
                  txnTypeKey,
                  { transactionType, amountsMap, count, dates, subjects },
                ]) => ({
                  txnTypeKey,
                  transactionType,
                  amountsList: Array.from(amountsMap.entries()).map(
                    ([currency, amount]) => ({
                      currency,
                      amount,
                    }),
                  ),
                  count,
                  dates,
                  subjects,
                }),
              ),
            })),
          ),
        ),
    );
  },
});

export const checkDataIntegrity = createTool({
  name: 'checkDataIntegrity',
  description:
    'Checks if any of the currently selected transactions are missing required data',
  schema: s.object('No parameters required.', {}),
  handler: () => {
    return firstValueFrom(
      inject(CaseRecordStore).selectionsComputed$.pipe(
        map((selections) => selections.every(hasDataIntegrity)),
      ),
    );
  },
});
