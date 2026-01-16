import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import {
  AccountHolder,
  CompletingAction,
  Conductor,
  StartingAction,
} from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  GetAccountInfoRes,
  GetPartyInfoRes,
  SEARCH_SOURCE_ID,
  WireSourceData,
} from '../../transaction-search/transaction-search.service';
import {
  FORM_OPTIONS_ACCOUNT_TYPE,
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_METHOD_OF_TXN,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../../reporting-ui/edit-form/form-options.service';

/**
 * Transform incoming wire transfer into StrTransactionWithChangeLogs format
 * @param wireTxn - Wire transaction from MongoDB
 * @param getPartyInfo - Method to fetch party information by partyKey
 * @param getAccountInfo - Method to fetch account information
 * @param caseRecordId - The case record ID to associate with this transaction
 * @returns Observable of transformed transaction
 */
export function transformWireInToStrTransaction(
  wireTxn: WireSourceData,
  getPartyInfo: (partyKey: string) => Observable<GetPartyInfoRes>,
  getAccountInfo: (account: string) => Observable<GetAccountInfoRes>,
  caseRecordId: string,
): Observable<StrTransactionWithChangeLogs> {
  if (wireTxn.wireRole !== 'RECEIVER') {
    throw new Error(
      'This function only handles incoming wire transfers (RECEIVER role)',
    );
  }

  // Collect all party keys and account info we need to fetch
  const partyKeysToFetch = new Set<string>();
  const accountsToFetch = new Set<string>();

  // Add receiver (beneficiary) account holders - CIBC account
  if (wireTxn.customer1AccountHolderCifId) {
    const holders = wireTxn.customer1AccountHolderCifId.split(/[;:]/);
    holders.forEach((h) => partyKeysToFetch.add(h.trim()));
  }

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
        Observable<GetPartyInfoRes | null>
      > = {};
      Array.from(partyKeysToFetch).forEach((key) => {
        partyInfoObservables[key] = getPartyInfo(key);
      });
      return forkJoin({
        partiesInfo:
          partyKeysToFetch.size > 0
            ? forkJoin(partyInfoObservables)
            : of({} as Record<string, GetPartyInfoRes | null>),
      }).pipe(map(({ partiesInfo }) => ({ partiesInfo, accountsInfo })));
    }),
    map(({ partiesInfo, accountsInfo }) => {
      // Helper to map party info
      const mapPartyInfo = (partyKey: string | null): AccountHolder => {
        if (!partyKey) {
          return {
            partyKey: null,
            surname: null,
            givenName: null,
            otherOrInitial: null,
            nameOfEntity: null,
          };
        }
        const info = partiesInfo[partyKey];
        return {
          partyKey,
          surname: info?.surname || null,
          givenName: info?.givenName || null,
          otherOrInitial: info?.otherOrInitial || null,
          nameOfEntity: info?.nameOfEntity || null,
        };
      };

      // Helper to parse name from wire data
      const parseWireName = (
        fullName: string | null,
      ): {
        surname: string | null;
        givenName: string | null;
        otherOrInitial: string | null;
        nameOfEntity: string | null;
      } => {
        if (!fullName) {
          return {
            surname: null,
            givenName: null,
            otherOrInitial: null,
            nameOfEntity: null,
          };
        }

        // Check if it looks like an entity name (contains words like Inc, Ltd, LLC, etc.)
        const entityPatterns =
          /\b(Inc|Ltd|LLC|Corp|Corporation|Limited|Company|Bank|Trust|Credit Union|Plc)\b/i;
        if (entityPatterns.test(fullName)) {
          return {
            surname: null,
            givenName: null,
            otherOrInitial: null,
            nameOfEntity: fullName.trim(),
          };
        }

        // Try to parse as person name (format: "FirstName MiddleInitial LastName")
        const nameParts = fullName.trim().split(/\s+/);
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
          nameOfEntity: fullName.trim(),
        };
      };

      // Build starting actions - INCOMING WIRE
      const startingActions: StartingAction[] = [];

      // Sender information (foreign account/entity)
      const senderNameInfo = parseWireName(wireTxn.ocName);

      // Account holders for sender (not CIBC, so we create from wire data)
      const conductor: Conductor = {
        ...senderNameInfo,
        partyKey: null,
        wasConductedOnBehalf: false,
        onBehalfOf: null,
      };

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
        accountType: (senderNameInfo.nameOfEntity
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
        conductors: [conductor],
      });

      // Build completing actions - INCOMING WIRE
      const completingActions: CompletingAction[] = [];

      // Receiver (beneficiary) - CIBC account
      const receiverAccountInfo = accountsInfo[wireTxn.strCaAccount];

      // Receiver account holders
      const receiverAccountHolders: AccountHolder[] = [];
      if (wireTxn.customer1AccountHolderCifId) {
        const holders = wireTxn.customer1AccountHolderCifId.split(/[;:]/);
        holders.forEach((key) => {
          receiverAccountHolders.push(mapPartyInfo(key.trim()));
        });
      }

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
        accountType: receiverAccountInfo?.accountType || null,
        accountTypeOther: null,
        accountCurrency: receiverAccountInfo?.accountCurrency ?? '',
        accountOpen: receiverAccountInfo?.accountOpen || null,
        accountClose: receiverAccountInfo?.accountClose || null,
        accountStatus: receiverAccountInfo?.accountStatus ?? '',
        hasAccountHolders: true,
        accountHolders: receiverAccountHolders,
        wasAnyOtherSubInvolved: false,
        involvedIn: [],
        wasBenInfoObtained: true,
        beneficiaries: receiverAccountHolders,
      });

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
        flowOfFundsTransactionDesc: wireTxn.flowOfFundsTransactionDesc || '',
        flowOfFundsTransactionTime: wireTxn.flowOfFundsTransactionTime,

        // StrTransactionWithChangeLogs fields
        eTag: 0,
        caseRecordId,
        changeLogs: [],
        _hiddenValidation: [],
      };

      return transformed;
    }),
  );
}
