import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, timer, map, of } from "rxjs";
import { TableRecordUiProps } from "../base-table/abstract-base-table";
import { TableSelectionCompareWithAmlTxnId } from "../transaction-view/transaction-view.component";
import { transactionSearchResDevOnly } from "../transaction-view/transactionSearchResDevOnly";

@Injectable({
  providedIn: "root",
})
export class AmlTransactionSearchService {
  constructor(private http: HttpClient) {}

  fetchSourceRefreshTime(): Observable<SourceSysRefreshTime[]> {
    return timer(1000).pipe(
      map(() =>
        AmlTransactionSearchService.getSourceSystemInfo().map((src) => ({
          value: src,
          refresh: new Date(),
          isDisabled: false,
        })),
      ),
    );
  }
  static getSourceSystemInfo() {
    return [
      "Party KYC",
      "Flow of Funds",
      "Conductor KYC",
      "Product Inventory",
      "Cheque",
      "ABM",
      "OLB",
      "EMT",
      "BPSA",
      "CI",
      "FX",
      "TSYS",
      "EFT",
      "EMTs",
      "FXCASHPM",
      "FXMP",
      "GMT",
      "OTC",
      "POS",
      "Wires",
    ];
  }

  fetchTransactionSearch(amlId: string) {
    return of(transactionSearchResDevOnly);
    // return this.http.get<TransactionSearchResponse>("/api/transactionsearch");
  }
}

export type SourceSys = {
  value: string;
};

export type SourceSysRefreshTime = {
  value: string;
  refresh?: string | Date;
  isDisabled: boolean;
};

export type AccountNumber = {
  value: string;
};

export type PartyKey = {
  value: string;
};

export type TransactionSearchResponse = Array<
  | {
      sourceId: "FlowOfFunds";
      status: "completed" | "failed";
      sourceData: FlowOfFundsSourceData[];
    }
  | {
      sourceId: "ABM";
      status: "completed" | "failed";
      sourceData: AbmSourceData[];
    }
  | {
      sourceId: "OLB";
      status: "completed" | "failed";
      sourceData: OlbSourceData[];
    }
  | {
      sourceId: "EMT";
      status: "completed" | "failed";
      sourceData: EmtSourceData[];
    }
>;

export type FlowOfFundsSourceData = {
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
  flowOfFundsTransactionDesc: string;
  flowOfFundsTransactionTime: string;
  _mongoid: string;
} & TableRecordUiProps &
  TableSelectionCompareWithAmlTxnId;

export type EmtSourceData = {
  amlId: number;
  amount: string;
  caseEcif: string;
  conductorEcif: null;
  contactEmail: null;
  contactHandleUsed: string;
  _hiddenGivenName: string;
  _hiddenOtherName: string;
  _hiddenSurname: string;
  contactIdentifier: string;
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
  recipientAccountName: string;
  recipientAccountNumber: string;
  recipientCertapayAccount: string;
  recipientEmail: string;
  recipientFi: string;
  recipientFiNumber: string;
  recipientIpAddress: null;
  recipientMobile: string;
  recipientName: string;
  recipientPhoneNumber: null;
  _hiddenSenderAccountNameGiven: string;
  _hiddenSenderAccountNameSurname: string;
  senderAccountName: string;
  _hiddenSenderAccountNumberTransit: string;
  _hiddenSenderAccountNumberAccount: string;
  senderAccountNumber: string;
  senderCertapayAccount: string;
  senderEmail: string;
  senderFi: string;
  senderFiNumber: string;
  senderIpAddress: string;
  senderName: string;
  senderPhone: null;
  senderTypeConductorEcifFlag: null;
  tranType: string;
  transferDetails: string;
  _mongoid: string;
  sourceId: string;
} & TableRecordUiProps &
  TableSelectionCompareWithAmlTxnId;

export type OlbSourceData = {
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
  conductor: null;
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
  customer1AccountHolderCifId: null;
  customer1AccountStatus: string;
  customer2AccountCurrencyCode: string;
  customer2AccountHolderCifId: string;
  customer2AccountStatus: string;
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
  TableSelectionCompareWithAmlTxnId;

export type AbmSourceData = {
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
  strCaAccount: number;
  strCaAccountCurrency: string;
  strCaAccountHolderCifId: string;
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
  strSaAccountHoldersCifId: null;
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
  _mongoid: string;
} & TableRecordUiProps &
  TableSelectionCompareWithAmlTxnId;

export type SourceData =
  TransactionSearchResponse[number]["sourceData"][number];
