import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import {
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
  OTCSourceData,
} from '../../transaction-search/transaction-search.service';
import { PartyGenType } from './party-gen.service';

/**
 * Transform CBFE mixed deposit transaction into StrTransactionWithChangeLogs format
 */
export function transformOTCToStrTransaction({
  sourceTxn,
  fofTxn,
  generateParty,
  getAccountInfo,
  caseRecordId,
}: {
  sourceTxn: OTCSourceData;
  fofTxn: FlowOfFundsSourceData;
  generateParty: (
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ) => Observable<PartyGenType | null>;
  getAccountInfo: (account: string) => Observable<GetAccountInfoRes>;
  caseRecordId: string;
}) {
  // Collect all party keys and account info we need to fetch
  const partyKeysToFetch = new Set<string>();
  const accountsToFetch = new Set<string>();

  // Add conductor party key
  if (sourceTxn.flowOfFundsConductorPartyKey) {
    partyKeysToFetch.add(String(sourceTxn.flowOfFundsConductorPartyKey));
  }

  // Add starting action account holders
  sourceTxn.strSaAccountHoldersCifId
    ?.split(';')
    .forEach((h) => partyKeysToFetch.add(h.trim()));

  // Add completing action account holders
  sourceTxn.strCaAccountHolderCifId
    ?.split(';')
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
      // Add account holders from fetched account info
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
      // Parse cheque amount from chequeBreakdown field
      const parseChequeAmount = (): number => {
        if (!sourceTxn.chequeBreakdown) {
          return 0;
        }
        // Parse format like "10800.00 CAD" - extract numeric value
        const match = sourceTxn.chequeBreakdown.match(/[\d,]+\.?\d*/);
        if (match) {
          return parseFloat(match[0].replace(/,/g, ''));
        }
        return 0;
      };

      const chequeAmount = parseChequeAmount();
      const cashAmount = sourceTxn.strCaAmount - chequeAmount;

      // Build conductors (shared between both starting actions)
      const conductors: Conductor[] = [];

      const conductorPartyKey = String(sourceTxn.flowOfFundsConductorPartyKey);

      conductors.push({
        linkToSub: partiesInfo[conductorPartyKey]?.partyIdentifier!,
        _hiddenPartyKey: partiesInfo[conductorPartyKey]?.identifiers?.partyKey!,
        _hiddenGivenName:
          partiesInfo[conductorPartyKey]?.partyName?.givenName ?? null,
        _hiddenSurname:
          partiesInfo[conductorPartyKey]?.partyName?.surname ?? null,
        _hiddenOtherOrInitial:
          partiesInfo[conductorPartyKey]?.partyName?.otherOrInitial ?? null,
        _hiddenNameOfEntity:
          partiesInfo[conductorPartyKey]?.partyName?.nameOfEntity ?? null,
        wasConductedOnBehalf: sourceTxn.strSaOboInd === 'Yes',
        onBehalfOf: [],
        npdTypeOfDevice: null,
        npdTypeOfDeviceOther: null,
        npdDeviceIdNo: null,
        npdUsername: null,
        npdIp: null,
        npdDateTimeSession: null,
        npdTimeZone: null,
      });

      // Build starting actions - separate for cash and cheque
      const startingActions: StartingAction[] = [];

      // Add cheque starting action for cheque amount
      startingActions.push({
        directionOfSA: sourceTxn.strSaDirection,
        typeOfFunds: 'Cheque' satisfies FORM_OPTIONS_TYPE_OF_FUNDS,
        typeOfFundsOther: null,
        amount: chequeAmount,
        currency: sourceTxn.origCurrencyCD,
        fiuNo: null,
        branch: null,
        account: null,
        accountType: null,
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
        wasCondInfoObtained: conductors.length > 0,
        conductors: conductors.length > 0 ? [...conductors] : undefined,
      });

      // Add cash starting action for cash
      startingActions.push({
        directionOfSA: sourceTxn.strSaDirection,
        typeOfFunds: 'Cash' satisfies FORM_OPTIONS_TYPE_OF_FUNDS,
        typeOfFundsOther: null,
        amount: cashAmount,
        currency: sourceTxn.origCurrencyCD,
        fiuNo: null,
        branch: null,
        account: null,
        accountType: null,
        accountTypeOther: null,
        accountOpen: null,
        accountClose: null,
        accountStatus: null,
        howFundsObtained: null,
        accountCurrency: null,
        hasAccountHolders: false,
        accountHolders: [],
        wasSofInfoObtained: sourceTxn.strSaFundingSourceInd === 'Yes',
        sourceOfFunds: [],
        wasCondInfoObtained: conductors.length > 0,
        conductors: conductors.length > 0 ? [...conductors] : undefined,
      });

      // Build completing actions
      const completingActions: CompletingAction[] = [];

      // Build account holders from strCaAccountHolderCifId
      const caAccountHolders =
        sourceTxn.strCaAccountHolderCifId?.split(/[;:]/).reduce((acc, key) => {
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
          sourceTxn.strCaDispositionType as FORM_OPTIONS_DETAILS_OF_DISPOSITION,
        detailsOfDispoOther: sourceTxn.strCaDispositionTypeOther,
        amount: sourceTxn.strCaAmount,
        currency: sourceTxn.strCaCurrency,
        exchangeRate: null,
        valueInCad: null,
        fiuNo: sourceTxn.strCaFiNumber,
        branch: String(sourceTxn.strCaBranch),
        account: String(sourceTxn.strCaAccount),
        accountType: accountsInfo[sourceTxn.strCaAccount!]?.accountType || null,
        accountTypeOther: null,
        accountCurrency:
          accountsInfo[sourceTxn.strCaAccount!]?.accountCurrency ?? null,
        accountOpen: accountsInfo[sourceTxn.strCaAccount!]?.accountOpen || null,
        accountClose:
          accountsInfo[sourceTxn.strCaAccount!]?.accountClose || null,
        accountStatus:
          accountsInfo[sourceTxn.strCaAccount!]?.accountStatus ||
          sourceTxn.strCaAccountStatus,
        hasAccountHolders: caAccountHolders.length > 0,
        accountHolders:
          caAccountHolders.length > 0 ? caAccountHolders : undefined,
        wasAnyOtherSubInvolved: sourceTxn.strCaInvolvedInInd === 'Yes',
        involvedIn: sourceTxn.strCaInvolvedInInd === 'Yes' ? [] : undefined,
        wasBenInfoObtained: sourceTxn.strCaBeneficiaryInd === 'Yes',
        beneficiaries:
          sourceTxn.strCaBeneficiaryInd === 'Yes'
            ? caAccountHolders
            : undefined,
      });

      const { flowOfFundsTransactionDesc } = fofTxn;

      // Build the transformed transaction
      const transformed: StrTransactionWithChangeLogs = {
        // Base StrTransaction fields
        sourceId: sourceTxn.sourceId,
        wasTxnAttempted: sourceTxn.strTransactionStatus === 'Yes',
        wasTxnAttemptedReason: null,
        dateOfTxn: sourceTxn.flowOfFundsTransactionDate,
        timeOfTxn: sourceTxn.flowOfFundsTransactionTime,
        hasPostingDate: !!sourceTxn.flowOfFundsPostingDate,
        dateOfPosting: sourceTxn.flowOfFundsPostingDate,
        timeOfPosting: null,
        methodOfTxn: 'In-Person' satisfies FORM_OPTIONS_METHOD_OF_TXN,
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
          sourceTxn.flowOfFundsSourceTransactionId,
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
