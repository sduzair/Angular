import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { firstValueFrom, map } from 'rxjs';
import { CaseRecordStore } from '../../aml/case-record.store';
import { AccountTransactionTotalsService } from '../../analytics/account-transaction-totals.service';
import { TransactionSearchService } from '../../transaction-search/transaction-search.service';
import { hasMissingBasicInfo } from '../../reporting-ui/edit-form/common-validation';
import {
  _hiddenValidationType,
  validationKeys,
} from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';

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
    'Returns aggregated transaction totals by account and direction (credits/debits), summarized by transaction type with totals, counts, date coverage, and involved subjects.',
  handler: () => {
    return firstValueFrom(
      inject(AccountTransactionTotalsService)
        .getAccountTransactionTotals$()
        .pipe(
          map((accountTotals) =>
            accountTotals.map((account) => ({
              ...account,
              // Convert Map to array of objects
              totals: Array.from(account.totalsMap.entries()).map(
                ([txnTypeKey, totalsData]) => ({
                  txnTypeKey,
                  type: totalsData.type,
                  // Convert amounts Map to array
                  amounts: Array.from(totalsData.amountsMap.entries()).map(
                    ([currency, amount]) => ({
                      currency,
                      amount,
                    }),
                  ),
                  count: totalsData.count,
                  dates: totalsData.dates,
                  subjects: totalsData.subjects,
                }),
              ),
            })),
          ),
        ),
    );
  },
});

export const verifyBasicInfo = createTool({
  name: 'verifyBasicInfo',
  description:
    'Checks if any of the currently selected transactions are missing required basic information',
  handler: () => {
    return firstValueFrom(
      inject(CaseRecordStore).selectionsComputed$.pipe(
        map((selections) =>
          selections.some((sel) =>
            (sel._hiddenValidation ?? []).some((v) =>
              validationKeys.includes(v),
            ),
          ),
        ),
      ),
    );
  },
});
