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
  take,
} from 'rxjs';
import {
  CaseRecordStore,
  StrTransactionWithChangeLogs,
} from '../aml/case-record.store';
import {
  hasMissingBasicInfo,
  isCibcFi,
} from '../reporting-ui/edit-form/common-validation';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../reporting-ui/edit-form/form-options.service';
import { TransactionDateDirective } from '../reporting-ui/edit-form/transaction-date.directive';
import { TransactionSearchService } from '../transaction-search/transaction-search.service';
import {
  EntityGenType,
  getEntityFullName,
} from '../transaction-view/transform-to-str-transaction/entity-gen.service';
import { DIRECTION_OF_SA } from './circular/circular.component';
import { fiuMap } from './fiu';

@Injectable()
export class AccountTransactionTotalsService {
  private errorHandler = inject(ErrorHandler);
  private caseRecord = inject(CaseRecordStore);
  private searchService = inject(TransactionSearchService);

  private transactionSelections$ =
    this.caseRecord.selectionsComputed$.pipe(takeUntilDestroyed());

  getAccountTransactionTotals$(): Observable<AccountTotals[]> {
    const accountNumbersSelection$ = this.caseRecord.state$.pipe(
      map(
        ({ searchParams: { accountNumbersSelection } }) =>
          accountNumbersSelection,
      ),
      take(1),
    );

    const selectedAccountsInfo$ = accountNumbersSelection$.pipe(
      switchMap((accountNumbersSelection) => {
        if (!accountNumbersSelection.length) return of([]);
        return forkJoin(
          accountNumbersSelection.map((item) =>
            this.searchService.getAccountInfo(item.account).pipe(take(1)),
          ),
        ).pipe(
          map((responses) =>
            responses.map(
              ({ account, accountCurrency: currency, branch: transit }) => ({
                account,
                currency,
                transit,
              }),
            ),
          ),
          catchError((error) => {
            this.errorHandler.handleError(error);
            return of([]);
          }),
        );
      }),
    );

    const partyKeysSelection$ = this.caseRecord.state$.pipe(
      map(({ searchParams: { partyKeysSelection } }) => partyKeysSelection),
      take(1),
    );

    const transactionSelections$ = this.caseRecord.selectionsComputed$.pipe(
      take(1),
    );

    const entities$ = this.caseRecord.state$.pipe(
      map(({ entities }) => entities),
      take(1),
    );

    return combineLatest([
      selectedAccountsInfo$,
      partyKeysSelection$,
      transactionSelections$,
      entities$,
    ]).pipe(
      map(
        ([
          selectedFocalAccountsInfo,
          partyKeysSelection,
          transactionSelections,
          entities,
        ]) => {
          console.log(
            '🚀 ~ AccountTransactionTotalsService ~ getAccountTransactionTotals$ ~ transactionSelections:',
            transactionSelections,
          );
          const focalSubjects = new Set(partyKeysSelection);

          if (transactionSelections.some(hasManualTransaction)) return [];
          if (transactionSelections.some(hasMissingBasicInfo)) return [];
          // note: data integrity check in dedicated tool

          const accountTotals: AccountTotals[] = [];

          for (const {
            account: selectedFocalAccount,
            currency: selectedFocalAccountCurrency,
            transit,
          } of selectedFocalAccountsInfo) {
            // CREDITS - funds received into this account
            const creditTotalsByType: Partial<
              Record<number, TransactionTypeTotals>
            > = {};

            for (const {
              flowOfFundsTransactionDate,
              dateOfTxn,
              startingActions,
              completingActions,
              purposeOfTxn = '',
            } of transactionSelections.filter(
              createCreditsFilter(selectedFocalAccount),
            )) {
              for (const sa of startingActions) {
                const {
                  directionOfSA: direction,
                  amount: saAmount,
                  currency: saCurrency,
                  typeOfFunds: saTypeOfFunds,
                  fiuNo = '',
                  account = '',
                  conductors = [],
                  accountHolders = [],
                } = sa;

                console.assert(completingActions.length === 1);
                const { detailsOfDispo, detailsOfDispoOther } =
                  completingActions[0];

                const txnTypeKey =
                  getTxnType({
                    typeOfFunds: saTypeOfFunds,
                    detailsOfDispo,
                    detailsOfDispoOther,
                  }) ?? TRANSACTION_TYPE_ENUM.Unknown;

                const date = TransactionDateDirective.format(
                  TransactionDateDirective.parse(
                    flowOfFundsTransactionDate ?? dateOfTxn!,
                  ),
                );

                creditTotalsByType[txnTypeKey] ??= {
                  transactionType:
                    TRANSACTION_TYPE_FRIENDLY_NAME[txnTypeKey] ??
                    'Unknown Txn Type',
                  amountsMap: {},
                  count: 0,
                  dates: [],
                  subjects: [],
                };

                creditTotalsByType[txnTypeKey].amountsMap[saCurrency!] ??= 0;
                creditTotalsByType[txnTypeKey].amountsMap[saCurrency!] +=
                  saAmount ?? 0;
                creditTotalsByType[txnTypeKey].count += 1;
                creditTotalsByType[txnTypeKey].dates.push(date);
                creditTotalsByType[txnTypeKey].dates.sort();

                if (txnTypeKey === TRANSACTION_TYPE_ENUM.Cheque) {
                  for (const holder of accountHolders) {
                    const {
                      displayName,
                      subType,
                      subTypeLabel,
                      subjectPhrase,
                    } = createSubjectMetadata({
                      txnTypeKey: txnTypeKey,
                      entity: entities.find(
                        (p) => p.entityIdentifier === holder.linkToSub,
                      )!,
                      focalSubjects,
                      fiuNo,
                      account,
                      purposeOfTxn,
                      direction,
                    });

                    creditTotalsByType[txnTypeKey].subjects.push({
                      displayName,
                      subType,
                      subTypeLabel,
                      subjectPhrase,
                    } satisfies TransactionTypeSubject);
                  }

                  continue;
                }

                if (txnTypeKey === TRANSACTION_TYPE_ENUM.ABM) {
                  // note: no subjects
                  console.assert(
                    creditTotalsByType[txnTypeKey].subjects.length === 0,
                  );
                  continue;
                }

                // Add conductor
                console.assert(conductors.length === 1);
                const { displayName, subType, subTypeLabel, subjectPhrase } =
                  createSubjectMetadata({
                    txnTypeKey: txnTypeKey,
                    entity: entities.find(
                      (p) => p.entityIdentifier === conductors[0].linkToSub,
                    )!,
                    focalSubjects,
                    fiuNo,
                    account,
                    purposeOfTxn,
                    direction,
                  });

                creditTotalsByType[txnTypeKey].subjects.push({
                  displayName,
                  subType,
                  subTypeLabel,
                  subjectPhrase,
                } satisfies TransactionTypeSubject);
              }
            }

            // Add credits entry
            accountTotals.push({
              account: selectedFocalAccount,
              currency: selectedFocalAccountCurrency ?? '',
              transit,
              totalsType: 'credits',
              totalsMap: creditTotalsByType,
            });

            // DEBITS - funds sent from this account
            const debitTotalsByType: Partial<
              Record<number, TransactionTypeTotals>
            > = {};

            for (const {
              flowOfFundsTransactionDate,
              dateOfTxn,
              startingActions,
              completingActions,
              purposeOfTxn,
            } of transactionSelections.filter(
              createDebitsFilter(selectedFocalAccount),
            )) {
              console.assert(startingActions.length === 1);
              console.assert(completingActions.length === 1);
              const { directionOfSA: direction, typeOfFunds: saTypeOfFunds } =
                startingActions[0];
              const {
                detailsOfDispo,
                detailsOfDispoOther,
                amount: caAmount,
                currency: caCurrency,
                beneficiaries = [],
                fiuNo,
                account,
              } = completingActions[0];

              const txnTypeKey =
                getTxnType({
                  typeOfFunds: saTypeOfFunds,
                  detailsOfDispo,
                  detailsOfDispoOther,
                }) ?? TRANSACTION_TYPE_ENUM.Unknown;

              const date = TransactionDateDirective.format(
                TransactionDateDirective.parse(
                  flowOfFundsTransactionDate ?? dateOfTxn!,
                ),
              );

              debitTotalsByType[txnTypeKey] ??= {
                transactionType:
                  TRANSACTION_TYPE_FRIENDLY_NAME[txnTypeKey] ??
                  'Unknown Method',
                amountsMap: {},
                count: 0,
                dates: [],
                subjects: [],
              };

              debitTotalsByType[txnTypeKey].amountsMap[caCurrency!] ??= 0;
              debitTotalsByType[txnTypeKey].amountsMap[caCurrency!] +=
                caAmount ?? 0;
              debitTotalsByType[txnTypeKey].count += 1;
              debitTotalsByType[txnTypeKey].dates.push(date);
              debitTotalsByType[txnTypeKey].dates.sort();

              if (txnTypeKey === TRANSACTION_TYPE_ENUM.ABM) {
                // note: no subjects
                console.assert(
                  debitTotalsByType[txnTypeKey].subjects.length === 0,
                );
                continue;
              }

              // Add beneficiaries
              for (const beneficiary of beneficiaries) {
                const { displayName, subType, subTypeLabel, subjectPhrase } =
                  createSubjectMetadata({
                    txnTypeKey: txnTypeKey,
                    entity: entities.find(
                      (p) => p.entityIdentifier === beneficiary.linkToSub,
                    )!,
                    focalSubjects,
                    fiuNo,
                    account,
                    purposeOfTxn,
                    direction,
                  });

                debitTotalsByType[txnTypeKey].subjects.push({
                  displayName,
                  subType,
                  subTypeLabel,
                  subjectPhrase,
                } satisfies TransactionTypeSubject);
              }
            }

            // Add debits entry
            accountTotals.push({
              account: selectedFocalAccount,
              currency: selectedFocalAccountCurrency ?? '',
              transit,
              totalsType: 'debits',
              totalsMap: debitTotalsByType,
            });
          }

          return accountTotals;
        },
      ),
    );
  }
}

interface AccountTotals {
  account: string;
  transit: string;
  currency: string;
  totalsType: 'credits' | 'debits';
  totalsMap: Partial<Record<number, TransactionTypeTotals>>;
}

export type TransactionTypeKey =
  | (typeof TRANSACTION_TYPE_ENUM)[keyof typeof TRANSACTION_TYPE_ENUM]
  | (number & {});

interface TransactionTypeTotals {
  transactionType: (typeof TRANSACTION_TYPE_FRIENDLY_NAME)[keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME];
  amountsMap: Record<CurrKey, CurrAmount>;
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
  subjectPhrase: string;
}

function createSubjectMetadata({
  txnTypeKey: typeKey,
  entity,
  fiuNo,
  account,
  purposeOfTxn,
  focalSubjects,
  direction,
}: {
  txnTypeKey: keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME;
  entity: EntityGenType;
  fiuNo?: string | null;
  account?: string | null;
  purposeOfTxn?: string | null;
  focalSubjects: Set<string>;
  direction: string | null;
}): Omit<TransactionTypeSubject, 'subjectRelation'> {
  const { nodeCategory, displayName } = getSubjectDisplayNameAndCategory(
    entity,
    focalSubjects,
  );

  const subType = Object.keys(NODE_ENUM).find(
    (key) => NODE_ENUM[key as keyof typeof NODE_ENUM] === nodeCategory,
  ) as SUBJECT_TYPE;

  const categoryLabel = NODE_CATEGORY_LABEL[nodeCategory];

  if (
    (direction as DIRECTION_OF_SA) === 'Out' &&
    TRANSACTION_TYPE_ENUM.EMT === typeKey
  ) {
    const bankPhrase = fiuNo ? `a customer of ${fiuMap[fiuNo]} bank` : '';

    let subjectPhrase = '';

    if (isCibcFi(fiuNo)) {
      const accountPhrase = account ? `with account #${account}` : '';

      subjectPhrase = bankPhrase + (accountPhrase ? ' ' + accountPhrase : '');
    }

    if (!isCibcFi(fiuNo)) {
      const { contactName } = entity ?? {};

      const contactPhrase = contactName
        ? `with contact name ${contactName}`
        : '';

      subjectPhrase = bankPhrase + (contactPhrase ? ' ' + contactPhrase : '');
    }

    return {
      displayName,
      subType,
      subTypeLabel: categoryLabel,
      subjectPhrase,
    };
  }

  if (
    (direction as DIRECTION_OF_SA) === 'In' &&
    TRANSACTION_TYPE_ENUM.EMT === typeKey
  ) {
    const bankPhrase = fiuNo ? `a customer of ${fiuMap[fiuNo]} bank` : '';

    let subjectPhrase = '';

    if (isCibcFi(fiuNo)) {
      const accountPhrase = account ? `with account #${account}` : '';

      subjectPhrase = bankPhrase + (accountPhrase ? ' ' + accountPhrase : '');
    }

    if (!isCibcFi(fiuNo)) {
      subjectPhrase = bankPhrase;
    }

    return {
      displayName,
      subType,
      subTypeLabel: categoryLabel,
      subjectPhrase,
    };
  }

  if (typeKey === TRANSACTION_TYPE_ENUM.POS) {
    // display name is merchant name
    return {
      displayName,
      subType,
      subTypeLabel: categoryLabel,
      subjectPhrase: '',
    };
  }

  if (TRANSACTION_TYPE_ENUM.Wires === typeKey) {
    const { street, city, country, postalCode } = entity ?? {};

    const address = [street, city, country, postalCode]
      .filter(Boolean)
      .join(', ');

    const addressPhrase = `located in ${address}`;
    const memoPhrase = purposeOfTxn ? `with memo ${purposeOfTxn}` : '';

    const subjectPhrase = addressPhrase + (memoPhrase ? ' ' + memoPhrase : '');

    return {
      displayName,
      subType,
      subTypeLabel: categoryLabel,
      subjectPhrase,
    };
  }

  if (TRANSACTION_TYPE_ENUM.Cheque === typeKey) {
    const bankPhrase = fiuNo ? `a customer of ${fiuMap[fiuNo]} bank` : '';
    const accountPhrase = account ? `with account #${account}` : '';

    const subjectPhrase =
      bankPhrase + (accountPhrase ? ' ' + accountPhrase : '');

    return {
      displayName,
      subType,
      subTypeLabel: categoryLabel,
      subjectPhrase,
    };
  }

  const bankPhrase = fiuNo ? `a customer of ${fiuMap[fiuNo]} bank` : '';
  const accountPhrase = account ? `with account #${account}` : '';

  const subjectPhrase = bankPhrase + (accountPhrase ? ' ' + accountPhrase : '');

  return {
    displayName,
    subType,
    subTypeLabel: categoryLabel,
    subjectPhrase,
  };
}

export const TRANSACTION_TYPE_ENUM = {
  Unknown: 0,
  ABM: 1,
  Cheque: 2,
  OLB: 3,
  EMT: 4,
  Wires: 5,
  POS: 6,
  Mixed: 7,
} as const;

export const TRANSACTION_TYPE_FRIENDLY_NAME = {
  0: 'Unknown' as const,
  1: 'Cash' as const,
  2: 'Cheque' as const,
  3: 'Online Banking' as const,
  4: 'Email Transfer (EMT)' as const,
  5: 'Wire Transfer' as const,
  6: 'Retail Purchase' as const,
  7: 'Mixed Deposit' as const,
};

export function getTxnType({
  typeOfFunds,
  detailsOfDispo,
  detailsOfDispoOther,
  startingActionsLength = 1,
}: {
  typeOfFunds: FORM_OPTIONS_TYPE_OF_FUNDS | (string & {}) | null;
  detailsOfDispo: FORM_OPTIONS_DETAILS_OF_DISPOSITION | (string & {}) | null;
  detailsOfDispoOther: string | null;
  startingActionsLength?: number;
}) {
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
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Funds Withdrawal' &&
    (detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
      'Issued Cheque'
  )
    type = TRANSACTION_TYPE_ENUM.Cheque;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Funds Withdrawal' &&
    ((detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
      'Purchase of / Payment for goods' ||
      (detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION | null) ===
        'Purchase of / Payment for services')
  )
    type = TRANSACTION_TYPE_ENUM.POS;

  if (
    (typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS | null) === 'Funds Withdrawal' &&
    detailsOfDispoOther === 'Purchase of / Payment for goods (Quasi Cash)'
  )
    type = TRANSACTION_TYPE_ENUM.POS;

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

  if (startingActionsLength > 1) type = TRANSACTION_TYPE_ENUM.Mixed;

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
  Merchant: 9,
} as const;

export const NODE_CATEGORY_LABEL: Record<number, string> = {
  7: 'an individual',
  8: 'a business/entity',
  3: 'an individual',
  4: 'a business/entity',
  0: 'an individual',
  1: 'a business/entity',
  9: '',
};

type SUBJECT_TYPE = keyof typeof NODE_ENUM;

export function getSubjectDisplayNameAndCategory(
  entity: EntityGenType | undefined,
  focalSubjects: Set<string>,
) {
  let nodeCategory = NODE_ENUM.UnknownNode as number;
  let displayName = 'Unknown Subject';
  let isFocal = false;

  if (!entity) {
    return {
      nodeCategory,
      displayName,
      isFocal,
    };
  }

  const { givenName, otherOrInitialName, surname, nameOfEntity, partyKey } =
    entity ?? {};

  if (
    !partyKey &&
    !givenName &&
    !otherOrInitialName &&
    !surname &&
    !nameOfEntity
  ) {
    return {
      nodeCategory,
      displayName,
      isFocal,
    };
  }

  const isClient = !!partyKey;
  const isPerson = !!givenName;
  const isEntity = !!nameOfEntity;
  isFocal = !!partyKey && focalSubjects.has(partyKey);

  displayName = getEntityFullName({
    givenName,
    otherOrInitialName,
    surname,
    nameOfEntity,
  });

  if (isFocal && isPerson) nodeCategory = NODE_ENUM.FocalPersonSubject;

  if (isFocal && isEntity) nodeCategory = NODE_ENUM.FocalEntitySubject;

  if (!isFocal && isClient && isPerson)
    nodeCategory = NODE_ENUM.CibcPersonSubject;

  if (!isFocal && isClient && isEntity)
    nodeCategory = NODE_ENUM.CibcEntitySubject;

  if (!isFocal && !isClient && isPerson) nodeCategory = NODE_ENUM.PersonSubject;

  if (!isFocal && !isClient && isEntity) nodeCategory = NODE_ENUM.EntitySubject;

  const isMerchant = !!entity.merchantPhone;

  if (isMerchant) nodeCategory = NODE_ENUM.Merchant;

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

const createDebitsFilter =
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
