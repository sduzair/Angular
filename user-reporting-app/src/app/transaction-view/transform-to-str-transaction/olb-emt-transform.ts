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
import { EntityGenType } from './entity-gen.service';

/**
 * Transform OLB/EMT source transactions into StrTransactionWithChangeLogs format
 */
export function transformOlbEmtToStrTransaction({
  olbTxn,
  fofTxn,
  emtTxn,
  generateEntity,
  getAccountInfo,
  caseRecordId,
}: {
  olbTxn: OlbSourceData;
  fofTxn: FlowOfFundsSourceData;
  emtTxn: EmtSourceData;
  generateEntity: (
    entity: Omit<EntityGenType, 'entityIdentifier'>,
  ) => Observable<EntityGenType | null>;
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
      // Fetch all entity info in parallel
      const entitiesInfoObservables: Record<
        string,
        Observable<EntityGenType | null>
      > = {};
      Array.from(partyKeysToFetch).forEach((partyKey) => {
        entitiesInfoObservables[partyKey] = generateEntity({
          partyKey,
        });
      });

      if (isIncoming && !isSenderCibc) {
        entitiesInfoObservables[emtTxn.senderCertapayAccount] = generateEntity({
          certapayAccount: emtTxn.senderCertapayAccount,
          email: emtTxn.senderEmail,
          ...parseEntityNameFromEmt(emtTxn.senderName),
          fiNumber: emtTxn.senderFi,
        });
      }

      if (isOutgoing && !isRecipientCibc) {
        entitiesInfoObservables[emtTxn.recipientCertapayAccount] =
          generateEntity({
            certapayAccount: emtTxn.recipientCertapayAccount,
            email: emtTxn.recipientEmail,
            contactName: emtTxn.contactName,
            ...parseEntityNameFromEmt(emtTxn.recipientName),
            fiNumber: emtTxn.recipientFi,
          });
      }

      return forkJoin({
        entitiesInfo:
          Object.keys(entitiesInfoObservables).length > 0
            ? forkJoin(entitiesInfoObservables)
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
                entitiesInfo[emtTxn.senderCertapayAccount]?.entityIdentifier!,
              _hiddenPartyKey: null,
              _hiddenGivenName:
                entitiesInfo[emtTxn.senderCertapayAccount]?.givenName!,
              _hiddenSurname:
                entitiesInfo[emtTxn.senderCertapayAccount]?.surname!,
              _hiddenOtherOrInitialName:
                entitiesInfo[emtTxn.senderCertapayAccount]?.otherOrInitialName!,
              _hiddenNameOfEntity:
                entitiesInfo[emtTxn.senderCertapayAccount]?.nameOfEntity!,
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
            linkToSub: entitiesInfo[holder.partyKey]?.entityIdentifier!,
            _hiddenPartyKey: entitiesInfo[holder.partyKey]?.partyKey!,
            _hiddenGivenName: entitiesInfo[holder.partyKey]?.givenName!,
            _hiddenSurname: entitiesInfo[holder.partyKey]?.surname!,
            _hiddenOtherOrInitialName:
              entitiesInfo[holder.partyKey]?.otherOrInitialName!,
            _hiddenNameOfEntity: entitiesInfo[holder.partyKey]?.nameOfEntity!,
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
              _hiddenOtherOrInitialName,
              _hiddenNameOfEntity,
            }) => ({
              linkToSub,
              _hiddenPartyKey,
              _hiddenGivenName,
              _hiddenSurname,
              _hiddenOtherOrInitialName,
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
              linkToSub: entitiesInfo[partyKey]?.entityIdentifier!,
              _hiddenPartyKey: entitiesInfo[partyKey]?.partyKey!,
              _hiddenGivenName: entitiesInfo[partyKey]?.givenName!,
              _hiddenSurname: entitiesInfo[partyKey]?.surname!,
              _hiddenOtherOrInitialName:
                entitiesInfo[partyKey]?.otherOrInitialName!,
              _hiddenNameOfEntity: entitiesInfo[partyKey]?.nameOfEntity!,
            });
            return acc;
          }, [] as AccountHolder[]);

        // Conductor information (the person who sent the e-transfer)
        const conductors = [entitiesInfo[olbTxn.conductor!]].map(
          (sub) =>
            ({
              linkToSub: sub?.entityIdentifier!,
              _hiddenPartyKey: sub?.partyKey!,
              _hiddenGivenName: sub?.givenName!,
              _hiddenSurname: sub?.surname!,
              _hiddenOtherOrInitialName: sub?.otherOrInitialName!,
              _hiddenNameOfEntity: sub?.nameOfEntity!,
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
              linkToSub: entitiesInfo[partyKey]?.entityIdentifier!,
              _hiddenPartyKey: entitiesInfo[partyKey]?.partyKey!,
              _hiddenGivenName: entitiesInfo[partyKey]?.givenName!,
              _hiddenSurname: entitiesInfo[partyKey]?.surname!,
              _hiddenOtherOrInitialName:
                entitiesInfo[partyKey]?.otherOrInitialName!,
              _hiddenNameOfEntity: entitiesInfo[partyKey]?.nameOfEntity!,
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
                entitiesInfo[emtTxn.recipientCertapayAccount]
                  ?.entityIdentifier!,
              _hiddenPartyKey: null,
              _hiddenGivenName:
                entitiesInfo[emtTxn.recipientCertapayAccount]?.givenName!,
              _hiddenSurname:
                entitiesInfo[emtTxn.recipientCertapayAccount]?.surname!,
              _hiddenOtherOrInitialName:
                entitiesInfo[emtTxn.recipientCertapayAccount]
                  ?.otherOrInitialName!,
              _hiddenNameOfEntity:
                entitiesInfo[emtTxn.recipientCertapayAccount]?.nameOfEntity!,
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
              linkToSub: entitiesInfo[holder.partyKey]?.entityIdentifier!,
              _hiddenPartyKey: entitiesInfo[holder.partyKey]?.partyKey!,
              _hiddenGivenName: entitiesInfo[holder.partyKey]?.givenName!,
              _hiddenSurname: entitiesInfo[holder.partyKey]?.surname!,
              _hiddenOtherOrInitialName:
                entitiesInfo[holder.partyKey]?.otherOrInitialName!,
              _hiddenNameOfEntity: entitiesInfo[holder.partyKey]?.nameOfEntity!,
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
        entities: Object.values(entitiesInfo) as EntityGenType[],
      };
    }),
  );
}

// Helper to parse entity name from EMT data
const parseEntityNameFromEmt = (emtName: string) => {
  const parts = emtName.trim().split(' ');
  const givenName = parts[0];
  const surname = parts.at(-1)!;
  const otherOrInitialName = parts.slice(1, -1).join(' ');

  return {
    surname,
    givenName,
    otherOrInitialName,
    nameOfEntity: null,
  };
};
