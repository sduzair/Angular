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
  POSSourceData,
  SEARCH_SOURCE_ID,
} from '../../transaction-search/transaction-search.service';
import { PartyAddress, PartyGenType, PartyName } from './party-gen.service';

/**
 * Transform POS transaction into StrTransactionWithChangeLogs format
 */
export function transformPOSToStrTransaction({
  posTxn,
  fofTxn,
  generateParty,
  getAccountInfo,
  caseRecordId,
}: {
  posTxn: POSSourceData;
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
  // Collect all party keys and account info we need to fetch
  const partyKeysToFetch = new Set<string>();
  const accountsToFetch = new Set<string>();

  // Add customer (cardholder) account holders - strSa prefix fields
  posTxn.strCaAccountHolderCifId
    ?.split(/[;:]/)
    .forEach((h) => partyKeysToFetch.add(h.trim()));

  // Add customer account fetch (strSa account)
  if (posTxn.strSaAccount) {
    accountsToFetch.add(String(posTxn.strSaAccount));
  }

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
      // Add account holders from account info
      for (const acckey of Object.keys(accountsInfo)) {
        accountsInfo[acckey]?.accountHolders.forEach((item) =>
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

      // Generate merchant party
      partyInfoObservables[
        `merchant_${posTxn.merchantName}_${posTxn.merchantCity}`
      ] = generateParty({
        identifiers: {},
        partyName: {
          ...parseMerchantName(posTxn),
        },
        address: {
          ...parseMerchantAddress(posTxn),
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
      // Build starting actions - Customer making payment (funds OUT)
      const startingActions: StartingAction[] = [];

      // Get customer account holders for starting action
      const saAccountHolders =
        posTxn.strSaAccountHoldersCifId
          ?.toString()
          .split(/[;:]/)
          .reduce((acc, key) => {
            const trimmedKey = key.trim();
            if (partiesInfo[trimmedKey]) {
              acc.push({
                linkToSub: partiesInfo[trimmedKey]?.partyIdentifier!,
                _hiddenPartyKey:
                  partiesInfo[trimmedKey]?.identifiers?.partyKey!,
                _hiddenGivenName:
                  partiesInfo[trimmedKey]?.partyName?.givenName ?? null,
                _hiddenSurname:
                  partiesInfo[trimmedKey]?.partyName?.surname ?? null,
                _hiddenOtherOrInitial:
                  partiesInfo[trimmedKey]?.partyName?.otherOrInitial ?? null,
                _hiddenNameOfEntity:
                  partiesInfo[trimmedKey]?.partyName?.nameOfEntity ?? null,
              });
            }
            return acc;
          }, [] as AccountHolder[]) ?? [];

      startingActions.push({
        directionOfSA: posTxn.strSaDirection || 'Out',
        typeOfFunds:
          posTxn.strSaFundsType ||
          ('Funds Withdrawal' satisfies FORM_OPTIONS_TYPE_OF_FUNDS),
        typeOfFundsOther: posTxn.strSaFundsTypeOther,
        howFundsObtained: null,
        amount: posTxn.strSaAmount,
        currency: posTxn.strSaCurrency,
        fiuNo: posTxn.strSaFiNumber,
        branch: posTxn.strSaBranch ? String(posTxn.strSaBranch) : null,
        account: posTxn.strSaAccount ? String(posTxn.strSaAccount) : null,
        accountType: accountsInfo[posTxn.strSaAccount]?.accountType || null,
        accountTypeOther: null,
        accountOpen: accountsInfo[posTxn.strSaAccount]?.accountOpen || null,
        accountClose: accountsInfo[posTxn.strSaAccount]?.accountClose || null,
        accountStatus: accountsInfo[posTxn.strSaAccount]?.accountStatus || null,
        accountCurrency:
          accountsInfo[posTxn.strSaAccount]?.accountCurrency || null,
        hasAccountHolders: saAccountHolders.length > 0,
        accountHolders: saAccountHolders,
        wasSofInfoObtained: posTxn.strSaFundingSourceInd === 'Yes',
        sourceOfFunds: [],
        wasCondInfoObtained: posTxn.strSaConductorInd === 'Yes',
        conductors: saAccountHolders.map((holder) => ({
          linkToSub: holder.linkToSub,
          _hiddenPartyKey: holder._hiddenPartyKey,
          _hiddenGivenName: holder._hiddenGivenName,
          _hiddenSurname: holder._hiddenSurname,
          _hiddenOtherOrInitial: holder._hiddenOtherOrInitial,
          _hiddenNameOfEntity: holder._hiddenNameOfEntity,
          wasConductedOnBehalf: posTxn.strSaOboInd === 'Yes',
          onBehalfOf: [],
        })),
      });

      // Build completing actions - Merchant receiving payment
      const completingActions: CompletingAction[] = [];

      const merchantParty =
        partiesInfo[`merchant_${posTxn.merchantName}_${posTxn.merchantCity}`];

      const merchantBeneficiary = merchantParty
        ? [
            {
              linkToSub: merchantParty.partyIdentifier!,
              _hiddenPartyKey: null,
              _hiddenGivenName: merchantParty.partyName?.givenName ?? null,
              _hiddenSurname: merchantParty.partyName?.surname ?? null,
              _hiddenOtherOrInitial:
                merchantParty.partyName?.otherOrInitial ?? null,
              _hiddenNameOfEntity:
                merchantParty.partyName?.nameOfEntity ?? null,
            },
          ]
        : [];

      completingActions.push({
        // fix: no pop
        detailsOfDispo:
          ((posTxn.strCaDispositionType === 'Other'
            ? 'Other'
            : posTxn.strCaDispositionType) as FORM_OPTIONS_DETAILS_OF_DISPOSITION) ||
          'Other',
        detailsOfDispoOther: posTxn.strCaDispositionTypeOther,
        amount: posTxn.strCaAmount,
        currency: posTxn.strCaCurrency,
        exchangeRate: null,
        valueInCad: posTxn.strCadEquivalentAmount,
        fiuNo: posTxn.strCaFiNumber,
        branch: posTxn.strCaBranch ? String(posTxn.strCaBranch) : null,
        account: posTxn.strCaAccount ? String(posTxn.strCaAccount) : null,
        accountType: 'Business' satisfies FORM_OPTIONS_ACCOUNT_TYPE,
        accountTypeOther: null,
        accountCurrency: posTxn.strCaAccountCurrency,
        accountOpen: null,
        accountClose: null,
        accountStatus: posTxn.strCaAccountStatus,
        hasAccountHolders: false,
        accountHolders: [],
        wasAnyOtherSubInvolved: posTxn.strCaInvolvedInInd === 'Yes',
        involvedIn: [],
        wasBenInfoObtained: posTxn.strCaBeneficiaryInd === 'Yes',
        beneficiaries: merchantBeneficiary,
      });

      const { flowOfFundsTransactionDesc } = fofTxn;

      // Build the transformed transaction
      const transformed: StrTransactionWithChangeLogs = {
        // Base StrTransaction fields
        sourceId: 'POS' satisfies SEARCH_SOURCE_ID,
        wasTxnAttempted: false,
        wasTxnAttemptedReason: null,
        dateOfTxn: posTxn.transactionDate,
        timeOfTxn: posTxn.transactionTime,
        hasPostingDate: !!posTxn.postingDate,
        dateOfPosting: posTxn.postingDate,
        timeOfPosting: null,
        methodOfTxn: determineMethodOfTxn(posTxn),
        methodOfTxnOther: null,
        reportingEntityTxnRefNo: posTxn.flowOfFundsAmlTransactionId,
        purposeOfTxn: posTxn.strSaPurposeOfTransaction,
        reportingEntityLocationNo: posTxn.strReportingEntity.toString(),
        startingActions,
        completingActions,
        highlightColor: null,

        // StrTxnFlowOfFunds fields
        flowOfFundsAccountCurrency: posTxn.flowOfFundsAccountCurrency,
        flowOfFundsAmlId: posTxn.flowOfFundsAmlId,
        flowOfFundsAmlTransactionId: posTxn.flowOfFundsAmlTransactionId,
        flowOfFundsCasePartyKey: posTxn.flowOfFundsCaseEcif || null,
        flowOfFundsConductorPartyKey: posTxn.flowOfFundsConductorEcif || null,
        flowOfFundsCreditAmount: posTxn.flowOfFundsCreditAmount,
        flowOfFundsCreditedAccount: posTxn.flowOfFundsCreditedAccount
          ? String(posTxn.flowOfFundsCreditedAccount)
          : null,
        flowOfFundsCreditedTransit: posTxn.flowOfFundsCreditedTransit
          ? String(posTxn.flowOfFundsCreditedTransit)
          : null,
        flowOfFundsDebitAmount: posTxn.flowOfFundsDebitAmount,
        flowOfFundsDebitedAccount: posTxn.flowOfFundsDebitedAccount
          ? String(posTxn.flowOfFundsDebitedAccount)
          : null,
        flowOfFundsDebitedTransit: posTxn.flowOfFundsDebitedTransit
          ? String(posTxn.flowOfFundsDebitedTransit)
          : null,
        flowOfFundsPostingDate: posTxn.flowOfFundsPostingDate,
        flowOfFundsSource: posTxn.flowOfFundsSource,
        flowOfFundsSourceTransactionId: posTxn.flowOfFundsSourceId,
        flowOfFundsTransactionCurrency: posTxn.flowOfFundsTransactionCurrency,
        flowOfFundsTransactionCurrencyAmount:
          posTxn.flowOfFundsTransactionCurrencyAmount,
        flowOfFundsTransactionDate: posTxn.flowOfFundsTransactionDate,
        flowOfFundsTransactionDesc,
        flowOfFundsTransactionTime: posTxn.flowOfFundsTransactionTime,

        // StrTransactionWithChangeLogs fields
        eTag: 0,
        caseRecordId,
        changeLogs: [],
        _hiddenValidation: [],
      };

      return {
        selection: transformed,
        parties: Object.values(partiesInfo).filter(
          (p) => p !== null,
        ) as PartyGenType[],
      };
    }),
  );
}

const parseMerchantName = (posTxn: POSSourceData): PartyName => {
  const merchantName =
    posTxn.merchantName || posTxn.terminalOwnerName || 'Unknown Merchant';

  // Merchants are typically businesses
  return {
    surname: null,
    givenName: null,
    otherOrInitial: null,
    nameOfEntity: merchantName.trim(),
  };
};

// Helper to parse merchant address
function parseMerchantAddress(posTxn: POSSourceData): PartyAddress {
  return {
    street: posTxn.merchantStreetAddress || null,
    city: posTxn.merchantCity || null,
    provinceCode: posTxn.merchantProvince
      ? String(posTxn.merchantProvince)
      : null,
    country: posTxn.merchantCountry || null,
    postalCode: posTxn.merchantPostalCode || null,
  };
}

// Helper to determine method of transaction
function determineMethodOfTxn(
  posTxn: POSSourceData,
): FORM_OPTIONS_METHOD_OF_TXN {
  const memoLine = posTxn.transactionMemoLine3?.toLowerCase() || '';

  if (memoLine.includes('mobile') || memoLine.includes('app')) {
    return 'Online' satisfies FORM_OPTIONS_METHOD_OF_TXN;
  }

  if (posTxn.cardNumber) {
    return 'In-Person' satisfies FORM_OPTIONS_METHOD_OF_TXN;
  }

  return 'In-Person' satisfies FORM_OPTIONS_METHOD_OF_TXN;
}
