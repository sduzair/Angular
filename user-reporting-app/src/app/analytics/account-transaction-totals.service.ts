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
import {
  CaseRecordStore,
  StrTransactionWithChangeLogs,
} from '../aml/case-record.store';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_METHOD_OF_TXN,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../reporting-ui/edit-form/form-options.service';
import { TransactionDateDirective } from '../reporting-ui/edit-form/transaction-date.directive';
import { TransactionSearchService } from '../transaction-search/transaction-search.service';
import {
  getPartyFullName,
  PartyGenType,
} from '../transaction-view/transform-to-str-transaction/party-gen.service';
import { fiuMap } from './fiu';
import { hasMissingBasicInfo } from '../reporting-ui/edit-form/common-validation';

@Injectable()
export class AccountTransactionTotalsService {
  private errorHandler = inject(ErrorHandler);
  private caseRecord = inject(CaseRecordStore);
  private searchService = inject(TransactionSearchService);

  private transactionSelections$ =
    this.caseRecord.selectionsComputed$.pipe(takeUntilDestroyed());
  private parties$ = this.caseRecord.state$.pipe(map(({ parties }) => parties));

  private partyKeysSelection$ = this.caseRecord.state$.pipe(
    map(({ searchParams: { partyKeysSelection } }) => partyKeysSelection),
    takeUntilDestroyed(),
  );

  private selectedAccountsInfo$ = this.caseRecord.state$.pipe(
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
          return of([]);
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

  private accountTotals$ = combineLatest([
    this.selectedAccountsInfo$,
    this.partyKeysSelection$,
    this.transactionSelections$,
    this.parties$,
  ]).pipe(
    // todo: verify basic info validation - amt, currency, typeoffunds, dispodetails
    map(
      ([
        selectedFocalAccountsInfo,
        partyKeysSelection,
        transactionSelections,
        parties,
      ]) => {
        const focalSubjects = new Set(partyKeysSelection);

        if (transactionSelections.some(hasManualTransaction)) return [];
        if (transactionSelections.some(hasMissingBasicInfo)) return [];

        const accountTotals: AccountTotals[] = [];

        for (const {
          account: selectedFocalAccount,
          currency: selectedFocalAccountCurrency,
          transit,
        } of selectedFocalAccountsInfo) {
          // CREDITS - funds received into this account
          const creditTotalsByType = new Map<
            TransactionTypeKey,
            TransactionTypeTotals
          >();

          for (const {
            flowOfFundsTransactionDate,
            methodOfTxn,
            startingActions,
            completingActions,
            purposeOfTxn,
          } of transactionSelections.filter(
            createCreditsFilter(selectedFocalAccount),
          )) {
            // Extract conductors and account holders from starting actions
            for (const sa of startingActions) {
              const {
                amount: saAmount,
                currency: saCurrency,
                typeOfFunds: saTypeOfFunds,
                fiuNo,
                account,

                conductors = [],
                accountHolders = [],
              } = sa;

              console.assert(completingActions.length === 1);
              const { detailsOfDispo: caDetailsOfDispo } = completingActions[0];

              const txnTypeKey =
                getTxnType(saTypeOfFunds, caDetailsOfDispo, methodOfTxn) ??
                TRANSACTION_TYPE_ENUM.Unknown;

              const date = TransactionDateDirective.format(
                TransactionDateDirective.parse(flowOfFundsTransactionDate!),
              );

              // Initialize txn type entry if not exists
              const totalsEntry = creditTotalsByType.get(txnTypeKey) ?? {
                type:
                  TRANSACTION_TYPE_FRIENDLY_NAME[txnTypeKey] ??
                  'Unknown Txn Type',
                amountsMap: new Map<CurrKey, CurrAmount>(),
                count: 0,
                dates: [],
                subjects: [],
              };

              const currencyAmount =
                totalsEntry.amountsMap.get(saCurrency!) ?? 0 + (saAmount ?? 0);
              totalsEntry.amountsMap.set(saCurrency!, currencyAmount);
              totalsEntry.count += 1;
              totalsEntry.dates.push(date);
              totalsEntry.dates.sort();

              // Add conductor
              console.assert(conductors.length === 1);
              const { displayName, subType, subTypeLabel, subjectPhrase } =
                createSubjectMetadata({
                  txnTypeKey: txnTypeKey,
                  party: parties.find(
                    (p) => p.partyIdentifier === conductors[0].linkToSub,
                  )!,
                  focalSubjects,
                  fiu: fiuNo ?? '',
                  account: account ?? '',
                  purposeOfTxn: purposeOfTxn ?? '',
                });

              totalsEntry.subjects.push({
                displayName,
                subType,
                subTypeLabel,
                subjectRelation: 'conductor',
                subjectPhrase,
              } satisfies TransactionTypeSubject);

              if (TRANSACTION_TYPE_ENUM.Cheque === txnTypeKey) {
                // Add account holders
                for (const holder of accountHolders) {
                  const { displayName, subType, subTypeLabel, subjectPhrase } =
                    createSubjectMetadata({
                      txnTypeKey: txnTypeKey,
                      party: parties.find(
                        (p) => p.partyIdentifier === holder.linkToSub,
                      )!,
                      focalSubjects,
                      fiu: fiuNo ?? '',
                      account: account ?? '',
                      purposeOfTxn: purposeOfTxn ?? '',
                    });

                  totalsEntry.subjects.push({
                    displayName,
                    subType,
                    subTypeLabel,
                    subjectRelation: 'accountholder',
                    subjectPhrase,
                  } satisfies TransactionTypeSubject);
                }
              }

              creditTotalsByType.set(txnTypeKey, totalsEntry);
            }
          }
          // Add credits entry
          accountTotals.push({
            account: selectedFocalAccount,
            currency: selectedFocalAccountCurrency ?? '',
            transit,
            type: 'credits',
            totalsMap: creditTotalsByType,
          });

          // DEBITS - funds sent from this account
          const debitTotalsByType = new Map<
            TransactionTypeKey,
            TransactionTypeTotals
          >();

          for (const {
            flowOfFundsTransactionDate,
            dateOfTxn,
            methodOfTxn,
            startingActions,
            completingActions,
            purposeOfTxn,
          } of transactionSelections.filter(
            createtDebitsFilter(selectedFocalAccount),
          )) {
            console.assert(startingActions.length === 1);
            console.assert(completingActions.length === 1);
            const { typeOfFunds: saTypeOfFunds } = startingActions[0];
            const {
              detailsOfDispo: caDetailsOfDispo,
              amount: caAmount,
              currency: caCurrency,
              beneficiaries = [],
              accountHolders = [],
              fiuNo,
              account,
            } = completingActions[0];

            const txnTypeKey =
              getTxnType(saTypeOfFunds, caDetailsOfDispo, methodOfTxn) ??
              TRANSACTION_TYPE_ENUM.Unknown;

            const date = TransactionDateDirective.format(
              TransactionDateDirective.parse(
                flowOfFundsTransactionDate ?? (dateOfTxn || ''),
              ),
            );

            // Initialize method entry if not exists
            const totalsEntry = debitTotalsByType.get(txnTypeKey) ?? {
              type:
                TRANSACTION_TYPE_FRIENDLY_NAME[txnTypeKey] ?? 'Unknown Method',
              amountsMap: new Map<CurrKey, CurrAmount>(),
              count: 0,
              dates: [],
              subjects: [],
            };

            const currencyAmount =
              totalsEntry.amountsMap.get(caCurrency!) ?? 0 + (caAmount ?? 0);
            totalsEntry.amountsMap.set(caCurrency!, currencyAmount);
            totalsEntry.count += 1;
            totalsEntry.dates.push(date);
            totalsEntry.dates.sort();

            // Add beneficiaries
            for (const beneficiary of beneficiaries) {
              const { displayName, subType, subTypeLabel, subjectPhrase } =
                createSubjectMetadata({
                  txnTypeKey: txnTypeKey,
                  party: parties.find(
                    (p) => p.partyIdentifier === beneficiary.linkToSub,
                  )!,
                  focalSubjects,
                  fiu: fiuNo ?? '',
                  account: account ?? '',
                  purposeOfTxn: purposeOfTxn ?? '',
                });

              totalsEntry.subjects.push({
                displayName,
                subType,
                subTypeLabel,
                subjectRelation: 'beneficiary',
                subjectPhrase,
              } satisfies TransactionTypeSubject);
            }

            // Add account holders
            for (const holder of accountHolders) {
              const { displayName, subType, subTypeLabel, subjectPhrase } =
                createSubjectMetadata({
                  txnTypeKey: txnTypeKey,
                  party: parties.find(
                    (p) => p.partyIdentifier === holder.linkToSub,
                  )!,
                  focalSubjects,
                  fiu: fiuNo ?? '',
                  account: account ?? '',
                  purposeOfTxn: purposeOfTxn ?? '',
                });

              totalsEntry.subjects.push({
                displayName,
                subType,
                subTypeLabel,
                subjectRelation: 'accountholder',
                subjectPhrase,
              } satisfies TransactionTypeSubject);
            }

            debitTotalsByType.set(txnTypeKey, totalsEntry);
          }

          // Add debits entry
          accountTotals.push({
            account: selectedFocalAccount,
            currency: selectedFocalAccountCurrency ?? '',
            transit,
            type: 'debits',
            totalsMap: debitTotalsByType,
          });
        }

        return accountTotals;
      },
    ),
    takeUntilDestroyed(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  getAccountTransactionTotals$(): Observable<AccountTotals[]> {
    return this.accountTotals$;
  }
}

interface AccountTotals {
  account: string;
  transit: string;
  currency: string;
  type: 'credits' | 'debits';
  totalsMap: Map<TransactionTypeKey, TransactionTypeTotals>;
}

export type TransactionTypeKey =
  | (typeof TRANSACTION_TYPE_ENUM)[keyof typeof TRANSACTION_TYPE_ENUM]
  | (number & {});

interface TransactionTypeTotals {
  type: (typeof TRANSACTION_TYPE_FRIENDLY_NAME)[keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME];
  amountsMap: Map<CurrKey, CurrAmount>;
  count: number;
  dates: string[];
  subjects: TransactionTypeSubject[];
}

type CurrKey = string;
type CurrAmount = number;

interface TransactionTypeSubject {
  displayName: string;
  subType: SUBJECT_TYPE;
  subTypeLabel: string;
  subjectRelation: 'accountholder' | 'beneficiary' | 'conductor';
  subjectPhrase: string;
}

type SUBJECT_TYPE = keyof typeof NODE_ENUM;

function createSubjectMetadata({
  txnTypeKey: typeKey,
  party,
  fiu,
  account,
  purposeOfTxn,
  focalSubjects,
}: {
  txnTypeKey: keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME;
  party: PartyGenType;
  fiu?: string;
  account?: string;
  purposeOfTxn?: string;
  focalSubjects: Set<string>;
}): Omit<TransactionTypeSubject, 'subjectRelation'> {
  const { nodeCategory: category, displayName } =
    getSubjectDisplayNameAndCategory(party, focalSubjects);

  const subType = Object.keys(NODE_ENUM).find(
    (key) => NODE_ENUM[key as keyof typeof NODE_ENUM] === category,
  ) as SUBJECT_TYPE;

  const categoryLabel = NODE_CATEGORY_LABEL[category];

  if (TRANSACTION_TYPE_ENUM.EMT === typeKey) {
    const isEmail = EMAIL_RE.test(account ?? '');

    const bankPhrase = fiu ? `a customer of ${fiuMap[fiu]} bank` : '';

    const accountPhrase = account && !isEmail ? `with account #${account}` : '';

    const subjectPhrase = bankPhrase + accountPhrase ? ' ' + accountPhrase : '';

    return {
      displayName,
      subType,
      subTypeLabel: categoryLabel,
      subjectPhrase,
    };
  }

  if (TRANSACTION_TYPE_ENUM.Wires === typeKey) {
    const { street, city, country, postalCode } = party.address ?? {};

    const address = [street, city, country, postalCode]
      .filter(Boolean)
      .join(', ');

    const addressPhrase = `located in ${address}`;
    const memoPhrase = purposeOfTxn ? `with memo ${purposeOfTxn}` : '';

    const subjectPhrase = addressPhrase + memoPhrase ? ' ' + memoPhrase : '';

    return {
      displayName,
      subType,
      subTypeLabel: categoryLabel,
      subjectPhrase,
    };
  }

  // todo: add cheque

  const bankPhrase = fiu ? `a customer of ${fiuMap[fiu]} bank` : '';
  const accountPhrase = account ? `with account #${account}` : '';

  const subjectPhrase = bankPhrase + accountPhrase ? ' ' + accountPhrase : '';

  return {
    displayName,
    subType,
    subTypeLabel: categoryLabel,
    subjectPhrase,
  };
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
  1: 'Cash' as const,
  2: 'Cheque' as const,
  3: 'Online Banking' as const,
  4: 'Email Transfer (EMT)' as const,
  5: 'Wire Transfer' as const,
};

export function getTxnType(
  typeOfFunds: FORM_OPTIONS_TYPE_OF_FUNDS | (string & {}) | null,
  detailsOfDispo: FORM_OPTIONS_DETAILS_OF_DISPOSITION | (string & {}) | null,
  methodOfTxn: string | null,
) {
  let type;
  type = TRANSACTION_TYPE_ENUM.Unknown;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Cash' &&
    (detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
      'Deposit to account'
  )
    type = TRANSACTION_TYPE_ENUM.ABM;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Funds Withdrawal' &&
    (detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
      'Cash Withdrawal (account based)'
  )
    type = TRANSACTION_TYPE_ENUM.ABM;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Cheque' &&
    (detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
      'Deposit to account'
  )
    type = TRANSACTION_TYPE_ENUM.Cheque;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Cheque' &&
    (detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
      'Issued Cheque'
  )
    type = TRANSACTION_TYPE_ENUM.Cheque;

  if ((methodOfTxn as FORM_OPTIONS_METHOD_OF_TXN | null) === 'Online')
    type = TRANSACTION_TYPE_ENUM.OLB;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) ===
    'Email money transfer'
  )
    type = TRANSACTION_TYPE_ENUM.EMT;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Funds Withdrawal' &&
    (detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
      'Outgoing email money transfer'
  )
    type = TRANSACTION_TYPE_ENUM.EMT;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) ===
    'International Funds Transfer'
  )
    type = TRANSACTION_TYPE_ENUM.Wires;

  return type;
}

export const NODE_ENUM = {
  CibcPersonSubject: 0,
  CibcEntitySubject: 1,
  Account: 2,
  PersonSubject: 3,
  EntitySubject: 4,
  UnknownNode: 5,
  FocalPersonSubject: 6,
  FocalEntitySubject: 7,
  FocalAccount: 8,
} as const;

export const NODE_CATEGORY_LABEL: Record<number, string> = {
  7: 'an individual',
  8: 'a business/entity',
  3: 'an individual',
  4: 'a business/entity',
  0: 'an individual',
  1: 'a business/entity',
};

export function getSubjectDisplayNameAndCategory(
  party: PartyGenType | undefined,
  focalSubjects: Set<string>,
) {
  let nodeCategory = NODE_ENUM.UnknownNode as number;
  let displayName = 'Unknown Subject';
  let isFocal = false;

  if (!party) {
    return {
      nodeCategory,
      displayName,
      isFocal,
    };
  }

  const { partyKey } = party.identifiers ?? {};

  const { givenName, otherOrInitial, surname, nameOfEntity } =
    party.partyName ?? {};

  if (!partyKey && !givenName && !otherOrInitial && !surname && !nameOfEntity) {
    return {
      nodeCategory,
      displayName,
      isFocal,
    };
  }

  const isClient = !!partyKey;
  const isPerson = !!surname && !!givenName;
  const isEntity = !!nameOfEntity;
  isFocal = !!partyKey && focalSubjects.has(partyKey);

  displayName = getPartyFullName({
    givenName,
    otherOrInitial,
    surname,
    nameOfEntity,
  });

  if (isFocal && isPerson) {
    nodeCategory = NODE_ENUM.FocalPersonSubject;
  }

  if (isFocal && isEntity) {
    nodeCategory = NODE_ENUM.FocalEntitySubject;
  }

  if (!isFocal && isClient && isPerson) {
    nodeCategory = NODE_ENUM.CibcPersonSubject;
  }

  if (!isFocal && isClient && isEntity) {
    nodeCategory = NODE_ENUM.CibcEntitySubject;
  }

  if (!isFocal && !isClient && isPerson) {
    nodeCategory = NODE_ENUM.PersonSubject;
  }

  if (!isFocal && !isClient && isEntity) {
    nodeCategory = NODE_ENUM.EntitySubject;
  }

  return {
    nodeCategory,
    displayName,
    isFocal,
  };
}

export function generateUnknownNodeKey() {
  return `UNKNOWN-${crypto.randomUUID()}`;
}

export const hasManualTransaction = (
  sel: StrTransactionWithChangeLogs,
): boolean => sel.sourceId === 'Manual';

const createtDebitsFilter =
  (selectedAccount: string) =>
  (txn: StrTransactionWithChangeLogs): boolean =>
    !!txn.flowOfFundsDebitedAccount &&
    txn.flowOfFundsDebitedAccount === selectedAccount &&
    txn.wasTxnAttempted === false;

const createCreditsFilter =
  (selectedAccount: string) =>
  (txn: StrTransactionWithChangeLogs): boolean =>
    !!txn.flowOfFundsCreditedAccount &&
    txn.flowOfFundsCreditedAccount === selectedAccount &&
    txn.wasTxnAttempted === false;
