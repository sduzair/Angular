import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_METHOD_OF_TXN,
} from '../../reporting-ui/edit-form/form-options.service';
import {
  AccountHolder,
  CompletingAction,
  Conductor,
  StartingAction,
} from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  AbmSourceData,
  FlowOfFundsSourceData,
  GetAccountInfoRes,
} from '../../transaction-search/transaction-search.service';
import { PartyGenType } from './party-gen.service';

/**
 * Transform source transaction into StrTransactionWithChangeLogs format
 */
export function transformABMToStrTransaction(
  sourceTxn: AbmSourceData,
  fofTxn: FlowOfFundsSourceData,
  generateParty: (
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ) => Observable<PartyGenType | null>,
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

      return forkJoin({
        partiesInfo:
          Object.keys(partyInfoObservables).length > 0
            ? forkJoin(partyInfoObservables)
            : of({} as Record<string, PartyGenType | null>),
      }).pipe(map(({ partiesInfo }) => ({ partiesInfo, accountsInfo })));
    }),
    map(({ partiesInfo, accountsInfo }) => {
      // Build starting actions
      const startingActions: StartingAction[] = [];

      const saAccountInfo = accountsInfo[sourceTxn.strSaAccount!];

      const saAccountHolders =
        sourceTxn.strSaAccountHoldersCifId
          ?.split(/[;:]/)
          .reduce((acc, partyKey) => {
            acc.push({
              linkToSub: partiesInfo[partyKey]?.partyIdentifier,
              _hiddenPartyKey: partiesInfo[partyKey]?.identifiers?.partyKey!,
              _hiddenGivenName:
                partiesInfo[partyKey]?.partyName?.givenName ?? null,
              _hiddenSurname: partiesInfo[partyKey]?.partyName?.surname ?? null,
              _hiddenOtherOrInitial:
                partiesInfo[partyKey]?.partyName?.otherOrInitial ?? null,
              _hiddenNameOfEntity:
                partiesInfo[partyKey]?.partyName?.nameOfEntity ?? null,
            });
            return acc;
          }, [] as AccountHolder[]) ?? [];

      const conductors: Conductor[] = [];
      conductors.push({
        linkToSub:
          partiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.partyIdentifier,
        _hiddenPartyKey:
          partiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]
            ?.identifiers?.partyKey!,
        _hiddenGivenName:
          partiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]?.partyName
            ?.givenName!,
        _hiddenSurname:
          partiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]?.partyName
            ?.surname!,
        _hiddenOtherOrInitial:
          partiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]?.partyName
            ?.otherOrInitial!,
        _hiddenNameOfEntity:
          partiesInfo[String(sourceTxn.flowOfFundsConductorPartyKey)]?.partyName
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
        sourceOfFunds: undefined,
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
              linkToSub: partiesInfo[partyKey]?.partyIdentifier,
              _hiddenPartyKey: partiesInfo[partyKey]?.identifiers?.partyKey!,
              _hiddenGivenName:
                partiesInfo[partyKey]?.partyName?.givenName ?? null,
              _hiddenSurname: partiesInfo[partyKey]?.partyName?.surname ?? null,
              _hiddenOtherOrInitial:
                partiesInfo[partyKey]?.partyName?.otherOrInitial ?? null,
              _hiddenNameOfEntity:
                partiesInfo[partyKey]?.partyName?.nameOfEntity ?? null,
            });
            return acc;
          }, [] as AccountHolder[]) ?? [];

      completingActions.push({
        detailsOfDispo: sourceTxn.strCaDispositionType,
        detailsOfDispoOther: null,
        amount: sourceTxn.strCaAmount,
        currency: sourceTxn.strCaCurrency,
        exchangeRate: null,
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
            ? conductors
            : caAccountHolders,
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
        parties: Object.values(partiesInfo) as PartyGenType[],
      };
    }),
  );
}
