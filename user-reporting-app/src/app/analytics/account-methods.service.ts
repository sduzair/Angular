import { ErrorHandler, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_METHOD_OF_TXN,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../reporting-ui/edit-form/form-options.service';
import { TransactionDateDirective } from '../reporting-ui/edit-form/transaction-date.directive';
import { TransactionSearchService } from '../transaction-search/transaction-search.service';
import { fiuMap } from './fiu';

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

      // fix: ignores manuals
      // fix: attempted txns ignore
      const transactionsCredit = transactionSelections.filter(
        (txn) => txn.flowOfFundsCreditedAccount,
      );
      const transactionsDebit = transactionSelections.filter(
        (txn) => txn.flowOfFundsDebitedAccount,
      );

      const accountMethods: AccountTransactionActivity[] = [];

      for (const {
        account: selectedAccount,
        currency: accountCurrency,
        transit,
      } of accountsInfo) {
        // CREDITS - funds received into this account
        const methodMapCredits: Partial<
          Record<TransactionTypeKey, TransactionTypeTotals>
        > = {};

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

          const txnTypeKey =
            getTransactionType(saTypeOfFunds, caDetailsOfDispo, methodOfTxn) ??
            TRANSACTION_TYPE_ENUM.Unknown;

          const amount = flowOfFundsCreditAmount ?? 0;
          const date = TransactionDateDirective.format(
            TransactionDateDirective.parse(
              flowOfFundsTransactionDate ?? (dateOfTxn || ''),
            ),
          );

          // Initialize method entry if not exists
          if (!methodMapCredits[txnTypeKey]) {
            methodMapCredits[txnTypeKey] = {
              type:
                TRANSACTION_TYPE_FRIENDLY_NAME[txnTypeKey] ?? 'Unknown Method',
              amount: 0,
              count: 0,
              dates: [],
              subjects: [],
            } satisfies TransactionTypeTotals;
          }

          const methodEntry = methodMapCredits[txnTypeKey];
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
                methodKey: txnTypeKey,
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
                methodKey: txnTypeKey,
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
        const methodMapDebits: Partial<
          Record<TransactionTypeKey, TransactionTypeTotals>
        > = {};

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

          const txnTypeKey =
            getTransactionType(saTypeOfFunds, caDetailsOfDispo, methodOfTxn) ??
            TRANSACTION_TYPE_ENUM.Unknown;

          const amount = flowOfFundsDebitAmount ?? 0;
          const date = TransactionDateDirective.format(
            TransactionDateDirective.parse(
              flowOfFundsTransactionDate ?? (dateOfTxn || ''),
            ),
          );

          // Initialize method entry if not exists
          if (!methodMapDebits[txnTypeKey]) {
            methodMapDebits[txnTypeKey] = {
              type:
                TRANSACTION_TYPE_FRIENDLY_NAME[txnTypeKey] ?? 'Unknown Method',
              amount: 0,
              count: 0,
              dates: [],
              subjects: [],
            } satisfies TransactionTypeTotals;
          }

          const methodEntry = methodMapDebits[txnTypeKey];
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
                methodKey: txnTypeKey,
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
                methodKey: txnTypeKey,
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

  getAllAccountTransactionActivity$(): Observable<
    AccountTransactionActivity[]
  > {
    return this.accountMethods$;
  }
}

interface AccountTransactionActivity {
  account: string;
  transit: string;
  currency: string;
  type: 'credits' | 'debits';
  methodMap: Partial<Record<TransactionTypeKey, TransactionTypeTotals>>;
}

export type TransactionTypeKey =
  | (typeof TRANSACTION_TYPE_ENUM)[keyof typeof TRANSACTION_TYPE_ENUM]
  | (number & {});

interface TransactionTypeTotals {
  type: (typeof TRANSACTION_TYPE_FRIENDLY_NAME)[keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME];
  amount: number;
  count: number;
  dates: string[];
  subjects: TransactionTypeSubject[];
}

interface TransactionTypeSubject {
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
  methodEntry: TransactionTypeTotals;
  subjectRelation: 'accountholder' | 'beneficiary' | 'conductor';
  fiu?: string;
  transit?: string;
  account?: string;
  methodKey: keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME;
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

  if (!exists && TRANSACTION_TYPE_ENUM.EMT === methodKey) {
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

  if (!exists && TRANSACTION_TYPE_ENUM.Wires === methodKey) {
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

export const TRANSACTION_TYPE_ENUM = {
  Unknown: 0,
  ABM: 1,
  Cheque: 2,
  OLB: 3,
  EMT: 4,
  Wires: 5,
} as const;

export const TRANSACTION_TYPE_FRIENDLY_NAME = {
  0: 'Unknown' as const,
  1: 'ABM Cash' as const,
  2: 'Cheque' as const,
  3: 'Online Banking' as const,
  4: 'Email Transfer (EMT)' as const,
  5: 'Wire Transfer' as const,
};

export function getTransactionType(
  typeOfFunds: FORM_OPTIONS_TYPE_OF_FUNDS | (string & {}) | null,
  detailsOfDispo: FORM_OPTIONS_DETAILS_OF_DISPOSITION | (string & {}) | null,
  methodOfTxn: string | null,
) {
  const typeOfFundsType = typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null;
  const detailsOfDispoType =
    detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null;
  // note: method of txn may not be identical to txn method which is used for purposes of charting
  const methodOfTxnType = methodOfTxn as FORM_OPTIONS_METHOD_OF_TXN | null;

  let method;

  if (typeOfFundsType === 'Cash' && detailsOfDispoType === 'Deposit to account')
    method = TRANSACTION_TYPE_ENUM.ABM;

  if (
    typeOfFundsType === 'Funds Withdrawal' &&
    detailsOfDispoType === 'Cash Withdrawal (account based)'
  )
    method = TRANSACTION_TYPE_ENUM.ABM;

  if (
    typeOfFundsType === 'Cheque' &&
    detailsOfDispoType === 'Deposit to account'
  )
    method = TRANSACTION_TYPE_ENUM.Cheque;

  if (typeOfFundsType === 'Cheque' && detailsOfDispoType === 'Issued Cheque')
    method = TRANSACTION_TYPE_ENUM.Cheque;

  if (methodOfTxnType === 'Online') method = TRANSACTION_TYPE_ENUM.OLB;

  if (typeOfFundsType === 'Email money transfer')
    method = TRANSACTION_TYPE_ENUM.EMT;

  if (
    typeOfFundsType === 'Funds Withdrawal' &&
    detailsOfDispoType === 'Outgoing email money transfer'
  )
    method = TRANSACTION_TYPE_ENUM.EMT;

  if (typeOfFundsType === 'International Funds Transfer')
    method = TRANSACTION_TYPE_ENUM.Wires;

  return method;
}

export const NODE_ENUM = {
  CibcPersonSubject: 0,
  CibcEntitySubject: 1,
  Account: 2,
  PersonSubject: 3,
  EntitySubject: 4,
  AttemptedTxn: 5,
  UnknownNode: 6,
  FocalPersonSubject: 7,
  FocalEntitySubject: 8,
  FocalAccount: 9,
} as const;

export const CATEGORY_LABEL: Record<number, string> = {
  7: 'an individual',
  8: 'a business/entity',
  3: 'an individual',
  4: 'a business/entity',
  0: 'an individual',
  1: 'a business/entity',
};

export function getSubjectIdAndCategory(
  subject: Subject | undefined,
  focalSubjects: Set<string>,
) {
  let category = NODE_ENUM.UnknownNode as number;
  let name = 'Unknown Subject';
  let isFocal = false;

  if (!subject) {
    return {
      subjectId: generateUnknownNodeKey(),
      category,
      name,
      isFocal,
    };
  }

  if (
    !subject.partyKey &&
    !subject.givenName &&
    !subject.otherOrInitial &&
    !subject.surname &&
    !subject.nameOfEntity
  ) {
    return {
      subjectId: generateUnknownNodeKey(),
      category,
      name,
      isFocal,
    };
  }

  const isClient = !!subject.partyKey;
  const isPerson = !!subject.surname && !!subject.givenName;
  const isEntity = !!subject.nameOfEntity;
  isFocal = !!subject.partyKey && focalSubjects.has(subject.partyKey);

  if (isFocal && isPerson) {
    category = NODE_ENUM.FocalPersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial ? subject.otherOrInitial + ' ' : ''}${subject.surname}`;
  }

  if (isFocal && isEntity) {
    category = NODE_ENUM.FocalEntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  if (!isFocal && isClient && isPerson) {
    category = NODE_ENUM.CibcPersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial ? subject.otherOrInitial + ' ' : ''}${subject.surname}`;
  }

  if (!isFocal && isClient && isEntity) {
    category = NODE_ENUM.CibcEntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  if (!isFocal && !isClient && isPerson) {
    category = NODE_ENUM.PersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial ? subject.otherOrInitial + ' ' : ''}${subject.surname}`;
  }

  if (!isFocal && !isClient && isEntity) {
    category = NODE_ENUM.EntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  return {
    subjectId: `SUBJECT-${subject.partyKey ?? ''}-${subject.surname ?? ''}-${subject.givenName ?? ''}-${subject.otherOrInitial ?? ''}-${subject.nameOfEntity ?? ''}`,
    category,
    name,
    isFocal,
  };
}

export function generateUnknownNodeKey() {
  return `UNKNOWN-${crypto.randomUUID()}`;
}

export interface Subject {
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
}
