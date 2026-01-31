import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import {
  FORM_OPTIONS_ACCOUNT_TYPE,
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_METHOD_OF_TXN,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../../reporting-ui/edit-form/form-options.service';
import {
  AccountHolder,
  CompletingAction,
  StartingAction,
} from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  FlowOfFundsSourceData,
  GetAccountInfoRes,
  SEARCH_SOURCE_ID,
  WireSourceData,
} from '../../transaction-search/transaction-search.service';
import { PartyGenType, PartyName } from './party-gen.service';

/**
 * Transform incoming wire transfer into StrTransactionWithChangeLogs format
 */
export function transformWireToStrTransaction({
  wireTxn,
  fofTxn,
  generateParty,
  getAccountInfo,
  caseRecordId,
}: {
  wireTxn: WireSourceData;
  fofTxn: FlowOfFundsSourceData;
  generateParty: (
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ) => Observable<PartyGenType | null>;
  getAccountInfo: (account: string) => Observable<GetAccountInfoRes>;
  caseRecordId: string;
}): Observable<{
  selection: StrTransactionWithChangeLogs;
  parties: PartyGenType[];
}> {
  if (wireTxn.wireRole !== 'RECEIVER') {
    throw new Error(
      'This function only handles incoming wire transfers (RECEIVER role)',
    );
  }

  // Collect all party keys and account info we need to fetch
  const partyKeysToFetch = new Set<string>();
  const accountsToFetch = new Set<string>();

  // Add receiver (beneficiary) account holders - CIBC account
  wireTxn.customer1AccountHolderCifId
    ?.split(/[;:]/)
    .forEach((h) => partyKeysToFetch.add(h.trim()));

  // Add receiver account fetch (CIBC account)
  accountsToFetch.add(String(wireTxn.strCaAccount ?? ''));

  // Fetch all account info in parallel
  const accountInfoObservables: Record<
    string,
    Observable<GetAccountInfoRes | null>
  > = {};

  Array.from(accountsToFetch).forEach((account) => {
    accountInfoObservables[account] = getAccountInfo(account);
  });

  // Combine all observables
  return forkJoin({
    accountsInfo:
      accountsToFetch.size > 0
        ? forkJoin(accountInfoObservables)
        : of({} as Record<string, GetAccountInfoRes | null>),
  }).pipe(
    switchMap(({ accountsInfo }) => {
      for (const acckey of Object.keys(accountsInfo)) {
        accountsInfo[acckey]!.accountHolders.forEach((item) =>
          partyKeysToFetch.add(item.partyKey),
        );
      }
      // Fetch all party info in parallel
      const partyInfoObservables: Record<
        string,
        Observable<PartyGenType | null>
      > = {};
      Array.from(partyKeysToFetch).forEach((partyKey) => {
        partyInfoObservables[partyKey] = generateParty({
          identifiers: { partyKey },
        });
      });

      partyInfoObservables[wireTxn.msgTag50] = generateParty({
        identifiers: { msgTag50: wireTxn.msgTag50 },
        partyName: {
          ...parseOCPartyName(wireTxn),
        },
      });

      return forkJoin({
        partiesInfo:
          Object.keys(partyInfoObservables).length > 0
            ? forkJoin(partyInfoObservables)
            : of({} as Record<string, PartyGenType | null>),
      }).pipe(map(({ partiesInfo }) => ({ partiesInfo, accountsInfo })));
    }),
    map(({ partiesInfo, accountsInfo }) => {
      // Build starting actions - INCOMING WIRE
      const startingActions: StartingAction[] = [];

      startingActions.push({
        directionOfSA: 'In',
        typeOfFunds:
          'International Funds Transfer' satisfies FORM_OPTIONS_TYPE_OF_FUNDS,
        typeOfFundsOther: null,
        amount: wireTxn.strSaAmount,
        currency: wireTxn.strSaCurrency,
        fiuNo: wireTxn.strSaFiNumber, // Foreign institution identifier
        branch: null,
        account: wireTxn.strSaAccount,
        accountType: (isBusiness(wireTxn.ocName)
          ? 'Business'
          : 'Personal') satisfies FORM_OPTIONS_ACCOUNT_TYPE,
        accountTypeOther: null,
        accountOpen: null,
        accountClose: null,
        accountStatus: null,
        howFundsObtained: null,
        accountCurrency: null,
        hasAccountHolders: false,
        accountHolders: [],
        wasSofInfoObtained: false,
        sourceOfFunds: [],
        wasCondInfoObtained: true,
        conductors: [
          {
            linkToSub: partiesInfo[wireTxn.msgTag50]?.partyIdentifier!,
            _hiddenPartyKey: null,
            _hiddenGivenName:
              partiesInfo[wireTxn.msgTag50]?.partyName?.givenName ?? null,
            _hiddenSurname:
              partiesInfo[wireTxn.msgTag50]?.partyName?.surname ?? null,
            _hiddenOtherOrInitial:
              partiesInfo[wireTxn.msgTag50]?.partyName?.otherOrInitial ?? null,
            _hiddenNameOfEntity:
              partiesInfo[wireTxn.msgTag50]?.partyName?.nameOfEntity ?? null,
            wasConductedOnBehalf: false,
            onBehalfOf: [],
          },
        ],
      });

      // Build completing actions - INCOMING WIRE
      const completingActions: CompletingAction[] = [];

      const caAccountHolders =
        wireTxn.customer1AccountHolderCifId
          ?.split(/[;:]/)
          .reduce((acc, key) => {
            acc.push({
              linkToSub: partiesInfo[key]?.partyIdentifier!,
              _hiddenPartyKey: partiesInfo[key]?.identifiers?.partyKey!,
              _hiddenGivenName: partiesInfo[key]?.partyName?.givenName ?? null,
              _hiddenSurname: partiesInfo[key]?.partyName?.surname ?? null,
              _hiddenOtherOrInitial:
                partiesInfo[key]?.partyName?.otherOrInitial ?? null,
              _hiddenNameOfEntity:
                partiesInfo[key]?.partyName?.nameOfEntity ?? null,
            });
            return acc;
          }, [] as AccountHolder[]) ?? [];

      completingActions.push({
        detailsOfDispo:
          'Deposit to account' satisfies FORM_OPTIONS_DETAILS_OF_DISPOSITION,
        detailsOfDispoOther: null,
        amount: wireTxn.strCaAmount,
        currency: wireTxn.strCaCurrency,
        exchangeRate: null,
        valueInCad: null,
        fiuNo: wireTxn.strCaFiNumber,
        branch: String(wireTxn.strCaBranch ?? ''),
        account: String(wireTxn.strCaAccount ?? ''),
        accountType: accountsInfo[wireTxn.strCaAccount]?.accountType || null,
        accountTypeOther: null,
        accountCurrency:
          accountsInfo[wireTxn.strCaAccount]?.accountCurrency ?? '',
        accountOpen: accountsInfo[wireTxn.strCaAccount]?.accountOpen || null,
        accountClose: accountsInfo[wireTxn.strCaAccount]?.accountClose || null,
        accountStatus: accountsInfo[wireTxn.strCaAccount]?.accountStatus ?? '',
        hasAccountHolders: true,
        accountHolders: caAccountHolders,
        wasAnyOtherSubInvolved: false,
        involvedIn: [],
        wasBenInfoObtained: true,
        beneficiaries: caAccountHolders,
      });

      const { flowOfFundsTransactionDesc } = fofTxn;

      // Build the transformed transaction
      const transformed: StrTransactionWithChangeLogs = {
        // Base StrTransaction fields
        sourceId: 'Wire' satisfies SEARCH_SOURCE_ID,
        wasTxnAttempted: false,
        wasTxnAttemptedReason: null,
        dateOfTxn: wireTxn.flowOfFundsTransactionDate,
        timeOfTxn: wireTxn.flowOfFundsTransactionTime,
        hasPostingDate: !!wireTxn.flowOfFundsPostingDate,
        dateOfPosting: wireTxn.flowOfFundsPostingDate,
        timeOfPosting: null,
        methodOfTxn: 'In-Person' satisfies FORM_OPTIONS_METHOD_OF_TXN,
        methodOfTxnOther: null,
        reportingEntityTxnRefNo: wireTxn.flowOfFundsAmlTransactionId,
        purposeOfTxn: wireTxn.strSaPurposeOfTransaction,
        reportingEntityLocationNo: wireTxn.strReportingEntity,
        startingActions,
        completingActions,
        highlightColor: null,

        // StrTxnFlowOfFunds fields
        flowOfFundsAccountCurrency: wireTxn.flowOfFundsAccountCurrency,
        flowOfFundsAmlId: wireTxn.flowOfFundsAmlId,
        flowOfFundsAmlTransactionId: wireTxn.flowOfFundsAmlTransactionId,
        flowOfFundsCasePartyKey: wireTxn.flowOfFundsCasePartyKey,
        flowOfFundsConductorPartyKey: wireTxn.flowOfFundsConductorPartyKey,
        flowOfFundsCreditAmount: wireTxn.flowOfFundsCreditAmount,
        flowOfFundsCreditedAccount: wireTxn.flowOfFundsCreditedAccount
          ? String(wireTxn.flowOfFundsCreditedAccount)
          : null,
        flowOfFundsCreditedTransit: wireTxn.flowOfFundsCreditedTransit
          ? String(wireTxn.flowOfFundsCreditedTransit)
          : null,
        flowOfFundsDebitAmount: wireTxn.flowOfFundsDebitAmount,
        flowOfFundsDebitedAccount: wireTxn.flowOfFundsDebitedAccount
          ? String(wireTxn.flowOfFundsDebitedAccount)
          : null,
        flowOfFundsDebitedTransit: wireTxn.flowOfFundsDebitedTransit
          ? String(wireTxn.flowOfFundsDebitedTransit)
          : null,
        flowOfFundsPostingDate: wireTxn.flowOfFundsPostingDate,
        flowOfFundsSource: wireTxn.flowOfFundsSource,
        flowOfFundsSourceTransactionId: wireTxn.flowOfFundsSourceTransactionId,
        flowOfFundsTransactionCurrency: wireTxn.flowOfFundsTransactionCurrency,
        flowOfFundsTransactionCurrencyAmount:
          wireTxn.flowOfFundsTransactionCurrencyAmount,
        flowOfFundsTransactionDate: wireTxn.flowOfFundsTransactionDate,
        flowOfFundsTransactionDesc,
        flowOfFundsTransactionTime: wireTxn.flowOfFundsTransactionTime,

        // StrTransactionWithChangeLogs fields
        eTag: 0,
        caseRecordId,
        changeLogs: [],
        _hiddenValidation: [],
      };

      return {
        selection: transformed,
        parties: Object.values(partiesInfo) as PartyGenType[],
      };
    }),
  );
}

// Helper to parse name from wire data
const parseOCPartyName = (wireTxn: WireSourceData): PartyName => {
  const { ocName } = wireTxn;

  // Check if it looks like an entity name (contains words like Inc, Ltd, LLC, etc.)
  if (isBusiness(ocName)) {
    return {
      surname: null,
      givenName: null,
      otherOrInitial: null,
      nameOfEntity: ocName.trim(),
    };
  }

  // Try to parse as person name (format: "FirstName MiddleInitial LastName")
  const nameParts = ocName.trim().split(/\s+/);

  if (nameParts.length === 3) {
    return {
      givenName: nameParts[0],
      otherOrInitial: nameParts[1],
      surname: nameParts[2],
      nameOfEntity: null,
    };
  }
  if (nameParts.length === 2) {
    return {
      givenName: nameParts[0],
      otherOrInitial: null,
      surname: nameParts[1],
      nameOfEntity: null,
    };
  }
  if (nameParts.length === 1) {
    return {
      surname: nameParts[0],
      givenName: null,
      otherOrInitial: null,
      nameOfEntity: null,
    };
  }

  // If we can't parse it, treat as entity
  return {
    surname: null,
    givenName: null,
    otherOrInitial: null,
    nameOfEntity: ocName.trim(),
  };
};

function isBusiness(ocName: string) {
  const entityPatterns =
    /\b(Inc|Ltd|LLC|Corp|Corporation|Limited|Company|Bank|Trust|Credit Union|Plc)\b/i;
  return entityPatterns.test(ocName);
}
