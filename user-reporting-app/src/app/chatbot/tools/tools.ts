import { inject } from '@angular/core';
import { createTool } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { delay, firstValueFrom, map } from 'rxjs';
import { CaseRecordStore } from '../../aml/case-record.store';
import { AccountTransactionTotalsService } from '../../analytics/account-transaction-totals.service';
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

export const getPartyKeysByAccount = createTool({
  name: 'getPartyKeysByAccount',
  description:
    'Use ONLY to determine account ownership. Given an account number, returns the list of party keys for the account holder(s). ',
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

export const getAccountTransactionTotals = createTool({
  name: 'getAccountTransactionTotals',
  description:
    'Returns aggregated transaction totals by account and direction (credits/debits), summarized by transaction type with amounts, counts, date coverage, and involved subjects.',
  schema: s.object('No parameters required.', {}),
  handler: () => {
    // Converts Maps to arrays of objects for serialization
    return firstValueFrom(
      inject(AccountTransactionTotalsService).getAccountTransactionTotals$(),
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
        map(({ result: selections }) => selections.every(hasDataIntegrity)),
      ),
    );
  },
});
