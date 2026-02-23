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
  Conductor,
  StartingAction,
} from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  FlowOfFundsSourceData,
  GetAccountInfoRes,
  POSSourceData,
  SEARCH_SOURCE_ID,
} from '../../transaction-search/transaction-search.service';
import { EntityGenType } from './entity-gen.service';

/**
 * Transform POS transaction into StrTransactionWithChangeLogs format
 */
export function transformPOSToStrTransaction({
  posTxn,
  fofTxn,
  generateEntity,
  getAccountInfo,
  caseRecordId,
}: {
  posTxn: POSSourceData;
  fofTxn: FlowOfFundsSourceData;
  generateEntity: (
    entity: Omit<EntityGenType, 'entityIdentifier'>,
  ) => Observable<EntityGenType | null>;
  getAccountInfo: (account: string) => Observable<GetAccountInfoRes>;
  caseRecordId: string;
}): Observable<{
  selection: StrTransactionWithChangeLogs;
  entities: EntityGenType[];
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

      // Fetch all entity info in parallel
      const entityInfoObservables: Record<
        string,
        Observable<EntityGenType | null>
      > = {};

      Array.from(partyKeysToFetch).forEach((partyKey) => {
        entityInfoObservables[partyKey] = generateEntity({
          partyKey,
        });
      });

      // Generate merchant entity
      entityInfoObservables[
        `merchant_${posTxn.merchantName}_${posTxn.merchantCity}`
      ] = generateEntity({
        merchantPhone: posTxn.merchantCity,
        ...parseMerchantName(posTxn),
        ...parseMerchantAddress(posTxn),
        sourceSystem: 'POS',
      });

      return forkJoin({
        entitiesInfo:
          Object.keys(entityInfoObservables).length > 0
            ? forkJoin(entityInfoObservables)
            : of({} as Record<string, EntityGenType | null>),
      }).pipe(map(({ entitiesInfo }) => ({ entitiesInfo, accountsInfo })));
    }),
    map(({ entitiesInfo, accountsInfo }) => {
      // Build starting actions - Customer making payment (funds OUT)
      const startingActions: StartingAction[] = [];

      // Get customer account holders for starting action
      const saAccountHolders =
        posTxn.strSaAccountHoldersCifId
          ?.toString()
          .split(/[;:]/)
          .reduce((acc, key) => {
            const trimmedKey = key.trim();
            if (entitiesInfo[trimmedKey]) {
              acc.push({
                linkToSub: entitiesInfo[trimmedKey]?.entityIdentifier!,
                _hiddenPartyKey: entitiesInfo[trimmedKey]?.partyKey!,
                _hiddenGivenName: entitiesInfo[trimmedKey]?.givenName ?? null,
                _hiddenSurname: entitiesInfo[trimmedKey]?.surname ?? null,
                _hiddenOtherOrInitialName:
                  entitiesInfo[trimmedKey]?.otherOrInitialName ?? null,
                _hiddenNameOfEntity:
                  entitiesInfo[trimmedKey]?.nameOfEntity ?? null,
              });
            }
            return acc;
          }, [] as AccountHolder[]) ?? [];

      const conductors: Conductor[] = [];
      conductors.push({
        linkToSub:
          entitiesInfo[String(posTxn.flowOfFundsConductorEcif)]
            ?.entityIdentifier!,
        _hiddenPartyKey:
          entitiesInfo[String(posTxn.flowOfFundsConductorEcif)]?.partyKey!,
        _hiddenGivenName:
          entitiesInfo[String(posTxn.flowOfFundsConductorEcif)]?.givenName!,
        _hiddenSurname:
          entitiesInfo[String(posTxn.flowOfFundsConductorEcif)]?.surname!,
        _hiddenOtherOrInitialName:
          entitiesInfo[String(posTxn.flowOfFundsConductorEcif)]
            ?.otherOrInitialName!,
        _hiddenNameOfEntity:
          entitiesInfo[String(posTxn.flowOfFundsConductorEcif)]?.nameOfEntity!,
        wasConductedOnBehalf: false,
        onBehalfOf: [],
      });

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
        conductors: conductors,
      });

      // Build completing actions - Merchant receiving payment
      const completingActions: CompletingAction[] = [];

      const merchantEntity =
        entitiesInfo[`merchant_${posTxn.merchantName}_${posTxn.merchantCity}`];

      const merchantBeneficiary = merchantEntity
        ? [
            {
              linkToSub: merchantEntity.entityIdentifier!,
              _hiddenPartyKey: null,
              _hiddenGivenName: merchantEntity.givenName ?? null,
              _hiddenSurname: merchantEntity.surname ?? null,
              _hiddenOtherOrInitialName:
                merchantEntity.otherOrInitialName ?? null,
              _hiddenNameOfEntity: merchantEntity.nameOfEntity ?? null,
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
        entities: Object.values(entitiesInfo).filter(
          (p) => p !== null,
        ) as EntityGenType[],
      };
    }),
  );
}

const parseMerchantName = (posTxn: POSSourceData) => {
  const merchantName =
    posTxn.merchantName || posTxn.terminalOwnerName || 'Unknown Merchant';

  // Merchants are typically businesses
  return {
    surname: null,
    givenName: null,
    otherOrInitialName: null,
    nameOfEntity: merchantName.trim(),
  };
};

// Helper to parse merchant address
function parseMerchantAddress(posTxn: POSSourceData) {
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
