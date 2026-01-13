import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import {
  AccountHolder,
  Beneficiary,
  CompletingAction,
  Conductor,
  StartingAction,
} from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  EmtSourceData,
  GetAccountInfoRes,
  GetPartyInfoRes,
  OlbSourceData,
  SEARCH_SOURCE_ID,
} from '../../transaction-search/transaction-search.service';
import {
  FORM_OPTIONS_ACCOUNT_TYPE,
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_METHOD_OF_TXN,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../../reporting-ui/edit-form/form-options.service';

/**
 * Transform OLB/EMT source transactions into StrTransactionWithChangeLogs format
 * @param olbTxn - OLB transaction record
 * @param emtTxn - EMT transaction record (matched by flowOfFundsAmlTransactionId)
 * @param getPartyInfo - Method to fetch party information by partyKey
 * @param getAccountInfo - Method to fetch account information
 * @param caseRecordId - The case record ID to associate with this transaction
 * @returns Observable of transformed transaction
 */
export function transformOlbEmtToStrTransaction(
  olbTxn: OlbSourceData,
  emtTxn: EmtSourceData,
  getPartyInfo: (partyKey: string) => Observable<GetPartyInfoRes>,
  getAccountInfo: (account: string) => Observable<GetAccountInfoRes>,
  caseRecordId: string,
): Observable<StrTransactionWithChangeLogs> {
  const isIncoming = olbTxn.strSaDirection === 'In';
  const isOutgoing = olbTxn.strSaDirection === 'Out';
  const isSenderCibc = emtTxn.senderFiNumber === 'CA000010';
  const isRecipientCibc = emtTxn.recipientFiNumber === 'CA000010';

  // Collect all party keys and account info we need to fetch
  const partyKeysToFetch = new Set<string>();
  const accountsToFetch = new Set<string>();

  // Add conductor party key
  if (olbTxn.flowOfFundsConductorPartyKey) {
    partyKeysToFetch.add(String(olbTxn.flowOfFundsConductorPartyKey));
  }
  if (emtTxn.conductorEcif) {
    partyKeysToFetch.add(emtTxn.conductorEcif);
  }

  // For INCOMING transactions
  if (isIncoming) {
    // Recipient account holders (case party - CIBC account)
    if (olbTxn.customer2AccountHolderCifId) {
      const holders = olbTxn.customer2AccountHolderCifId.split(/[;:]/);
      holders.forEach((h) => partyKeysToFetch.add(h.trim()));
    }

    // Recipient account (CIBC)
    accountsToFetch.add(emtTxn.recipientAccountNumber?.split('-').at(-1)!);
    console.assert(
      isRecipientCibc && !!emtTxn.recipientAccountNumber,
      'Assert recipient is cibc',
    );

    // Sender account (if CIBC)
    if (isSenderCibc) {
      accountsToFetch.add(emtTxn.senderAccountNumber?.split('-').at(-1)!);
    }
  }

  // For OUTGOING transactions
  if (isOutgoing) {
    // Sender account holders (case party - CIBC account)
    if (olbTxn.customer1AccountHolderCifId) {
      const holders = olbTxn.customer1AccountHolderCifId.split(/[;:]/);
      holders.forEach((h) => partyKeysToFetch.add(h.trim()));
    }

    // Sender account (CIBC)
    accountsToFetch.add(emtTxn.senderAccountNumber?.split('-').at(-1)!);
    console.assert(isSenderCibc && !!emtTxn.senderAccountNumber);

    // Recipient account (if CIBC)
    if (isRecipientCibc) {
      accountsToFetch.add(emtTxn.recipientAccountNumber?.split('-').at(-1)!);
    }
  }

  // Fetch all party info in parallel
  const partyInfoObservables: Record<
    string,
    Observable<GetPartyInfoRes | null>
  > = {};
  Array.from(partyKeysToFetch).forEach((key) => {
    partyInfoObservables[key] = getPartyInfo(key);
  });

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
    partiesInfo:
      partyKeysToFetch.size > 0
        ? forkJoin(partyInfoObservables)
        : of({} as Record<string, GetPartyInfoRes | null>),
    accountsInfo:
      accountsToFetch.size > 0
        ? forkJoin(accountInfoObservables)
        : of({} as Record<string, GetAccountInfoRes | null>),
  }).pipe(
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

      // Helper to parse name from EMT data
      const parseNameFromEmt = (
        fullName?: string | null,
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

        const parts = fullName.trim().split(' ');
        const givenName = parts[0];
        const surname = parts.at(-1)!;
        const otherOrInitial = parts.slice(1, -1).join(' ');

        // todo does not account for businesses
        return {
          surname,
          givenName,
          otherOrInitial,
          nameOfEntity: null,
        };
      };

      // Build starting actions
      const startingActions: StartingAction[] = [];

      if (isIncoming && !isSenderCibc) {
        // INCOMING: Sender is starting action

        // For non-CIBC sender, use name from EMT data
        const emtSenderNameParsed = parseNameFromEmt(emtTxn.senderName);

        startingActions.push({
          directionOfSA: 'In',
          typeOfFunds:
            'Email money transfer' satisfies FORM_OPTIONS_TYPE_OF_FUNDS,
          typeOfFundsOther: null,
          amount: olbTxn.strSaAmount,
          currency: olbTxn.strSaCurrency,
          fiuNo: emtTxn.senderFiNumber.slice(5),
          branch: null,
          account: emtTxn.senderEmail,
          accountType: 'Personal' satisfies FORM_OPTIONS_ACCOUNT_TYPE,
          accountTypeOther: null,
          accountOpen: null,
          accountClose: null,
          accountStatus: null,
          howFundsObtained: null,
          accountCurrency: null,
          hasAccountHolders: false,
          accountHolders: [],
          wasSofInfoObtained: true,
          sourceOfFunds: [],
          wasCondInfoObtained: false,
          conductors: [
            {
              ...emtSenderNameParsed,
              wasConductedOnBehalf: false,
              npdTypeOfDevice: olbTxn.userDeviceType || null,
              npdTypeOfDeviceOther: null,
              npdDeviceIdNo: null,
              npdUsername: null,
              npdIp: emtTxn.senderIpAddress || olbTxn.ipAddress || null,
              npdDateTimeSession: olbTxn.userSessionDateTimeStr || null,
              npdTimeZone: null,
            } as Conductor,
          ],
        });
      }

      if (isIncoming && isSenderCibc) {
        // INCOMING: Sender is starting action
        const senderAccountInfo =
          accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!];

        // Get sender account holders if CIBC
        const senderAccountHolders: AccountHolder[] = [];

        senderAccountInfo?.accountHolders.forEach((holder) => {
          senderAccountHolders.push(mapPartyInfo(holder.partyKey));
        });

        startingActions.push({
          directionOfSA: 'In',
          typeOfFunds:
            'Email money transfer' satisfies FORM_OPTIONS_TYPE_OF_FUNDS,
          typeOfFundsOther: null,
          amount: olbTxn.strSaAmount,
          currency: olbTxn.strSaCurrency,
          fiuNo: '010',
          branch: senderAccountInfo?.branch ?? '',
          account: senderAccountInfo?.account ?? '',
          accountType: senderAccountInfo?.accountType || null,
          accountTypeOther: null,
          accountOpen: senderAccountInfo?.accountOpen || null,
          accountClose: senderAccountInfo?.accountClose || null,
          accountStatus: senderAccountInfo?.accountStatus || null,
          accountCurrency: senderAccountInfo?.accountCurrency ?? '',
          howFundsObtained: null,
          hasAccountHolders: true,
          accountHolders: senderAccountHolders,
          wasSofInfoObtained: false,
          sourceOfFunds: [],
          wasCondInfoObtained: true,
          conductors: senderAccountHolders.map(
            ({
              partyKey,
              givenName,
              surname,
              otherOrInitial,
              nameOfEntity,
            }) => ({
              partyKey,
              givenName,
              surname,
              otherOrInitial,
              nameOfEntity,
              wasConductedOnBehalf: false,
              npdTypeOfDevice: olbTxn.userDeviceType || null,
              npdTypeOfDeviceOther: null,
              npdDeviceIdNo: null,
              npdUsername: null,
              npdIp: emtTxn.senderIpAddress || olbTxn.ipAddress || null,
              npdDateTimeSession: olbTxn.userSessionDateTimeStr || null,
              npdTimeZone: null,
            }),
          ),
        });
      }

      if (isOutgoing) {
        // OUTGOING: Sender account (CIBC) is starting action
        const senderAccountInfo = emtTxn.senderAccountNumber
          ? accountsInfo[emtTxn.senderAccountNumber.split('-').at(-1)!]
          : null;

        const senderAccountHolders: AccountHolder[] = [];
        if (olbTxn.customer1AccountHolderCifId) {
          const holders = olbTxn.customer1AccountHolderCifId.split(/[;:]/);
          holders.forEach((key) => {
            senderAccountHolders.push(mapPartyInfo(key.trim()));
          });
        }

        // Conductor information (the person who sent the e-transfer)
        const conductors: Conductor[] = [mapPartyInfo(olbTxn.conductor)].map(
          (sub) => {
            return {
              ...sub,
              wasConductedOnBehalf: false,
              onBehalfOf: null,
              npdTypeOfDevice: olbTxn.userDeviceType || null,
              npdTypeOfDeviceOther: null,
              npdDeviceIdNo: null,
              npdUsername: null,
              npdIp: emtTxn.senderIpAddress || olbTxn.ipAddress || null,
              npdDateTimeSession: olbTxn.userSessionDateTimeStr || null,
              npdTimeZone: null,
            };
          },
        );

        startingActions.push({
          directionOfSA: 'Out',
          typeOfFunds: 'Funds Withdrawal' as FORM_OPTIONS_TYPE_OF_FUNDS,
          typeOfFundsOther: null,
          amount: olbTxn.strSaAmount,
          currency: olbTxn.strSaCurrency,
          fiuNo: '010',
          branch: senderAccountInfo?.branch ?? '',
          account: senderAccountInfo?.account ?? '',
          accountType: senderAccountInfo?.accountType || null,
          accountTypeOther: null,
          accountOpen: senderAccountInfo?.accountOpen || null,
          accountClose: senderAccountInfo?.accountClose || null,
          accountStatus: senderAccountInfo?.accountStatus || null,
          accountCurrency: senderAccountInfo?.accountCurrency ?? '',
          howFundsObtained: null,
          hasAccountHolders: senderAccountHolders.length > 0,
          accountHolders:
            senderAccountHolders.length > 0 ? senderAccountHolders : undefined,
          wasSofInfoObtained: false,
          sourceOfFunds: [],
          wasCondInfoObtained: true,
          conductors: conductors,
        });
      }

      // Build completing actions
      const completingActions: CompletingAction[] = [];

      if (isIncoming) {
        // INCOMING: Recipient (CIBC account) is completing action

        const recipientAccountInfo =
          accountsInfo[emtTxn.recipientAccountNumber?.split('-').at(-1)!];

        const recipientAccountHolders: AccountHolder[] = [];
        if (olbTxn.customer2AccountHolderCifId) {
          const holders = olbTxn.customer2AccountHolderCifId.split(/[;:]/);
          holders.forEach((key) => {
            recipientAccountHolders.push(mapPartyInfo(key.trim()));
          });
        }

        completingActions.push({
          detailsOfDispo:
            'Deposit to account' satisfies FORM_OPTIONS_DETAILS_OF_DISPOSITION,
          detailsOfDispoOther: null,
          amount: olbTxn.strCaAmount,
          currency: olbTxn.strCaCurrency,
          exchangeRate: null,
          valueInCad: null,
          fiuNo: '010',
          branch: recipientAccountInfo?.branch ?? '',
          account: recipientAccountInfo?.account ?? '',
          accountType: recipientAccountInfo?.accountType || null,
          accountTypeOther: null,
          accountOpen: recipientAccountInfo?.accountOpen || null,
          accountClose: recipientAccountInfo?.accountClose || null,
          accountStatus: recipientAccountInfo?.accountStatus || null,
          accountCurrency: recipientAccountInfo?.accountCurrency ?? '',
          hasAccountHolders: recipientAccountHolders.length > 0,
          accountHolders: recipientAccountHolders,
          wasAnyOtherSubInvolved: false,
          involvedIn: [],
          wasBenInfoObtained: true,
          beneficiaries: recipientAccountHolders,
        });
      }

      if (isOutgoing && !isRecipientCibc) {
        // OUTGOING: Recipient is completing action

        const emtRecepientNameParsed = parseNameFromEmt(emtTxn.recipientName);

        completingActions.push({
          detailsOfDispo:
            'Outgoing email money transfer' satisfies FORM_OPTIONS_DETAILS_OF_DISPOSITION,
          detailsOfDispoOther: null,
          amount: olbTxn.strCaAmount,
          currency: olbTxn.strCaCurrency,
          exchangeRate: null,
          valueInCad: null,
          fiuNo: emtTxn.recipientFiNumber.slice(5),
          branch: null,
          account: emtTxn.recipientEmail,
          accountType: 'Personal' satisfies FORM_OPTIONS_ACCOUNT_TYPE,
          accountTypeOther: null,
          accountCurrency: olbTxn.strCaAccountCurrency,
          accountOpen: null,
          accountClose: null,
          accountStatus: null,
          hasAccountHolders: false,
          accountHolders: [],
          wasAnyOtherSubInvolved: false,
          involvedIn: [],
          wasBenInfoObtained: true,
          beneficiaries: [{ ...emtRecepientNameParsed } as Beneficiary],
        });
      }

      if (isOutgoing && isRecipientCibc) {
        // OUTGOING: Recipient is completing action
        const recipientAccountInfo =
          accountsInfo[emtTxn.recipientAccountNumber?.split('-').at(-1)!];

        // Get recipient account holders if CIBC
        const recipientAccountHolders: AccountHolder[] = [];

        recipientAccountInfo?.accountHolders.forEach((holder) => {
          recipientAccountHolders.push(mapPartyInfo(holder.partyKey));
        });

        completingActions.push({
          detailsOfDispo:
            'Outgoing email money transfer' satisfies FORM_OPTIONS_DETAILS_OF_DISPOSITION,
          detailsOfDispoOther: null,
          amount: olbTxn.strCaAmount,
          currency: olbTxn.strCaCurrency,
          exchangeRate: null,
          valueInCad: null,
          fiuNo: '010',
          branch: recipientAccountInfo?.branch ?? '',
          account: recipientAccountInfo?.account ?? '',
          accountType: recipientAccountInfo?.accountType || null,
          accountTypeOther: null,
          accountOpen: recipientAccountInfo?.accountOpen || null,
          accountClose: recipientAccountInfo?.accountClose || null,
          accountStatus: recipientAccountInfo?.accountStatus || null,
          accountCurrency: recipientAccountInfo?.accountCurrency ?? '',
          hasAccountHolders: true,
          accountHolders: recipientAccountHolders,
          wasAnyOtherSubInvolved: false,
          involvedIn: [],
          wasBenInfoObtained: true,
          beneficiaries: recipientAccountHolders,
        });
      }

      // Build the transformed transaction
      const transformed: StrTransactionWithChangeLogs = {
        // Base StrTransaction fields
        sourceId: 'EMT' satisfies SEARCH_SOURCE_ID,
        wasTxnAttempted: true,
        wasTxnAttemptedReason: null,
        dateOfTxn: olbTxn.flowOfFundsTransactionDate,
        timeOfTxn: olbTxn.flowOfFundsTransactionTime,
        hasPostingDate: !!olbTxn.flowOfFundsPostingDate,
        dateOfPosting: olbTxn.flowOfFundsPostingDate,
        timeOfPosting: null,
        methodOfTxn: 'Online' satisfies FORM_OPTIONS_METHOD_OF_TXN,
        methodOfTxnOther: null,
        reportingEntityTxnRefNo:
          emtTxn.fiRefCode || olbTxn.flowOfFundsSourceTransactionId,
        purposeOfTxn: emtTxn.transferDetails || null,
        reportingEntityLocationNo: olbTxn.strReportingEntity,
        startingActions,
        completingActions,
        highlightColor: null,

        // StrTxnFlowOfFunds fields
        flowOfFundsAccountCurrency: olbTxn.flowOfFundsAccountCurrency,
        flowOfFundsAmlId: olbTxn.flowOfFundsAmlId,
        flowOfFundsAmlTransactionId: olbTxn.flowOfFundsAmlTransactionId,
        flowOfFundsCasePartyKey: olbTxn.flowOfFundsCasePartyKey,
        flowOfFundsConductorPartyKey: olbTxn.flowOfFundsConductorPartyKey,
        flowOfFundsCreditAmount: olbTxn.flowOfFundsCreditAmount,
        flowOfFundsCreditedAccount: olbTxn.flowOfFundsCreditedAccount,
        flowOfFundsCreditedTransit: olbTxn.flowOfFundsCreditedTransit,
        flowOfFundsDebitAmount: olbTxn.flowOfFundsDebitAmount,
        flowOfFundsDebitedAccount: olbTxn.flowOfFundsDebitedAccount,
        flowOfFundsDebitedTransit: olbTxn.flowOfFundsDebitedTransit,
        flowOfFundsPostingDate: olbTxn.flowOfFundsPostingDate,
        flowOfFundsSource: olbTxn.flowOfFundsSource,
        flowOfFundsSourceTransactionId: olbTxn.flowOfFundsSourceTransactionId,
        flowOfFundsTransactionCurrency: olbTxn.flowOfFundsTransactionCurrency,
        flowOfFundsTransactionCurrencyAmount:
          olbTxn.flowOfFundsTransactionCurrencyAmount,
        flowOfFundsTransactionDate: olbTxn.flowOfFundsTransactionDate,
        flowOfFundsTransactionDesc: olbTxn.transactionDescription || '',
        flowOfFundsTransactionTime: olbTxn.flowOfFundsTransactionTime,

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
