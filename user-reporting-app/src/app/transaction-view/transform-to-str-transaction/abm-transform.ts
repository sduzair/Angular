import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_METHOD_OF_TXN,
} from '../../reporting-ui/edit-form/form-options.service';
import {
  AccountHolder,
  Beneficiary,
  CompletingAction,
  Conductor,
  StartingAction,
} from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  AbmSourceData,
  FlowOfFundsSourceData,
  GetAccountInfoRes,
} from '../../transaction-search/transaction-search.service';
import { EntityGenType } from './entity-gen.service';

/**
 * Transform source transaction into StrTransactionWithChangeLogs format
 */
export function transformABMToStrTransaction(
  sourceTxn: AbmSourceData,
  fofTxn: FlowOfFundsSourceData,
  generateEntity: (
    entity: Omit<EntityGenType, 'entityIdentifier'>,
  ) => Observable<EntityGenType | null>,
  getAccountInfo: (account: string) => Observable<GetAccountInfoRes>,
  caseRecordId: string,
) {
  // Collect all party keys and account info we need to fetch
  const partyKeysToFetch = new Set<string>();
  const accountsToFetch = new Set<string>();

  // Add conductor party key
  if (sourceTxn.flowOfFundsConductorPartyKey) {
    partyKeysToFetch.add(String(sourceTxn.flowOfFundsConductorPartyKey));
  }

  // Add starting action account holders
  sourceTxn.strSaAccountHoldersCifId
    ?.split(/[;:]/)
    .forEach((h) => partyKeysToFetch.add(h.trim()));

  // Add completing action account holders
  sourceTxn.strCaAccountHolderCifId
    ?.split(/[;:]/)
    .forEach((h) => partyKeysToFetch.add(h.trim()));

  // Add starting action account fetch
  if (sourceTxn.strSaAccount) {
    accountsToFetch.add(String(sourceTxn.strSaAccount));
  }

  // Add completing action account fetch
  if (sourceTxn.strCaAccount) {
    accountsToFetch.add(String(sourceTxn.strCaAccount));
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
      for (const acckey of Object.keys(accountsInfo)) {
        accountsInfo[acckey]!.accountHolders.forEach((item) =>
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

      return forkJoin({
        entitiesInfo:
          Object.keys(entityInfoObservables).length > 0
            ? forkJoin(entityInfoObservables)
            : of({} as Record<string, EntityGenType | null>),
      }).pipe(
        map(({ entitiesInfo }) => ({
          entitiesInfo,
          accountsInfo,
        })),
      );
    }),
    map(({ entitiesInfo, accountsInfo }) => {
      // Build starting actions
      const startingActions: StartingAction[] = [];

      const saAccountInfo = accountsInfo[sourceTxn.strSaAccount!];

      const saAccountHolders =
        sourceTxn.strSaAccountHoldersCifId
          ?.split(/[;:]/)
          .reduce((acc, partyKey) => {
            acc.push({
              linkToSub: entitiesInfo[partyKey]?.entityIdentifier!,
              _hiddenPartyKey: entitiesInfo[partyKey]?.partyKey!,
              _hiddenGivenName: entitiesInfo[partyKey]?.givenName ?? null,
              _hiddenSurname: entitiesInfo[partyKey]?.surname ?? null,
              _hiddenOtherOrInitialName:
                entitiesInfo[partyKey]?.otherOrInitialName ?? null,
              _hiddenNameOfEntity: entitiesInfo[partyKey]?.nameOfEntity ?? null,
            });
            return acc;
          }, [] as AccountHolder[]) ?? [];

      const conductors: Conductor[] = [];
      conductors.push({
        linkToSub:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.entityIdentifier!,
        _hiddenPartyKey:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.partyKey!,
        _hiddenGivenName:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.givenName!,
        _hiddenSurname:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.surname!,
        _hiddenOtherOrInitialName:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.otherOrInitialName!,
        _hiddenNameOfEntity:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.nameOfEntity!,
        wasConductedOnBehalf: false,
        onBehalfOf: [],
        npdTypeOfDevice: null,
        npdTypeOfDeviceOther: null,
        npdDeviceIdNo: null,
        npdUsername: null,
        npdIp: null,
        npdDateTimeSession: null,
        npdTimeZone: null,
      });

      startingActions.push({
        directionOfSA: sourceTxn.strSaDirection,
        typeOfFunds: sourceTxn.strSaFundsType,
        typeOfFundsOther: null,
        amount: sourceTxn.strSaAmount,
        currency: sourceTxn.strSaCurrency,
        fiuNo: sourceTxn.strSaFiNumber,
        branch: sourceTxn.strSaBranch ? String(sourceTxn.strSaBranch) : null,
        account: sourceTxn.strSaAccount ? String(sourceTxn.strSaAccount) : null,
        accountType: saAccountInfo?.accountType || null,
        accountTypeOther: null,
        accountOpen: saAccountInfo?.accountOpen || null,
        accountClose: saAccountInfo?.accountClose || null,
        accountStatus:
          saAccountInfo?.accountStatus || sourceTxn.strSaAccountStatus,
        howFundsObtained: null,
        accountCurrency: sourceTxn.strSaAccountCurrency,
        hasAccountHolders: saAccountHolders.length > 0,
        accountHolders: saAccountHolders,
        wasSofInfoObtained: false,
        sourceOfFunds: [],
        wasCondInfoObtained: conductors.length > 0,
        conductors: conductors,
      });

      // Build completing actions
      const completingActions: CompletingAction[] = [];

      const caAccountInfo = accountsInfo[sourceTxn.strCaAccount!];

      const caAccountHolders =
        sourceTxn.strCaAccountHolderCifId
          ?.split(/[;:]/)
          .reduce((acc, partyKey) => {
            acc.push({
              linkToSub: entitiesInfo[partyKey]?.entityIdentifier!,
              _hiddenPartyKey: entitiesInfo[partyKey]?.partyKey!,
              _hiddenGivenName: entitiesInfo[partyKey]?.givenName ?? null,
              _hiddenSurname: entitiesInfo[partyKey]?.surname ?? null,
              _hiddenOtherOrInitialName:
                entitiesInfo[partyKey]?.otherOrInitialName ?? null,
              _hiddenNameOfEntity: entitiesInfo[partyKey]?.nameOfEntity ?? null,
            });
            return acc;
          }, [] as AccountHolder[]) ?? [];

      const beneficiaries: Beneficiary[] = [];
      beneficiaries.push({
        linkToSub:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.entityIdentifier!,
        _hiddenPartyKey:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.partyKey!,
        _hiddenGivenName:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.givenName!,
        _hiddenSurname:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.surname!,
        _hiddenOtherOrInitialName:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.otherOrInitialName!,
        _hiddenNameOfEntity:
          entitiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.nameOfEntity!,
      });

      completingActions.push({
        detailsOfDispo: sourceTxn.strCaDispositionType,
        detailsOfDispoOther: null,
        amount: sourceTxn.strCaAmount,
        currency: sourceTxn.strCaCurrency,
        exchangeRate: sourceTxn.exchangeRateApplied,
        valueInCad: null,
        fiuNo: sourceTxn.strCaFiNumber,
        branch: String(sourceTxn.strCaBranch ?? ''),
        account: String(sourceTxn.strCaAccount ?? ''),
        accountType: caAccountInfo?.accountType || null,
        accountTypeOther: null,
        accountCurrency: caAccountInfo?.accountCurrency ?? null,
        accountOpen: caAccountInfo?.accountOpen || null,
        accountClose: caAccountInfo?.accountClose || null,
        accountStatus: caAccountInfo?.accountStatus ?? '',
        hasAccountHolders: true,
        accountHolders: caAccountHolders,
        wasAnyOtherSubInvolved: false,
        involvedIn: [],
        wasBenInfoObtained: true,
        beneficiaries:
          (sourceTxn.strCaDispositionType as FORM_OPTIONS_DETAILS_OF_DISPOSITION) ===
          'Cash Withdrawal (account based)'
            ? beneficiaries
            : structuredClone(caAccountHolders),
      });

      const { flowOfFundsTransactionDesc } = fofTxn;

      // Build the transformed transaction
      const transformed: StrTransactionWithChangeLogs = {
        // Base StrTransaction fields
        sourceId: sourceTxn.sourceId,
        wasTxnAttempted: false,
        wasTxnAttemptedReason: null,
        dateOfTxn: sourceTxn.flowOfFundsTransactionDate,
        timeOfTxn: sourceTxn.flowOfFundsTransactionTime,
        hasPostingDate: !!sourceTxn.flowOfFundsPostingDate,
        dateOfPosting: sourceTxn.flowOfFundsPostingDate,
        timeOfPosting: null,
        methodOfTxn: 'ABM' satisfies FORM_OPTIONS_METHOD_OF_TXN,
        methodOfTxnOther: null,
        reportingEntityTxnRefNo: sourceTxn.flowOfFundsAmlTransactionId,
        purposeOfTxn: sourceTxn.strSaPurposeOfTransaction,
        reportingEntityLocationNo: sourceTxn.strReportingEntity,
        startingActions,
        completingActions,
        highlightColor: null,

        // StrTxnFlowOfFunds fields
        flowOfFundsAccountCurrency: sourceTxn.flowOfFundsAccountCurrency,
        flowOfFundsAmlId: sourceTxn.flowOfFundsAmlId,
        flowOfFundsAmlTransactionId: sourceTxn.flowOfFundsAmlTransactionId,
        flowOfFundsCasePartyKey: sourceTxn.flowOfFundsCasePartyKey,
        flowOfFundsConductorPartyKey: sourceTxn.flowOfFundsConductorPartyKey,
        flowOfFundsCreditAmount: sourceTxn.flowOfFundsCreditAmount,
        flowOfFundsCreditedAccount: sourceTxn.flowOfFundsCreditedAccount,
        flowOfFundsCreditedTransit: sourceTxn.flowOfFundsCreditedTransit,
        flowOfFundsDebitAmount: sourceTxn.flowOfFundsDebitAmount,
        flowOfFundsDebitedAccount: sourceTxn.flowOfFundsDebitedAccount,
        flowOfFundsDebitedTransit: sourceTxn.flowOfFundsDebitedTransit,
        flowOfFundsPostingDate: sourceTxn.flowOfFundsPostingDate,
        flowOfFundsSource: sourceTxn.flowOfFundsSource,
        flowOfFundsSourceTransactionId:
          sourceTxn.flowofFundsSourceTransactionId,
        flowOfFundsTransactionCurrency:
          sourceTxn.flowOfFundsTransactionCurrency,
        flowOfFundsTransactionCurrencyAmount:
          sourceTxn.flowOfFundsTransactionCurrencyAmount,
        flowOfFundsTransactionDate: sourceTxn.flowOfFundsTransactionDate,
        flowOfFundsTransactionDesc,
        flowOfFundsTransactionTime: sourceTxn.flowOfFundsTransactionTime,

        // StrTransactionWithChangeLogs fields
        eTag: 0,
        caseRecordId,
        changeLogs: [],
        _hiddenValidation: [],
      };

      return {
        selection: transformed,
        entities: Object.values(entitiesInfo) as EntityGenType[],
      };
    }),
  );
}
