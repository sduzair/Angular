import { ErrorHandler, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  EMPTY,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import { TransactionDateDirective } from '../reporting-ui/edit-form/transaction-date.directive';
import { TransactionSearchService } from '../transaction-search/transaction-search.service';
import {
  CATEGORY_LABEL,
  getSubjectIdAndCategory,
  NODE_ENUM,
} from './circular/circular.component';
import { fiuMap } from './fiu';
import {
  getTxnMethod,
  METHOD_ENUM,
  METHOD_FRIENDLY_NAME,
} from './txn-method-breakdown/txn-method-breakdown.component';

@Injectable()
export class AccountMethodsService {
  private errorHandler = inject(ErrorHandler);
  private caseRecord = inject(CaseRecordStore);
  private searchService = inject(TransactionSearchService);

  private selections$ = this.caseRecord.state$.pipe(
    map(({ selections }) => selections),
    takeUntilDestroyed(),
  );

  private partyKeysSelection$ = this.caseRecord.state$.pipe(
    map(({ searchParams: { partyKeysSelection } }) => partyKeysSelection),
    takeUntilDestroyed(),
  );

  private accountsInfo$ = this.caseRecord.state$.pipe(
    map(
      ({ searchParams: { accountNumbersSelection } }) =>
        accountNumbersSelection,
    ),
    switchMap((accountNumbersSelection) => {
      return forkJoin(
        accountNumbersSelection.map((item) =>
          this.searchService.getAccountInfo(item.account),
        ),
      ).pipe(
        catchError((error) => {
          this.errorHandler.handleError(error);
          return of();
        }),
      );
    }),
    map((responses) =>
      responses.map(
        ({ account, accountCurrency: currency, branch: transit }) => ({
          account,
          currency,
          transit,
        }),
      ),
    ),
    takeUntilDestroyed(),
  );

  private accountMethods$ = combineLatest([
    this.accountsInfo$,
    this.partyKeysSelection$,
    this.selections$,
  ]).pipe(
    map(([accountsInfo, partyKeysSelection, transactionSelections]) => {
      const focalSubjects = new Set(partyKeysSelection);

      const transactionsCredit = transactionSelections.filter(
        (txn) => txn.flowOfFundsCreditedAccount,
      );
      const transactionsDebit = transactionSelections.filter(
        (txn) => txn.flowOfFundsDebitedAccount,
      );

      const accountMethods: AccountMethods[] = [];

      for (const {
        account: selectedAccount,
        currency: accountCurrency,
        transit,
      } of accountsInfo) {
        // CREDITS - funds received into this account
        const methodMapCredits: Partial<Record<MethodKey, MethodVal>> = {};

        for (const {
          flowOfFundsCreditedAccount,
          flowOfFundsCreditAmount,
          flowOfFundsTransactionDate,
          dateOfTxn,
          methodOfTxn,
          startingActions,
          completingActions,
          flowOfFundsTransactionDesc,
        } of transactionsCredit) {
          if (flowOfFundsCreditedAccount !== selectedAccount) continue;

          const { typeOfFunds: saTypeOfFunds } = startingActions[0];
          const { detailsOfDispo: caDetailsOfDispo } = completingActions[0];

          const methodKey =
            getTxnMethod(saTypeOfFunds, caDetailsOfDispo, methodOfTxn) ??
            METHOD_ENUM.Unknown;

          const amount = flowOfFundsCreditAmount ?? 0;
          const date = TransactionDateDirective.format(
            TransactionDateDirective.parse(
              flowOfFundsTransactionDate ?? (dateOfTxn || ''),
            ),
          );

          // Initialize method entry if not exists
          if (!methodMapCredits[methodKey]) {
            methodMapCredits[methodKey] = {
              type: METHOD_FRIENDLY_NAME[methodKey] ?? 'Unknown Method',
              amount: 0,
              count: 0,
              dates: [],
              subjects: [],
            } satisfies MethodVal;
          }

          const methodEntry = methodMapCredits[methodKey];
          methodEntry.amount += amount;
          methodEntry.count += 1;
          if (date && !methodEntry.dates.includes(date)) {
            methodEntry.dates.push(date);
            methodEntry.dates.sort();
          }

          // Extract conductors and account holders from starting actions
          for (const sa of startingActions) {
            const {
              conductors = [],
              accountHolders = [],
              fiuNo,
              branch,
              account,
            } = sa;
            // Add conductors
            for (const conductor of conductors) {
              addSubject({
                subject: conductor,
                focalSubjects,
                methodEntry,
                subjectRelation: 'conductor',
                fiu: fiuNo ?? '',
                transit: branch ?? '',
                account: account ?? '',
                methodKey,
                flowOfFundsTransactionDesc,
              });
            }

            // Add account holders
            for (const holder of accountHolders) {
              addSubject({
                subject: holder,
                focalSubjects,
                methodEntry,
                subjectRelation: 'accountholder',
                fiu: fiuNo ?? '',
                transit: branch ?? '',
                account: account ?? '',
                methodKey,
                flowOfFundsTransactionDesc,
              });
            }
          }
        }

        // Add credits entry
        accountMethods.push({
          account: selectedAccount,
          currency: accountCurrency ?? '',
          transit,
          type: 'credits',
          methodMap: methodMapCredits,
        });

        // DEBITS - funds sent from this account
        const methodMapDebits: Partial<Record<MethodKey, MethodVal>> = {};

        for (const {
          flowOfFundsDebitedAccount,
          flowOfFundsDebitAmount,
          flowOfFundsTransactionDate,
          dateOfTxn,
          methodOfTxn,
          startingActions,
          completingActions,
          flowOfFundsTransactionDesc,
        } of transactionsDebit) {
          if (flowOfFundsDebitedAccount !== selectedAccount) continue;

          const { typeOfFunds: saTypeOfFunds } = startingActions[0];
          const { detailsOfDispo: caDetailsOfDispo } = completingActions[0];

          const methodKey =
            getTxnMethod(saTypeOfFunds, caDetailsOfDispo, methodOfTxn) ??
            METHOD_ENUM.Unknown;

          const amount = flowOfFundsDebitAmount ?? 0;
          const date = TransactionDateDirective.format(
            TransactionDateDirective.parse(
              flowOfFundsTransactionDate ?? (dateOfTxn || ''),
            ),
          );

          // Initialize method entry if not exists
          if (!methodMapDebits[methodKey]) {
            methodMapDebits[methodKey] = {
              type: METHOD_FRIENDLY_NAME[methodKey] ?? 'Unknown Method',
              amount: 0,
              count: 0,
              dates: [],
              subjects: [],
            } satisfies MethodVal;
          }

          const methodEntry = methodMapDebits[methodKey];
          methodEntry.amount += amount;
          methodEntry.count += 1;
          if (date && !methodEntry.dates.includes(date)) {
            methodEntry.dates.push(date);
            methodEntry.dates.sort();
          }

          // Extract beneficiaries and account holders from completing actions
          for (const ca of completingActions) {
            const {
              beneficiaries = [],
              accountHolders = [],
              fiuNo,
              branch,
              account,
            } = ca;

            // Add beneficiaries
            for (const beneficiary of beneficiaries) {
              addSubject({
                subject: beneficiary,
                focalSubjects,
                methodEntry,
                subjectRelation: 'beneficiary',
                fiu: fiuNo ?? '',
                transit: branch ?? '',
                account: account ?? '',
                methodKey,
                flowOfFundsTransactionDesc,
              });
            }

            // Add account holders
            for (const holder of accountHolders) {
              addSubject({
                subject: holder,
                focalSubjects,
                methodEntry,
                subjectRelation: 'accountholder',
                fiu: fiuNo ?? '',
                transit: branch ?? '',
                account: account ?? '',
                methodKey,
                flowOfFundsTransactionDesc,
              });
            }
          }
        }

        // Add debits entry
        accountMethods.push({
          account: selectedAccount,
          currency: accountCurrency ?? '',
          transit,
          type: 'debits',
          methodMap: methodMapDebits,
        });
      }

      return accountMethods;
    }),
    takeUntilDestroyed(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  getAllAccountMethods$(): Observable<AccountMethods[]> {
    return this.accountMethods$;
  }
}

interface AccountMethods {
  account: string;
  transit: string;
  currency: string;
  type: 'credits' | 'debits';
  methodMap: Partial<Record<MethodKey, MethodVal>>;
}

export type MethodKey =
  | (typeof METHOD_ENUM)[keyof typeof METHOD_ENUM]
  | (number & {});

interface MethodVal {
  type: (typeof METHOD_FRIENDLY_NAME)[keyof typeof METHOD_FRIENDLY_NAME];
  amount: number;
  count: number;
  dates: string[];
  subjects: MethodSubject[];
}

interface MethodSubject {
  name: string;
  category: SUBJECT_TYPE;
  categoryLabel: string;
  subjectRelation: 'accountholder' | 'beneficiary' | 'conductor';
  fiu?: string;
  account?: string;
  subjectPhrase: string;
}

type SUBJECT_TYPE = keyof typeof NODE_ENUM;

function addSubject({
  subject,
  focalSubjects,
  methodEntry,
  subjectRelation,
  fiu,
  account,
  methodKey,
  flowOfFundsTransactionDesc,
}: {
  subject: {
    partyKey: string | null;
    surname: string | null;
    givenName: string | null;
    otherOrInitial: string | null;
    nameOfEntity: string | null;
  };
  focalSubjects: Set<string>;
  methodEntry: MethodVal;
  subjectRelation: 'accountholder' | 'beneficiary' | 'conductor';
  fiu?: string;
  transit?: string;
  account?: string;
  methodKey: keyof typeof METHOD_FRIENDLY_NAME;
  flowOfFundsTransactionDesc: string;
}) {
  const { category, name } = getSubjectIdAndCategory(subject, focalSubjects);

  const subjectType = Object.keys(NODE_ENUM).find(
    (key) => NODE_ENUM[key as keyof typeof NODE_ENUM] === category,
  ) as SUBJECT_TYPE;

  const categoryLabel = CATEGORY_LABEL[category];

  const exists = methodEntry.subjects.some(
    (sub) =>
      sub.name === name &&
      sub.category === subjectType &&
      sub.subjectRelation === subjectRelation &&
      sub.fiu === fiu &&
      sub.account === account,
  );

  if (!exists && METHOD_ENUM.EMT === methodKey) {
    const isEmail = EMAIL_RE.test(account ?? '');

    const bankPhrase = fiu ? `a customer of ${fiuMap[fiu ?? '']} bank` : '';

    const accountPhrase = account
      ? isEmail
        ? `with email ${account}`
        : `with account #${account}`
      : '';

    methodEntry.subjects.push({
      name,
      category: subjectType,
      categoryLabel,
      subjectRelation,
      fiu,
      account,
      subjectPhrase: (bankPhrase + ' ' + accountPhrase).trim(),
    });
    return;
  }

  if (!exists && METHOD_ENUM.Wires === methodKey) {
    const subjectPhrase = `from address ${flowOfFundsTransactionDesc
      .split('@')[1]
      ?.trim()
      .replace(/[\r\n]+/g, ' ')}`;

    methodEntry.subjects.push({
      name,
      category: subjectType,
      categoryLabel,
      subjectRelation,
      subjectPhrase,
    });
    return;
  }

  if (!exists) {
    const bankPhrase = fiu ? `a customer of ${fiuMap[fiu ?? '']} bank` : '';
    const accountPhrase = account ? `with account #${account}` : '';

    methodEntry.subjects.push({
      name,
      category: subjectType,
      categoryLabel,
      subjectRelation,
      fiu,
      account,
      subjectPhrase: (bankPhrase + ' ' + accountPhrase).trim(),
    });
  }
}

// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
