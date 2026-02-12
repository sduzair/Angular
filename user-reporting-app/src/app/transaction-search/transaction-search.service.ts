import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay, timer } from 'rxjs';
// import { SUBJECT_INFO_BY_PARTY_KEY_DEV_OR_TEST_ONLY_FIXTURE } from '../aml/case-record.state.fixture';
import { ReviewPeriod } from '../aml/case-record.store';
import { TableSelectionType } from '../transaction-view/transaction-view.component';
import { SourceSysRefreshTimeData } from './source-refresh-selectable-table/source-refresh-selectable-table.component';
// import { TRANSACTION_SEARCH_RES_DEV_ONLY } from './transaction-search.data.fixture';
// import { ACCOUNT_INFO_BY_AML_ID_DEV_OR_TEST_ONLY_FIXTURE } from '../aml/case-record.state.fixture';

@Injectable({
  providedIn: 'root',
})
export class TransactionSearchService {
  private http = inject(HttpClient);

  getAmlPartyAccountInfo(amlId: string) {
    // return timer(1000).pipe(
    //   map(() => ACCOUNT_INFO_BY_AML_ID_DEV_OR_TEST_ONLY_FIXTURE),
    // );
    return this.http.get<GetAmlPartyAccountInfoRes>(
      `/api/aml/${amlId}/partyaccountinfo`,
    );
  }

  private cachedObservablesGetPartyInfo = new Map<
    string,
    Observable<GetPartyInfoRes>
  >();

  getPartyInfo(partyKey: string) {
    // return timer(100).pipe(
    //   map(() => {
    //     return SUBJECT_INFO_BY_PARTY_KEY_DEV_OR_TEST_ONLY_FIXTURE.find(
    //       (sub) => sub._hiddenPartyKey === _hiddenPartyKey,
    //     );
    //   }),
    // );
    if (!this.cachedObservablesGetPartyInfo.has(partyKey)) {
      const request$ = this.http
        .get<GetPartyInfoRes>(`/api/aml/partyinfo/${partyKey}`)
        .pipe(shareReplay(1));

      this.cachedObservablesGetPartyInfo.set(partyKey, request$);
    }

    return this.cachedObservablesGetPartyInfo.get(partyKey)!;
  }

  static getProductInfo() {
    return [
      {
        productCode: 'ACBS',
        productDescription: 'Advanced Commercial Banking System',
      },
      { productCode: 'ABL', productDescription: 'Asset-Based Loan' },
      {
        productCode: 'BONY',
        productDescription: 'Book-Only Net Yield Instrument',
      },
      {
        productCode: 'BUF',
        productDescription: 'Business and Farm Loan Insurance',
      },
      { productCode: 'CRSP', productDescription: 'Retirement Savings Plan' },
      { productCode: 'CAMF', productDescription: 'Mutual Funds' },
      {
        productCode: 'TALG',
        productDescription: 'Portfolio Management and Research',
      },
      { productCode: 'XMTG', productDescription: 'Residential Mortgage' },
      { productCode: 'XDEP', productDescription: 'Smart Deposit Account' },
      { productCode: 'ACC', productDescription: 'Auto Financing Loan' },
      { productCode: 'FINT', productDescription: 'Home Improvement Loan' },
      { productCode: 'DDEP', productDescription: 'Demand Deposit Account' },
      { productCode: 'SAVG', productDescription: 'Savings Deposit Account' },
      {
        productCode: 'MMDA',
        productDescription: 'Money Market Deposit Account',
      },
      { productCode: 'DBCD', productDescription: 'Debit Card Account' },
      { productCode: 'LNPL', productDescription: 'Personal Installment Loan' },
      { productCode: 'LNAU', productDescription: 'Auto Loan' },
      { productCode: 'LNMT', productDescription: 'Mortgage Loan' },
      { productCode: 'LNHE', productDescription: 'Home Equity Line of Credit' },
      { productCode: 'CRMC', productDescription: 'Credit Card - MasterCard' },
    ];
  }

  fetchSourceRefreshTime() {
    return timer(1000).pipe(
      map(() =>
        TransactionSearchService.getSourceSystemInfo().map(
          (src) =>
            ({
              sourceSys: src,
              refresh: new Date(),
              isDisabled: false,
            }) as SourceSysRefreshTimeData,
        ),
      ),
    );
  }

  static getSourceSystemInfo() {
    return [
      'Party KYC',
      'Flow of Funds',
      'Conductor KYC',
      'Product Inventory',
      'Cheque',
      'ABM',
      'OLB',
      'EMT',
      'BPSA',
      'CI',
      'FX',
      'TSYS',
      'EFT',
      'EMTs',
      'FXCASHPM',
      'FXMP',
      'GMT',
      'OTC',
      'POS',
      'Wires',
    ];
  }

  searchTransactions(searchParams: TransactionSearchRequest) {
    // return of(TRANSACTION_SEARCH_RES_DEV_ONLY).pipe(delay(200));
    return this.http.post<TransactionSearchResponse>(
      '/api/transaction/search',
      searchParams,
    );
  }

  private cachedObservablesGetAccountInfo = new Map<
    string,
    Observable<GetAccountInfoRes>
  >();

  getAccountInfo(accountNumber: string | number) {
    // return timer(1000).pipe(
    //   map(() => ACCOUNT_INFO_BY_AML_ID_DEV_OR_TEST_ONLY_FIXTURE),
    // );

    if (!this.cachedObservablesGetAccountInfo.has(String(accountNumber))) {
      const request$ = this.http
        .get<GetAccountInfoRes>(`/api/aml/accountinfo/${accountNumber}`)
        .pipe(shareReplay(1));

      this.cachedObservablesGetAccountInfo.set(String(accountNumber), request$);
    }

    return this.cachedObservablesGetAccountInfo.get(String(accountNumber))!;
  }
}

export interface GetAccountInfoRes {
  id: string;
  fiuNo: string;
  branch: string;
  account: string;
  accountType: string;
  accountTypeOther: null;
  accountOpen: string;
  accountClose: string;
  accountStatus: string;
  accountCurrency: string;
  accountHolders: {
    partyKey: string;
  }[];
}

export interface AccountNumberSelection {
  transit: string;
  account: string;
}

interface TransactionSearchRequest {
  partyKeysSelection: string[];
  accountNumbersSelection: AccountNumberSelection[];
  sourceSystemsSelection: string[];
  productTypesSelection: string[];
  reviewPeriodSelection: ReviewPeriod[];
}

export type SEARCH_SOURCE_ID = TransactionSearchResponse[number]['sourceId'];

export type TransactionSearchResponse = (
  | {
      sourceId: 'FlowOfFunds';
      status: 'completed' | 'failed';
      sourceData: FlowOfFundsSourceData[];
    }
  | {
      sourceId: 'ABM';
      status: 'completed' | 'failed';
      sourceData: AbmSourceData[];
    }
  | {
      sourceId: 'OLB';
      status: 'completed' | 'failed';
      sourceData: OlbSourceData[];
    }
  | {
      sourceId: 'EMT';
      status: 'completed' | 'failed';
      sourceData: EmtSourceData[];
    }
  | {
      sourceId: 'Wire';
      status: 'completed' | 'failed';
      sourceData: WireSourceData[];
    }
  | {
      sourceId: 'OTC';
      status: 'completed' | 'failed';
      sourceData: OTCSourceData[];
    }
  | {
      sourceId: 'POS';
      status: 'completed' | 'failed';
      sourceData: POSSourceData[];
    }
)[];

export type FlowOfFundsSourceData = {
  sourceId: string;
  flowOfFundsAccountCurrency?: string | null;
  flowOfFundsAmlId: number | null;
  flowOfFundsAmlTransactionId: string | null;
  flowOfFundsCasePartyKey: number | null;
  flowOfFundsConductorPartyKey: number | null;
  flowOfFundsCreditAmount: number | null;
  flowOfFundsCreditedAccount: string | null;
  flowOfFundsCreditedTransit: string | null;
  flowOfFundsDebitAmount: number | null;
  flowOfFundsDebitedAccount: string | null;
  flowOfFundsDebitedTransit: string | null;
  flowOfFundsPostingDate: string | null;
  flowOfFundsSource: string;
  flowofFundsSourceTransactionId: string;
  flowOfFundsTransactionCurrency: string;
  flowOfFundsTransactionCurrencyAmount: number;
  flowOfFundsTransactionDate: string;
  flowOfFundsTransactionDesc: string;
  flowOfFundsTransactionTime: string;
  _mongoid?: string;
} & TableRecordUiProps &
  TableSelectionType;

export type EmtSourceData = {
  sourceId: string;
  amlId: number;
  amount: string;
  caseEcif: string;
  conductorEcif: string | null;
  contactEmail: string | null;
  contactHandleUsed: string;
  _hiddenGivenName?: string;
  _hiddenOtherName?: string;
  _hiddenSurname?: string;
  contactIdentifier: string | null;
  contactMobile: null;
  contactName: string;
  cur: string;
  depositedTimeDate: string;
  depositedTimeTime: string;
  depositedTime: string;
  etFwdFlag: string;
  f2RDepDate: string;
  f2RIndicator: null;
  f2rDeptime: string;
  fiRefCode: string;
  id: null;
  initiatedTime: string;
  jointAccountFlag: null;
  originalFiRefCode: string;
  _hiddenRecepientTransit?: number | null;
  _hiddenRecepientAccount?: number | null;
  _hiddenRecipientAccountNumberFiu?: string;
  _hiddenRecipientAccountNumberTransit?: string;
  _hiddenRecipientAccountNumberAccount?: string;
  recipientAccountName: string | null;
  recipientAccountNumber: string | null;
  recipientCertapayAccount: string;
  recipientEmail: string;
  recipientFi: string;
  recipientFiNumber: string;
  recipientIpAddress: null;
  recipientMobile: string | null;
  recipientName: string;
  recipientPhoneNumber: null;
  _hiddenFullName?: string | null;
  _hiddenSenderAccountNameGiven?: string;
  _hiddenSenderAccountNameSurname?: string;
  senderAccountName: string | null;
  _hiddenSenderAccountNumberTransit?: string;
  _hiddenSenderAccountNumberAccount?: string;
  _hiddenSenderTransit?: number;
  _hiddenSenderAccount?: number;
  _hiddenSenderBranch?: number;
  senderAccountNumber: string | null;
  senderCertapayAccount: string;
  senderEmail: string;
  senderFi: string;
  senderFiNumber: string;
  senderIpAddress: string | null;
  senderName: string;
  senderPhone: null;
  senderTypeConductorEcifFlag: boolean | null;
  tranType: string;
  transferDetails: string | null;
  _mongoid: string;
} & TableRecordUiProps &
  TableSelectionType;

export type OlbSourceData = {
  sourceId: string;
  accountCurrency: string;
  accountNumber: null;
  acctCurrAmount: number;
  acctHoldersAll: string;
  actualCurrencyCD: string;
  amlld: number;
  amlTransactionId: string;
  cardNumber: string;
  caseAccountNumber: string;
  caseEcif: string;
  caseTransitNumber: string;
  channelCd: string;
  conductor: string | null;
  crdrCode: string;
  creditAmount: number;
  creditedAccount: string;
  creditedTransit: string;
  creditorId: null;
  currencyConversionRate: null;
  cust2AddrCityTown: null;
  cust2AddrPostalZipCode: null;
  cust2AddrProvStateName: null;
  cust2OrgLegalName: null;
  customer1AccountHolderCifId: string | null;
  customer1AccountStatus: string | null;
  customer2AccountCurrencyCode: string | null;
  customer2AccountHolderCifId: string | null;
  customer2AccountStatus: string | null;
  debitAmount: null;
  debitedAccount: null;
  debitedTransit: null;
  flowOfFundsAccountCurrency: string;
  flowOfFundsAmlId: number;
  flowOfFundsAmlTransactionId: string;
  flowOfFundsCasePartyKey: number;
  flowOfFundsConductorPartyKey: null;
  flowOfFundsCreditAmount: number;
  flowOfFundsCreditedAccount: string;
  flowOfFundsCreditedTransit: string;
  flowOfFundsDebitAmount: null;
  flowOfFundsDebitedAccount: null;
  flowOfFundsDebitedTransit: null;
  flowOfFundsPostingDate: string;
  flowOfFundsSource: string;
  flowOfFundsSourceTransactionId: string;
  flowOfFundsTransactionCurrency: string;
  flowOfFundsTransactionCurrencyAmount: number;
  flowOfFundsTransactionDate: string;
  flowOfFundsTransactionDesc: null;
  flowOfFundsTransactionTime: string;
  executionLocalDateTime: number;
  holdingBranchKey: null;
  ipAddress: null;
  messageTypeCode: number;
  operationType: string;
  oppAccountNumber: number;
  oppBranchKey: number;
  oppOrganizationUnitCd: string;
  organizationUnitCd: string;
  origCurrAmount: number;
  origCurrCd: string;
  postingDate: string;
  processingDate: string;
  rowUpdateDate: number;
  rulesCADEquivalentAmt: number;
  sourceTransactionId: string;
  splittableColumnValue: number;
  splittingDelimiter: string;
  strCaAccount: null;
  strCaAccountCurrency: string;
  strCaAccountHolderCifId: null;
  strCaAccountStatus: null;
  strCaAmount: number;
  strCaBeneficiaryInd: string;
  strCaBranch: null;
  strCaCurrency: string;
  strCaDispositionType: string;
  strCaDispositionTypeOpp: null;
  strCaDispositionTypeOther: null;
  strCaDispositionTypeOtherOpp: null;
  strCaFiNumber: null;
  strCaInvolvedInInd: string;
  strReportingEntity: string;
  strReportingEntityOpp: null;
  strSaAccount: null;
  strSaAccountCurrency: string;
  strSaAccountHoldersCifId: null;
  strSaAccountStatus: null;
  strSaAmount: number;
  strSaBranch: null;
  strSaConductorInd: null;
  strSaCurrency: string;
  strSaDirection: string;
  strSaDirectionOp: null;
  strSaFiNumber: null;
  strSaFundingSourceInd: string;
  strSaFundsType: null;
  strSaFundsTypeOpp: null;
  strSaFundsTypeOther: null;
  strSaFundsTypeOtherOpp: null;
  strSaOboInd: string;
  strSaPostingDate: string;
  strTransactionStatus: string;
  thirdPartyCifId: null;
  transactionCurrency: string;
  transactionCurrencyAmount: number;
  transactionDate: string;
  transactionDescription: string;
  transactionDescriptionBase: string;
  transactionId: string;
  transactionTime: string;
  userDeviceType: string;
  userSessionDateTime: null;
  userSessionDateTimeStr: null;
  additionalDescription: string;
  _mongoid: string;
} & TableRecordUiProps &
  TableSelectionType;

export type AbmSourceData = {
  sourceId: string;
  accountCurrency: string;
  accountNumber: string;
  acctCurrAmount: number;
  acctHoldersAll: string;
  actualCurrencyCD: string;
  amlId: number;
  amlTransactionId: string;
  amountFlow: null;
  atmNearestTransit: string;
  atmPostalCode: string;
  canadianEquivalentAmount: number;
  cardNumber: string;
  caseAccountNumber: string;
  caseEcif: string;
  caseTransitNumber: string;
  cashAmount: string;
  channelCd: string;
  conductor: string;
  crdrCode: string;
  creditAmount: number;
  creditedAccount: string;
  creditedTransit: string;
  creditorId: string;
  customer1AccountHolderCifId: string;
  customer1AccountStatus: string;
  customer2AccountCurrencyCode: null;
  customer2AccountHolderCifId: null;
  customer2AccountStatus: null;
  debitAmount: null;
  debitedAccount: null;
  debitedTransit: null;
  depositContents: string;
  depositContentsDesc: string;
  exchangeRateApplied: null;
  flowOfFundsAccountCurrency: string;
  flowOfFundsAmlId: number;
  flowOfFundsAmlTransactionId: string;
  flowOfFundsCasePartyKey: number;
  flowOfFundsConductorPartyKey: number;
  flowOfFundsCreditAmount: number;
  flowOfFundsCreditedAccount: string;
  flowOfFundsCreditedTransit: string;
  flowOfFundsDebitAmount: null;
  flowOfFundsDebitedAccount: null;
  flowOfFundsDebitedTransit: null;
  flowOfFundsPostingDate: string;
  flowOfFundsSource: string;
  flowofFundsSourceTransactionId: string;
  flowOfFundsTransactionCurrency: string;
  flowOfFundsTransactionCurrencyAmount: number;
  flowOfFundsTransactionDate: string;
  flowOfFundsTransactionDesc: null;
  flowOfFundsTransactionTime: string;
  executionLocalDateTime: number;
  holdingBranchKey: string;
  isoMessageType: number;
  merchantName: null;
  numberOfDeposit: number;
  oppAccountNumber: null;
  oppProdType: null;
  oppTransitNumber: null;
  origCurrAmount: number;
  origcurrCashAmount: number;
  origCurrencyCD: string;
  postingDate: string;
  processingDate: string;
  rowUpdateDate: number;
  sequenceNumberDescr: string;
  sourceTransactionId: string;
  splittableColumnValue: number;
  splittingDelimiter: string;
  strCaAccount: number | null;
  strCaAccountCurrency: string;
  strCaAccountHolderCifId: string | null;
  strCaAccountStatus: string;
  strCaAmount: number;
  strCaBeneficiaryInd: string;
  strCaBranch: number;
  strCaCurrency: string;
  strCaDispositionType: string;
  strCaDispositionTypeOpp: null;
  strCaDispositionTypeOther: null;
  strCaDispositionTypeOtherOpp: null;
  strCaFiNumber: string;
  strCaInvolvedInCifId: null;
  strCaInvolvedInInd: string;
  strReportingEntity: string;
  strReportingEntityOpp: string;
  strSaAccount: number | null;
  strSaAccountCurrency: null;
  strSaAccountHoldersCifId: string | null;
  strSaAccountStatus: null;
  strSaAmount: number;
  strSaBranch: null;
  strSaConductorInd: string;
  strSaCurrency: string;
  strSaDirection: string;
  strSaDirectionOpp: null;
  strSaFiNumber: null;
  strSaFundingSourceInd: string;
  strSaFundsType: string;
  strSaFundsTypeOpp: null;
  strSaFundsTypeOther: null;
  strSaFundsTypeOtherOpp: null;
  strSaOboInd: string;
  strSaPostingDate: null;
  strSaPurposeOfTransaction: null;
  strTransactionStatus: string;
  terminalCity: string;
  terminalCountry: null;
  terminalId: string;
  terminalNameLoc: string;
  terminalStation: string;
  thirdPartyCifId: null;
  transactionCurrency: string;
  transactionCurrencyAmount: number;
  transactionDate: string;
  transactionDescription: string;
  transactionExecutionLocalTimestamp: string;
  transactionld: string;
  transactionTime: string;
  txnType: number;
  _mongoid?: string;
} & TableRecordUiProps &
  TableSelectionType;

export interface WireSourceData {
  _hiddenDate: string;
  _hiddenTime: string;
  _hiddenAccount: number;
  _hiddenTransit: number;
  _hiddenAmount: number;
  _hiddenCurrency: string;
  _hiddenReceiverName: string;
  _hiddenReceiverAddress: string;
  _hiddenSenderName: string;
  _hiddenSenderStreet: string;
  _hiddenSenderCity: string;
  _hiddenSenderPostalCode: string | null;
  _hiddenSenderCountry: string;
  _hiddenSenderAccount: string;
  account: number;
  accountCurrencyAmount: number;
  accountCurrencyCd: string;
  accountNumber: number;
  acctHoldersAll: string;
  amlld: number;
  amlTransactionId: string;
  awiBic: string;
  bcAccount1d: string;
  bcName: string;
  branchTransitAccount: null;
  cardNumber: null;
  caseAccountNumber: number;
  caseEcif: number;
  caseTransitNumber: number;
  channelCd: string;
  clientToClientTransferIndicator: string;
  conductorKey: null;
  crdrCode: string;
  createDatetime: string;
  creditorld: string;
  currencyConversionRate: null;
  custld: null;
  customer1AccountHolderCifId: string | null;
  customer1AccountStatus: string;
  customer2AccountHolderCifId: string | null;
  customer2AccountStatus: null;
  deviceType: null;
  ecifMatchLeve1: string;
  flowOfFundsAccountCurrency: string;
  flowOfFundsAmlId: number;
  flowOfFundsAmlTransactionId: string;
  flowOfFundsCasePartyKey: number;
  flowOfFundsConductorPartyKey: null;
  flowOfFundsCreditAmount: number;
  flowOfFundsCreditedAccount: number;
  flowOfFundsCreditedTransit: number;
  flowOfFundsDebitAmount: null;
  flowOfFundsDebitedAccount: null;
  flowOfFundsDebitedTransit: null;
  flowOfFundsPostingDate: string;
  flowOfFundsSource: string;
  flowOfFundsSourceTransactionId: string;
  flowOfFundsTransactionCurrency: string;
  flowOfFundsTransactionCurrencyAmount: number;
  flowOfFundsTransactionDate: string;
  flowOfFundsTransactionDesc: string;
  flowOfFundsTransactionTime: string;
  holdingBranchKey: number;
  ipAddress: null;
  loanNumber: null;
  matchLevelReceiver: string;
  mnatchLevelSender: null;
  msgTag32: string;
  msgTag33: string;
  msgTag50: string;
  msgTag53: null;
  msgTag54: null;
  msgTag56: null;
  msgTag59: string;
  msgTag70: string;
  ocAccountId: string;
  ocName: string;
  oiBic: string;
  operationType: string;
  origCurrAmount: number;
  origCurrencyCd: string;
  payeeAddress: string;
  payerAddress: string;
  postingDate: string;
  processingDate: string;
  rowUpdateDate: string;
  rulesCadEquivalentAmt: number;
  selfTransfer: string;
  settledAmt: number;
  sourceClientId: null;
  sourceTransaction1d: string;
  splittableColumnValue: number;
  splittingDelimiter: string;
  strCaAccount: number;
  strCaAccountCurrency: string;
  strCaAccountHolderCifId: string;
  strCaAccountStatus: string;
  strCaAmount: number;
  strCaBeneficiaryInd: string;
  strCaBranch: number;
  strCaCurrency: string;
  strCaDispositionType: string;
  strCaDispositionTypeOther: null;
  strCaInvolvedInCifId: null;
  strCaInvolvedInInd: null;
  strCaFiNumber: string;
  strReportingEntity: string;
  strSaAccount: string;
  strSaAccountCurrency: null;
  strSaAccountHoldersCifId: null;
  strSaAccountStatus: null;
  strSaAmount: number;
  strSaBranch: null;
  strSaConductorInd: string;
  strSaCurrency: string;
  strSaDirectIon: string;
  strSaFiNumber: string;
  strSaFundingSourceInd: null;
  strSaFundsType: null;
  strSaFundsTypeOther: null;
  strSaOboInd: null;
  strSaPostingDate: null;
  strSaPurposeOfTransaction: string;
  strTransactionStatus: string;
  swiftTag20SendersReference: number;
  _hiddenSenderOrderingInsName: string;
  _hiddenSenderOrderingInsStreet: string;
  _hiddenSenderOrderingInsCity: string;
  swiftTag52OrderingInstitution: string;
  swiftTag57AccountWithInstitution: string;
  thirdPartyC1fId: null;
  transactionDate: string;
  transactionld: string;
  transactionTime: string;
  transit: number;
  txnCode: string;
  txnOrigFeed: string;
  txnStatus: string;
  uniqueReferenceNo: string;
  userDeviceType: null;
  userSessionDatetime: null;
  wireRole: string;
}

export interface OTCSourceData {
  accountCurrency: string;
  accountNumber: string;
  acctCurrAmount: number;
  acctHoldersAll: string;
  actualCurrencyCD: string;
  aggregatedCheques: number;
  amlId: number;
  branchTransit: number;
  cardNumber: string;
  caseAccountNumber: string;
  caseEcif: string;
  caseTransitNumber: string;
  cdtAcctShortName: string;
  channelCd: string;
  chequeBreakdown: string;
  conductor: string;
  crdrCode: string;
  creditAmount: number;
  creditedAccount: string;
  creditedTransit: string;
  creditorId: string;
  customer1AccountHolderCifId: string;
  customer1AccountStatus: string;
  customer2AccountCurrencyCode: null;
  customer2AccountHolderCifId: null;
  customer2AccountStatus: null;
  dbtAcctShortName: string;
  debitAmount: null;
  debitedAccount: null;
  debitedTransit: null;
  flowOfFundsAccountCurrency: string;
  flowOfFundsAmlId: number;
  flowOfFundsAmlTransactionId: string;
  flowOfFundsCasePartyKey: number;
  flowOfFundsConductorPartyKey: number;
  flowOfFundsCreditAmount: number;
  flowOfFundsCreditedAccount: string;
  flowOfFundsCreditedTransit: string;
  flowOfFundsDebitAmount: null;
  flowOfFundsDebitedAccount: null;
  flowOfFundsDebitedTransit: null;
  flowOfFundsPostingDate: string;
  flowOfFundsSource: string;
  flowOfFundsSourceTransactionId: string;
  flowOfFundsTransactionCurrency: string;
  flowOfFundsTransactionCurrencyAmount: number;
  flowOfFundsTransactionDate: string;
  flowOfFundsTransactionDesc: string;
  flowOfFundsTransactionTime: string;
  executionLocalDateTime: number;
  holdingBranchKey: string;
  oppAccountNumber: null;
  oppProdType: null;
  oppTransitNumber: null;
  origCurrAmount: number;
  origcurrCashAmount: number;
  origCurrencyCD: string;
  postingDate: string;
  processingDate: string;
  rowUpdateDate: number;
  sequenceNumberDescr: string;
  sourceTransactionId: string;
  splittableColumnValue: number;
  splittingDelimiter: string;
  strCaAccount: number;
  strCaAccountCurrency: string;
  strCaAccountHolderCifId: string | null;
  strCaAccountStatus: string;
  strCaAmount: number;
  strCaBeneficiaryInd: string;
  strCaBranch: number;
  strCaCurrency: string;
  strCaDispositionType: string;
  strCaDispositionTypeOpp: null;
  strCaDispositionTypeOther: null;
  strCaDispositionTypeOtherOpp: null;
  strCaFiNumber: string;
  strCaInvolvedInCifId: null;
  strCaInvolvedInInd: string;
  strReportingEntity: string;
  strReportingEntityOpp: string;
  strSaAccount: null;
  strSaAccountCurrency: null;
  strSaAccountHoldersCifId: string | null;
  strSaAccountStatus: null;
  strSaAmount: number;
  strSaBranch: null;
  strSaConductorInd: string;
  strSaCurrency: string;
  strSaDirection: string;
  strSaDirectionOpp: null;
  strSaFiNumber: null;
  strSaFundingSourceInd: string;
  strSaFundsType: string;
  strSaFundsTypeOpp: null;
  strSaFundsTypeOther: null;
  strSaFundsTypeOtherOpp: null;
  strSaOboInd: string;
  strSaPostingDate: null;
  strSaPurposeOfTransaction: null;
  strTransactionStatus: string;
  systemJournalId: null;
  tellerId: null;
  transactionCurrency: string;
  transactionCurrencyAmount: number;
  transactionDate: string;
  transactionDescription: string;
  transactionExecutionLocalTimestamp: string;
  transactionId: string;
  transactionTime: string;
  sourceId: string;
}

export interface POSSourceData {
  _mongoid: string;
  _hiddenDate: string;
  _hiddenTime: string;
  _hiddenAccount: number;
  _hiddenTransit: number;
  _hiddenAmount: number;
  _hiddenCurrency: string;
  _hiddenCIF: number;
  _hiddenCardNumber: string;
  _hiddenMerchantName: string;
  _hiddenMerchantSIC: number;
  _hiddenAreaCode: number;
  _hiddenMerchantCity: string;
  _hiddenSequence: string;
  accountCurrencyAmount: number;
  accountCurrencyCD: string;
  accountNumber: number;
  acctHoldersAll: string;
  additionalDescription: string;
  amlId: number;
  cardAcceptorTerminalId: null;
  cardNumber: string;
  caseAcccountNumber: null;
  caseEcif: number;
  caseTransitNumber: number;
  cnpRefundIndicator: string;
  conductor: number;
  crDrCode: string;
  creditorld: null;
  cryptolndicator: string;
  customer1AccountHolderCifId: number;
  customer1AccountStatus: string;
  executionLocalDataTime: number;
  flowOfFundsAccountCurrency: string;
  flowOfFundsAmlId: number;
  flowOfFundsAmlTransactionId: string;
  flowOfFundsCaseEcif: number;
  flowOfFundsConductorEcif: number;
  flowOfFundsCreditAmount: null;
  flowOfFundsCreditedAccount: null;
  flowOfFundsCreditedTransit: null;
  flowOfFundsDebitAmount: number;
  flowOfFundsDebitedAccount: number;
  flowOfFundsDebitedTransit: number;
  flowOfFundsPostingDate: string;
  flowOfFundsSource: string;
  flowOfFundsSourceId: string;
  flowOfFundsTransactionCurrency: string;
  flowOfFundsTransactionCurrencyAmount: number;
  flowOfFundsTransactionDate: string;
  _hiddenIsGambling: boolean;
  _hiddenIsService: boolean;
  flowOfFundsTransactionDesc: string;
  flowOfFundsTransactionTime: string;
  fxTranExchangeRate: null;
  holdingBranchKey: number;
  indicatorTags: null;
  lineOfBusiness: string;
  merchantCity: string;
  merchantCountry: string;
  merchantName: string;
  merchantNumber: null;
  merchantPostalCode: null;
  merchantProvince: number;
  merchantSICCode: number;
  merchantStreetAddress: null;
  msgTypeCode: string;
  octBankCountry: string;
  octBankIdentifier: null;
  octBankName: null;
  octIntermediaryBankAddress: null;
  octIntermediaryBankCity: null;
  octIntermediaryBankPostalCode: null;
  octIntermediaryBankProvince: null;
  octSenderAcountNumber: null;
  octSenderCity: null;
  octSenderCountry: null;
  octSenderName: null;
  octSenderPostalCode: null;
  octSenderProvinceNane: null;
  octSenderStreetAddress: null;
  origCurrencyAmount: number;
  originCurrencyCD: string;
  postingDate: string;
  processingDate: string;
  puposeOfPayment: null;
  rowUpdateData: number;
  rulesCadEquivalentAmt: number;
  sequenceNumber: string;
  splittableColumnVaIue: number;
  splittingDe1imiter: string;
  strCaAccount: null;
  strCaAccountCurrency: null;
  strCaAccountHolderCifId: string | null;
  strCaAccountStatus: null;
  strCaAmount: number;
  strCaBeneficiaryInd: string;
  strCaBranch: null;
  strCaCurrency: string;
  strCaDispositionType: string;
  strCaDispositionTypeOther: string;
  strCaFiNumber: null;
  strCaInvolvedInCifId: null;
  strCaInvolvedInInd: string;
  strCadEquivalentAmount: null;
  strReportingEntity: number;
  strSaAccount: number;
  strSaAccountCurrency: string;
  strSaAccountHoldersCifId: number;
  strSaAccountStatus: string;
  strSaAmount: number;
  strSaBranch: number;
  strSaConductorInd: string;
  strSaCurrency: string;
  strSaDirection: string;
  strSaFiNumber: string;
  strSaFundingSourceInd: string;
  strSaFundsType: string;
  strSaFundsTypeOther: null;
  strSaOboInd: string;
  strSaPostingDate: null;
  strSaPurposeOfTransaction: null;
  strTransactionStatus: string;
  terminalOwnerName: string;
  thirdPartyCifld: null;
  transactionCurrencyAmount: number;
  transactionDate: string;
  transactionExecutionLocalTimestamp: string;
  transactionld: string;
  transactionMemoLine2: string;
  transactionMemoLine3: string;
  transactionTime: string;
  visaCredit: null;
  sourceId: string;
}

export type SourceData =
  TransactionSearchResponse[number]['sourceData'][number];

interface TableRecordUiProps {
  _uiPropHighlightColor?: string;
}

interface GetAmlPartyAccountInfoRes {
  amlId: string;
  partyKeys: {
    partyKey: string;
    accountModels: {
      accountTransit?: string;
      accountNumber: string;
    }[];
  }[];
}

export interface GetPartyInfoRes {
  partyKey: string;
  surname: string;
  givenName: string;
  otherOrInitial: string;
  nameOfEntity: string;
}
