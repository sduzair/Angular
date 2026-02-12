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
  EmtSourceData,
  FlowOfFundsSourceData,
  GetAccountInfoRes,
  OlbSourceData,
  SEARCH_SOURCE_ID,
} from '../../transaction-search/transaction-search.service';
import { PartyGenType, PartyName } from './party-gen.service';

/**
 * Transform OLB/EMT source transactions into StrTransactionWithChangeLogs format
 */
export function transformOlbEmtToStrTransaction({
  olbTxn,
  fofTxn,
  emtTxn,
  generateParty,
  getAccountInfo,
  caseRecordId,
}: {
  olbTxn: OlbSourceData;
  fofTxn: FlowOfFundsSourceData;
  emtTxn: EmtSourceData;
  generateParty: (
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ) => Observable<PartyGenType | null>;
  getAccountInfo: (account: string) => Observable<GetAccountInfoRes>;
  caseRecordId: string;
}) {
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

  // Recipient account holders
  olbTxn.customer2AccountHolderCifId
    ?.split(/[;:]/)
    .forEach((h) => partyKeysToFetch.add(h.trim()));

  // Sender account holders
  olbTxn.customer1AccountHolderCifId
    ?.split(/[;:]/)
    .forEach((h) => partyKeysToFetch.add(h.trim()));

  if (isSenderCibc)
    accountsToFetch.add(emtTxn.senderAccountNumber?.split('-').at(-1)!);

  if (isRecipientCibc)
    accountsToFetch.add(emtTxn.recipientAccountNumber?.split('-').at(-1)!);

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

      if (isIncoming && !isSenderCibc) {
        partyInfoObservables[emtTxn.senderCertapayAccount] = generateParty({
          identifiers: { certapayAccount: emtTxn.senderCertapayAccount },
          contact: { email: emtTxn.senderEmail },
          partyName: { ...parsePartyNameFromEmt(emtTxn.senderName) },
          account: { fiNumber: emtTxn.senderFi },
        });
      }

      if (isOutgoing && !isRecipientCibc) {
        partyInfoObservables[emtTxn.recipientCertapayAccount] = generateParty({
          identifiers: { certapayAccount: emtTxn.recipientCertapayAccount },
          contact: {
            email: emtTxn.recipientEmail,
            contactName: emtTxn.contactName,
          },
          partyName: { ...parsePartyNameFromEmt(emtTxn.recipientName) },
          account: { fiNumber: emtTxn.recipientFi },
        });
      }

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

      if (isIncoming && !isSenderCibc) {
        // INCOMING: Sender is starting action

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
              linkToSub:
                partiesInfo[emtTxn.senderCertapayAccount]?.partyIdentifier!,
              _hiddenPartyKey: null,
              _hiddenGivenName:
                partiesInfo[emtTxn.senderCertapayAccount]?.partyName
                  ?.givenName!,
              _hiddenSurname:
                partiesInfo[emtTxn.senderCertapayAccount]?.partyName?.surname!,
              _hiddenOtherOrInitial:
                partiesInfo[emtTxn.senderCertapayAccount]?.partyName
                  ?.otherOrInitial!,
              _hiddenNameOfEntity:
                partiesInfo[emtTxn.senderCertapayAccount]?.partyName
                  ?.nameOfEntity!,
              wasConductedOnBehalf: false,
              onBehalfOf: [],
              npdTypeOfDevice: olbTxn.userDeviceType || null,
              npdTypeOfDeviceOther: null,
              npdDeviceIdNo: null,
              npdUsername: null,
              npdIp: emtTxn.senderIpAddress || olbTxn.ipAddress || null,
              npdDateTimeSession: olbTxn.userSessionDateTimeStr || null,
              npdTimeZone: null,
            } satisfies Conductor,
          ],
        });
      }

      if (isIncoming && isSenderCibc) {
        // INCOMING: Sender is starting action

        // Get sender account holders
        const senderAccountHolders = accountsInfo[
          emtTxn.senderAccountNumber?.split('-').at(-1)!
        ]?.accountHolders.reduce((acc, holder) => {
          acc.push({
            linkToSub: partiesInfo[holder.partyKey]?.partyIdentifier!,
            _hiddenPartyKey:
              partiesInfo[holder.partyKey]?.identifiers?.partyKey!,
            _hiddenGivenName:
              partiesInfo[holder.partyKey]?.partyName?.givenName!,
            _hiddenSurname: partiesInfo[holder.partyKey]?.partyName?.surname!,
            _hiddenOtherOrInitial:
              partiesInfo[holder.partyKey]?.partyName?.otherOrInitial!,
            _hiddenNameOfEntity:
              partiesInfo[holder.partyKey]?.partyName?.nameOfEntity!,
          });
          return acc;
        }, [] as AccountHolder[]);

        startingActions.push({
          directionOfSA: 'In',
          typeOfFunds:
            'Email money transfer' satisfies FORM_OPTIONS_TYPE_OF_FUNDS,
          typeOfFundsOther: null,
          amount: olbTxn.strSaAmount,
          currency: olbTxn.strSaCurrency,
          fiuNo: '010',
          branch:
            accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!]
              ?.branch ?? '',
          account:
            accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!]
              ?.account ?? '',
          accountType:
            accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!]
              ?.accountType || null,
          accountTypeOther: null,
          accountOpen:
            accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!]
              ?.accountOpen || null,
          accountClose:
            accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!]
              ?.accountClose || null,
          accountStatus:
            accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!]
              ?.accountStatus || null,
          accountCurrency:
            accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!]
              ?.accountCurrency ?? '',
          howFundsObtained: null,
          hasAccountHolders: true,
          accountHolders: senderAccountHolders,
          wasSofInfoObtained: false,
          sourceOfFunds: [],
          wasCondInfoObtained: true,
          conductors: senderAccountHolders?.map(
            ({
              linkToSub,
              _hiddenPartyKey,
              _hiddenGivenName,
              _hiddenSurname,
              _hiddenOtherOrInitial,
              _hiddenNameOfEntity,
            }) => ({
              linkToSub,
              _hiddenPartyKey,
              _hiddenGivenName,
              _hiddenSurname,
              _hiddenOtherOrInitial,
              _hiddenNameOfEntity,
              wasConductedOnBehalf: false,
              onBehalfOf: [],
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
        const senderAccountInfo =
          accountsInfo[emtTxn.senderAccountNumber?.split('-').at(-1)!];

        const senderAccountHolders = olbTxn
          .customer1AccountHolderCifId!.split(/[;:]/)
          .reduce((acc, partyKey) => {
            acc.push({
              linkToSub: partiesInfo[partyKey]?.partyIdentifier!,
              _hiddenPartyKey: partiesInfo[partyKey]?.identifiers?.partyKey!,
              _hiddenGivenName: partiesInfo[partyKey]?.partyName?.givenName!,
              _hiddenSurname: partiesInfo[partyKey]?.partyName?.surname!,
              _hiddenOtherOrInitial:
                partiesInfo[partyKey]?.partyName?.otherOrInitial!,
              _hiddenNameOfEntity:
                partiesInfo[partyKey]?.partyName?.nameOfEntity!,
            });
            return acc;
          }, [] as AccountHolder[]);

        // Conductor information (the person who sent the e-transfer)
        const conductors = [partiesInfo[olbTxn.conductor!]].map(
          (sub) =>
            ({
              linkToSub: sub?.partyIdentifier!,
              _hiddenPartyKey: sub?.identifiers?.partyKey!,
              _hiddenGivenName: sub?.partyName?.givenName!,
              _hiddenSurname: sub?.partyName?.surname!,
              _hiddenOtherOrInitial: sub?.partyName?.otherOrInitial!,
              _hiddenNameOfEntity: sub?.partyName?.nameOfEntity!,
              wasConductedOnBehalf: false,
              onBehalfOf: [],
              npdTypeOfDevice: olbTxn.userDeviceType || null,
              npdTypeOfDeviceOther: null,
              npdDeviceIdNo: null,
              npdUsername: null,
              npdIp: emtTxn.senderIpAddress || olbTxn.ipAddress || null,
              npdDateTimeSession: olbTxn.userSessionDateTimeStr || null,
              npdTimeZone: null,
            }) satisfies Conductor,
        );

        startingActions.push({
          directionOfSA: 'Out',
          typeOfFunds: 'Funds Withdrawal' satisfies FORM_OPTIONS_TYPE_OF_FUNDS,
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

        const recipientAccountHolders = olbTxn
          .customer2AccountHolderCifId!.split(/[;:]/)
          .reduce((acc, partyKey) => {
            acc.push({
              linkToSub: partiesInfo[partyKey]?.partyIdentifier!,
              _hiddenPartyKey: partiesInfo[partyKey]?.identifiers?.partyKey!,
              _hiddenGivenName: partiesInfo[partyKey]?.partyName?.givenName!,
              _hiddenSurname: partiesInfo[partyKey]?.partyName?.surname!,
              _hiddenOtherOrInitial:
                partiesInfo[partyKey]?.partyName?.otherOrInitial!,
              _hiddenNameOfEntity:
                partiesInfo[partyKey]?.partyName?.nameOfEntity!,
            });
            return acc;
          }, [] as AccountHolder[]);

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
          beneficiaries: [
            {
              linkToSub:
                partiesInfo[emtTxn.recipientCertapayAccount]?.partyIdentifier!,
              _hiddenPartyKey: null,
              _hiddenGivenName:
                partiesInfo[emtTxn.recipientCertapayAccount]?.partyName
                  ?.givenName!,
              _hiddenSurname:
                partiesInfo[emtTxn.recipientCertapayAccount]?.partyName
                  ?.surname!,
              _hiddenOtherOrInitial:
                partiesInfo[emtTxn.recipientCertapayAccount]?.partyName
                  ?.otherOrInitial!,
              _hiddenNameOfEntity:
                partiesInfo[emtTxn.recipientCertapayAccount]?.partyName
                  ?.nameOfEntity!,
            },
          ],
        });
      }

      if (isOutgoing && isRecipientCibc) {
        // OUTGOING: Recipient is completing action
        const recipientAccountInfo =
          accountsInfo[emtTxn.recipientAccountNumber?.split('-').at(-1)!];

        // Get recipient account holders if CIBC
        const recipientAccountHolders =
          recipientAccountInfo!.accountHolders.reduce((acc, holder) => {
            acc.push({
              linkToSub: partiesInfo[holder.partyKey]?.partyIdentifier!,
              _hiddenPartyKey:
                partiesInfo[holder.partyKey]?.identifiers?.partyKey!,
              _hiddenGivenName:
                partiesInfo[holder.partyKey]?.partyName?.givenName!,
              _hiddenSurname: partiesInfo[holder.partyKey]?.partyName?.surname!,
              _hiddenOtherOrInitial:
                partiesInfo[holder.partyKey]?.partyName?.otherOrInitial!,
              _hiddenNameOfEntity:
                partiesInfo[holder.partyKey]?.partyName?.nameOfEntity!,
            });
            return acc;
          }, [] as AccountHolder[]);

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

      const { flowOfFundsTransactionDesc } = fofTxn;

      // Build the transformed transaction
      const transformed: StrTransactionWithChangeLogs = {
        // Base StrTransaction fields
        sourceId: 'EMT' satisfies SEARCH_SOURCE_ID,
        wasTxnAttempted: false,
        wasTxnAttemptedReason: null,
        dateOfTxn: olbTxn.flowOfFundsTransactionDate,
        timeOfTxn: olbTxn.flowOfFundsTransactionTime,
        hasPostingDate: !!olbTxn.flowOfFundsPostingDate,
        dateOfPosting: olbTxn.flowOfFundsPostingDate,
        timeOfPosting: null,
        methodOfTxn: 'Online' satisfies FORM_OPTIONS_METHOD_OF_TXN,
        methodOfTxnOther: null,
        reportingEntityTxnRefNo: olbTxn.flowOfFundsAmlTransactionId,
        purposeOfTxn: null,
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
        flowOfFundsTransactionDesc,
        flowOfFundsTransactionTime: olbTxn.flowOfFundsTransactionTime,

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

// Helper to parse party name from EMT data
const parsePartyNameFromEmt = (emtName: string): PartyName => {
  const parts = emtName.trim().split(' ');
  const givenName = parts[0];
  const surname = parts.at(-1)!;
  const otherOrInitial = parts.slice(1, -1).join(' ');

  return {
    surname,
    givenName,
    otherOrInitial,
    nameOfEntity: null,
  };
};
