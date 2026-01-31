/* eslint-disable @typescript-eslint/no-explicit-any */
import * as inEmtCibcSender from '../../../../data/inEMTCompleteWithRawSubjectCibcSenderWithBackup.json';
import * as inEmtNonCibcSender from '../../../../data/inEMTCompleteWithRawSubjectNonCibcSenderWithBackup.json';

import * as outEmtCibcRecepient from '../../../../data/outEMTCompleteWithRawSubjectCibcRecipientWithBackup.json';
import * as outEmtNonCibcReceipient from '../../../../data/outEMTCompleteWithRawSubjectNonCibcRecipientWithBackup.json';

import * as cashDep from '../../../../data/cashDepositCompleteWithRawSubjectWithBackup.json';
import * as cashWith from '../../../../data/cashWithdrawalCompleteWithRawSubjectWithBackup.json';

import * as inWire from '../../../../data/wireInCompleteWithBackup.json';

// import { StrTransaction } from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { PartyGenType } from '../transaction-view/transform-to-str-transaction/party-gen.service';
import { StrTransactionWithChangeLogs } from './case-record.store';

export const IMPORT_SIZE = 20;

const inEmtNonCibcSenderData = (inEmtNonCibcSender as any).default.slice(0, IMPORT_SIZE);
const inEmtCibcSenderData = (inEmtCibcSender as any).default.slice(0, IMPORT_SIZE);
const outEmtNonCibcRecepientData = (
  outEmtNonCibcReceipient as any
).default.slice(0, IMPORT_SIZE);
const outEmtCibcRecepientData = (outEmtCibcRecepient as any).default.slice(
  0,
  IMPORT_SIZE,
);
const cashDepData = (cashDep as any).default.slice(0, IMPORT_SIZE);
const cashWithData = (cashWith as any).default.slice(0, IMPORT_SIZE);
const inWireData = (inWire as any).default.slice(0, IMPORT_SIZE);

// export const SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE: StrTransaction[] = [
//   ...inEmtNonCibcSenderData,
//   ...inEmtCibcSenderData,
//   ...outEmtNonCibcRecepientData,
//   ...outEmtCibcRecepientData,
//   ...cashDepData,
//   ...cashWithData,
//   ...inWireData,
// ];

export const SELECTIONS_DEV_OR_TEST_ONLY_FIXTURE: StrTransactionWithChangeLogs[] = [
    {
        "sourceId": "OTC",
        "wasTxnAttempted": false,
        "wasTxnAttemptedReason": null,
        "dateOfTxn": "2024/01/02",
        "timeOfTxn": "11:27:48",
        "hasPostingDate": true,
        "dateOfPosting": "2024/01/02",
        "timeOfPosting": null,
        "methodOfTxn": "In-Person",
        "methodOfTxnOther": null,
        "reportingEntityTxnRefNo": "CBFE-01KFDNKP72R72AP08JYEEB172W",
        "purposeOfTxn": null,
        "reportingEntityLocationNo": "84255",
        "startingActions": [
            {
                "directionOfSA": "In",
                "typeOfFunds": "Cheque",
                "typeOfFundsOther": null,
                "amount": 23200,
                "currency": "CAD",
                "fiuNo": null,
                "branch": null,
                "account": null,
                "accountType": null,
                "accountTypeOther": null,
                "accountOpen": null,
                "accountClose": null,
                "accountStatus": null,
                "howFundsObtained": null,
                "accountCurrency": null,
                "hasAccountHolders": false,
                "accountHolders": [],
                "wasSofInfoObtained": false,
                "sourceOfFunds": [],
                "wasCondInfoObtained": true,
                "conductors": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null,
                        "wasConductedOnBehalf": false,
                        "onBehalfOf": [],
                        "npdTypeOfDevice": null,
                        "npdTypeOfDeviceOther": null,
                        "npdDeviceIdNo": null,
                        "npdUsername": null,
                        "npdIp": null,
                        "npdDateTimeSession": null,
                        "npdTimeZone": null
                    }
                ]
            },
            {
                "directionOfSA": "In",
                "typeOfFunds": "Cash",
                "typeOfFundsOther": null,
                "amount": 200,
                "currency": "CAD",
                "fiuNo": null,
                "branch": null,
                "account": null,
                "accountType": null,
                "accountTypeOther": null,
                "accountOpen": null,
                "accountClose": null,
                "accountStatus": null,
                "howFundsObtained": null,
                "accountCurrency": null,
                "hasAccountHolders": false,
                "accountHolders": [],
                "wasSofInfoObtained": false,
                "sourceOfFunds": [],
                "wasCondInfoObtained": true,
                "conductors": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null,
                        "wasConductedOnBehalf": false,
                        "onBehalfOf": [],
                        "npdTypeOfDevice": null,
                        "npdTypeOfDeviceOther": null,
                        "npdDeviceIdNo": null,
                        "npdUsername": null,
                        "npdIp": null,
                        "npdDateTimeSession": null,
                        "npdTimeZone": null
                    }
                ]
            }
        ],
        "completingActions": [
            {
                "detailsOfDispo": "Deposit to account",
                "detailsOfDispoOther": null,
                "amount": 23400,
                "currency": "CAD",
                "exchangeRate": null,
                "valueInCad": null,
                "fiuNo": "010",
                "branch": "87594",
                "account": "5647218",
                "accountType": "Personal",
                "accountTypeOther": null,
                "accountCurrency": "CAD",
                "accountOpen": "2005/06/23",
                "accountClose": null,
                "accountStatus": "Active",
                "hasAccountHolders": true,
                "accountHolders": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ],
                "wasAnyOtherSubInvolved": false,
                "wasBenInfoObtained": true,
                "beneficiaries": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ]
            }
        ],
        "highlightColor": null,
        "flowOfFundsAccountCurrency": "CAD",
        "flowOfFundsAmlId": 99999999,
        "flowOfFundsAmlTransactionId": "CBFE-01KFDNKP72R72AP08JYEEB172W",
        "flowOfFundsCasePartyKey": 3415674561,
        "flowOfFundsConductorPartyKey": 3415674561,
        "flowOfFundsCreditAmount": 23400,
        "flowOfFundsCreditedAccount": "5582195",
        "flowOfFundsCreditedTransit": "84255",
        "flowOfFundsDebitAmount": null,
        "flowOfFundsDebitedAccount": null,
        "flowOfFundsDebitedTransit": null,
        "flowOfFundsPostingDate": "2024/01/02",
        "flowOfFundsSource": "OTC",
        "flowOfFundsSourceTransactionId": "010004",
        "flowOfFundsTransactionCurrency": "CAD",
        "flowOfFundsTransactionCurrencyAmount": 23400,
        "flowOfFundsTransactionDate": "2024/01/02",
        "flowOfFundsTransactionDesc": "Deposit From: Mixed To: James",
        "flowOfFundsTransactionTime": "11:27:48",
        "eTag": 0,
        "caseRecordId": "33a41dcc-ab8e-4a9b-89ea-c6a2fec46356",
        "changeLogs": [],
        "_hiddenValidation": []
    },
    {
        "sourceId": "OTC",
        "wasTxnAttempted": false,
        "wasTxnAttemptedReason": null,
        "dateOfTxn": "2024/02/26",
        "timeOfTxn": "08:21:32",
        "hasPostingDate": true,
        "dateOfPosting": "2024/02/26",
        "timeOfPosting": null,
        "methodOfTxn": "In-Person",
        "methodOfTxnOther": null,
        "reportingEntityTxnRefNo": "CBFE-01KFDNKP8RCG14F4T04KGYSN0V",
        "purposeOfTxn": null,
        "reportingEntityLocationNo": "33969",
        "startingActions": [
            {
                "directionOfSA": "In",
                "typeOfFunds": "Cheque",
                "typeOfFundsOther": null,
                "amount": 16500,
                "currency": "CAD",
                "fiuNo": null,
                "branch": null,
                "account": null,
                "accountType": null,
                "accountTypeOther": null,
                "accountOpen": null,
                "accountClose": null,
                "accountStatus": null,
                "howFundsObtained": null,
                "accountCurrency": null,
                "hasAccountHolders": false,
                "accountHolders": [],
                "wasSofInfoObtained": false,
                "sourceOfFunds": [],
                "wasCondInfoObtained": true,
                "conductors": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null,
                        "wasConductedOnBehalf": false,
                        "onBehalfOf": [],
                        "npdTypeOfDevice": null,
                        "npdTypeOfDeviceOther": null,
                        "npdDeviceIdNo": null,
                        "npdUsername": null,
                        "npdIp": null,
                        "npdDateTimeSession": null,
                        "npdTimeZone": null
                    }
                ]
            },
            {
                "directionOfSA": "In",
                "typeOfFunds": "Cash",
                "typeOfFundsOther": null,
                "amount": 200,
                "currency": "CAD",
                "fiuNo": null,
                "branch": null,
                "account": null,
                "accountType": null,
                "accountTypeOther": null,
                "accountOpen": null,
                "accountClose": null,
                "accountStatus": null,
                "howFundsObtained": null,
                "accountCurrency": null,
                "hasAccountHolders": false,
                "accountHolders": [],
                "wasSofInfoObtained": false,
                "sourceOfFunds": [],
                "wasCondInfoObtained": true,
                "conductors": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null,
                        "wasConductedOnBehalf": false,
                        "onBehalfOf": [],
                        "npdTypeOfDevice": null,
                        "npdTypeOfDeviceOther": null,
                        "npdDeviceIdNo": null,
                        "npdUsername": null,
                        "npdIp": null,
                        "npdDateTimeSession": null,
                        "npdTimeZone": null
                    }
                ]
            }
        ],
        "completingActions": [
            {
                "detailsOfDispo": "Deposit to account",
                "detailsOfDispoOther": null,
                "amount": 16700,
                "currency": "CAD",
                "exchangeRate": null,
                "valueInCad": null,
                "fiuNo": "010",
                "branch": "84255",
                "account": "5582195",
                "accountType": "Personal",
                "accountTypeOther": null,
                "accountCurrency": "CAD",
                "accountOpen": "2003/08/24",
                "accountClose": null,
                "accountStatus": "Active",
                "hasAccountHolders": true,
                "accountHolders": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ],
                "wasAnyOtherSubInvolved": false,
                "wasBenInfoObtained": true,
                "beneficiaries": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ]
            }
        ],
        "highlightColor": null,
        "flowOfFundsAccountCurrency": "CAD",
        "flowOfFundsAmlId": 99999999,
        "flowOfFundsAmlTransactionId": "CBFE-01KFDNKP8RCG14F4T04KGYSN0V",
        "flowOfFundsCasePartyKey": 3415674561,
        "flowOfFundsConductorPartyKey": 3415674561,
        "flowOfFundsCreditAmount": 16700,
        "flowOfFundsCreditedAccount": "5582195",
        "flowOfFundsCreditedTransit": "84255",
        "flowOfFundsDebitAmount": null,
        "flowOfFundsDebitedAccount": null,
        "flowOfFundsDebitedTransit": null,
        "flowOfFundsPostingDate": "2024/02/26",
        "flowOfFundsSource": "OTC",
        "flowOfFundsSourceTransactionId": "140000",
        "flowOfFundsTransactionCurrency": "CAD",
        "flowOfFundsTransactionCurrencyAmount": 16700,
        "flowOfFundsTransactionDate": "2024/02/26",
        "flowOfFundsTransactionDesc": "Deposit From: Mixed To: Laura",
        "flowOfFundsTransactionTime": "08:21:32",
        "eTag": 0,
        "caseRecordId": "33a41dcc-ab8e-4a9b-89ea-c6a2fec46356",
        "changeLogs": [],
        "_hiddenValidation": []
    },
    {
        "sourceId": "Wire",
        "wasTxnAttempted": false,
        "wasTxnAttemptedReason": null,
        "dateOfTxn": "2024/01/15",
        "timeOfTxn": "01:29:23",
        "hasPostingDate": true,
        "dateOfPosting": "2024/01/15",
        "timeOfPosting": null,
        "methodOfTxn": "In-Person",
        "methodOfTxnOther": null,
        "reportingEntityTxnRefNo": "IWS-10PW-85f0d303-5053-4cd4-ace1-5e5bdddd5fe1",
        "purposeOfTxn": "INV 36226993\nTO PAY AN INVOICE",
        "reportingEntityLocationNo": "09602",
        "startingActions": [
            {
                "directionOfSA": "In",
                "typeOfFunds": "International Funds Transfer",
                "typeOfFundsOther": null,
                "amount": 51075,
                "currency": "CAD",
                "fiuNo": "AXCRFRP1XXX",
                "branch": null,
                "account": "ZPW29648",
                "accountType": "Personal",
                "accountTypeOther": null,
                "accountOpen": null,
                "accountClose": null,
                "accountStatus": null,
                "howFundsObtained": null,
                "accountCurrency": null,
                "hasAccountHolders": false,
                "accountHolders": [],
                "wasSofInfoObtained": false,
                "sourceOfFunds": [],
                "wasCondInfoObtained": true,
                "conductors": [
                    {
                        "linkToSub": "1444cca89918e03ad898ded2e0541f5c741650d3973f56afb0c9eddcd42765ac",
                        "_hiddenPartyKey": null,
                        "_hiddenGivenName": "Kuhlman",
                        "_hiddenSurname": "Group",
                        "_hiddenOtherOrInitial": null,
                        "_hiddenNameOfEntity": null,
                        "wasConductedOnBehalf": false,
                        "onBehalfOf": []
                    }
                ]
            }
        ],
        "completingActions": [
            {
                "detailsOfDispo": "Deposit to account",
                "detailsOfDispoOther": null,
                "amount": 51060,
                "currency": "CAD",
                "exchangeRate": null,
                "valueInCad": null,
                "fiuNo": "010",
                "branch": "31980",
                "account": "8692413",
                "accountType": "Personal",
                "accountTypeOther": null,
                "accountCurrency": "CAD",
                "accountOpen": "2001/07/14",
                "accountClose": null,
                "accountStatus": "Active",
                "hasAccountHolders": true,
                "accountHolders": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ],
                "wasAnyOtherSubInvolved": false,
                "involvedIn": [],
                "wasBenInfoObtained": true,
                "beneficiaries": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ]
            }
        ],
        "highlightColor": null,
        "flowOfFundsAccountCurrency": "CAD",
        "flowOfFundsAmlId": 99999999,
        "flowOfFundsAmlTransactionId": "IWS-10PW-85f0d303-5053-4cd4-ace1-5e5bdddd5fe1",
        "flowOfFundsCasePartyKey": 3415674561,
        "flowOfFundsConductorPartyKey": null,
        "flowOfFundsCreditAmount": 51060,
        "flowOfFundsCreditedAccount": "8692413",
        "flowOfFundsCreditedTransit": "31980",
        "flowOfFundsDebitAmount": null,
        "flowOfFundsDebitedAccount": null,
        "flowOfFundsDebitedTransit": null,
        "flowOfFundsPostingDate": "2024/01/15",
        "flowOfFundsSource": "Wires",
        "flowOfFundsSourceTransactionId": "T0240115575564376",
        "flowOfFundsTransactionCurrency": "CAD",
        "flowOfFundsTransactionCurrencyAmount": 51060,
        "flowOfFundsTransactionDate": "2024/01/15",
        "flowOfFundsTransactionDesc": "Incoming Wire @ Kuhlman Group\nOld Church Street, Athenry,\nBinglincha\n CN",
        "flowOfFundsTransactionTime": "01:29:23",
        "eTag": 0,
        "caseRecordId": "33a41dcc-ab8e-4a9b-89ea-c6a2fec46356",
        "changeLogs": [],
        "_hiddenValidation": []
    },
    {
        "sourceId": "EMT",
        "wasTxnAttempted": false,
        "wasTxnAttemptedReason": null,
        "dateOfTxn": "2024/01/10",
        "timeOfTxn": "11:43:59",
        "hasPostingDate": true,
        "dateOfPosting": "2024/01/11",
        "timeOfPosting": null,
        "methodOfTxn": "Online",
        "methodOfTxnOther": null,
        "reportingEntityTxnRefNo": "OLB-01KCP4PQ43YSAHKCN3AC3VGDSC",
        "purposeOfTxn": null,
        "reportingEntityLocationNo": "84255",
        "startingActions": [
            {
                "directionOfSA": "In",
                "typeOfFunds": "Email money transfer",
                "typeOfFundsOther": null,
                "amount": 1090,
                "currency": "CAD",
                "fiuNo": "010",
                "branch": "36917",
                "account": "1671963",
                "accountType": "Personal",
                "accountTypeOther": null,
                "accountOpen": "12/25/2022",
                "accountClose": null,
                "accountStatus": "Active",
                "accountCurrency": "CAD",
                "howFundsObtained": null,
                "hasAccountHolders": true,
                "accountHolders": [
                    {
                        "linkToSub": "0836e578615f8b6e67ca2fcaede30e8df8fdb39897adb697bc1db555c4a61ece",
                        "_hiddenPartyKey": "0907156820",
                        "_hiddenGivenName": "Devondra",
                        "_hiddenSurname": "Towers",
                        "_hiddenOtherOrInitial": null,
                        "_hiddenNameOfEntity": null
                    }
                ],
                "wasSofInfoObtained": false,
                "sourceOfFunds": [],
                "wasCondInfoObtained": true,
                "conductors": [
                    {
                        "linkToSub": "0836e578615f8b6e67ca2fcaede30e8df8fdb39897adb697bc1db555c4a61ece",
                        "_hiddenPartyKey": "0907156820",
                        "_hiddenGivenName": "Devondra",
                        "_hiddenSurname": "Towers",
                        "_hiddenOtherOrInitial": null,
                        "_hiddenNameOfEntity": null,
                        "wasConductedOnBehalf": false,
                        "onBehalfOf": [],
                        "npdTypeOfDevice": "Other- Unknown",
                        "npdTypeOfDeviceOther": null,
                        "npdDeviceIdNo": null,
                        "npdUsername": null,
                        "npdIp": "75.26.269.95",
                        "npdDateTimeSession": null,
                        "npdTimeZone": null
                    }
                ]
            }
        ],
        "completingActions": [
            {
                "detailsOfDispo": "Deposit to account",
                "detailsOfDispoOther": null,
                "amount": 1090,
                "currency": "CAD",
                "exchangeRate": null,
                "valueInCad": null,
                "fiuNo": "010",
                "branch": "84255",
                "account": "5582195",
                "accountType": "Personal",
                "accountTypeOther": null,
                "accountOpen": "2003/08/24",
                "accountClose": null,
                "accountStatus": "Active",
                "accountCurrency": "CAD",
                "hasAccountHolders": true,
                "accountHolders": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ],
                "wasAnyOtherSubInvolved": false,
                "involvedIn": [],
                "wasBenInfoObtained": true,
                "beneficiaries": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ]
            }
        ],
        "highlightColor": null,
        "flowOfFundsAccountCurrency": "CAD",
        "flowOfFundsAmlId": 99999999,
        "flowOfFundsAmlTransactionId": "OLB-01KCP4PQ43YSAHKCN3AC3VGDSC",
        "flowOfFundsCasePartyKey": 3415674561,
        "flowOfFundsConductorPartyKey": null,
        "flowOfFundsCreditAmount": 1090,
        "flowOfFundsCreditedAccount": "5582195",
        "flowOfFundsCreditedTransit": "84255",
        "flowOfFundsDebitAmount": null,
        "flowOfFundsDebitedAccount": null,
        "flowOfFundsDebitedTransit": null,
        "flowOfFundsPostingDate": "2024/01/11",
        "flowOfFundsSource": "OLB",
        "flowOfFundsSourceTransactionId": "014464484500",
        "flowOfFundsTransactionCurrency": "CAD",
        "flowOfFundsTransactionCurrencyAmount": 1090,
        "flowOfFundsTransactionDate": "2024/01/10",
        "flowOfFundsTransactionDesc": "Receive E-Transfer @ devondra",
        "flowOfFundsTransactionTime": "11:43:59",
        "eTag": 0,
        "caseRecordId": "33a41dcc-ab8e-4a9b-89ea-c6a2fec46356",
        "changeLogs": [],
        "_hiddenValidation": []
    },
    {
        "sourceId": "ABM",
        "wasTxnAttempted": false,
        "wasTxnAttemptedReason": null,
        "dateOfTxn": "2024/01/02",
        "timeOfTxn": "11:27:48",
        "hasPostingDate": true,
        "dateOfPosting": "2024/01/02",
        "timeOfPosting": null,
        "methodOfTxn": "ABM",
        "methodOfTxnOther": null,
        "reportingEntityTxnRefNo": "ABM-01KCGG7YKGK8HM1EJYXRHDNMKH",
        "purposeOfTxn": null,
        "reportingEntityLocationNo": "84255",
        "startingActions": [
            {
                "directionOfSA": "In",
                "typeOfFunds": "Cash",
                "typeOfFundsOther": null,
                "amount": 23400,
                "currency": "CAD",
                "fiuNo": null,
                "branch": null,
                "account": null,
                "accountType": null,
                "accountTypeOther": null,
                "accountOpen": null,
                "accountClose": null,
                "accountStatus": null,
                "howFundsObtained": null,
                "accountCurrency": null,
                "hasAccountHolders": false,
                "accountHolders": [],
                "wasSofInfoObtained": false,
                "wasCondInfoObtained": true,
                "conductors": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null,
                        "wasConductedOnBehalf": false,
                        "onBehalfOf": [],
                        "npdTypeOfDevice": null,
                        "npdTypeOfDeviceOther": null,
                        "npdDeviceIdNo": null,
                        "npdUsername": null,
                        "npdIp": null,
                        "npdDateTimeSession": null,
                        "npdTimeZone": null
                    }
                ]
            }
        ],
        "completingActions": [
            {
                "detailsOfDispo": "Deposit to account",
                "detailsOfDispoOther": null,
                "amount": 23400,
                "currency": "CAD",
                "exchangeRate": null,
                "valueInCad": null,
                "fiuNo": "010",
                "branch": "87594",
                "account": "5647218",
                "accountType": "Personal",
                "accountTypeOther": null,
                "accountCurrency": "CAD",
                "accountOpen": "2005/06/23",
                "accountClose": null,
                "accountStatus": "Active",
                "hasAccountHolders": true,
                "accountHolders": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ],
                "wasAnyOtherSubInvolved": false,
                "involvedIn": [],
                "wasBenInfoObtained": true,
                "beneficiaries": [
                    {
                        "linkToSub": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
                        "_hiddenPartyKey": "3415674561",
                        "_hiddenGivenName": "James",
                        "_hiddenSurname": "Carter",
                        "_hiddenOtherOrInitial": "L",
                        "_hiddenNameOfEntity": null
                    },
                    {
                        "linkToSub": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
                        "_hiddenPartyKey": "1846597320",
                        "_hiddenGivenName": "Laura",
                        "_hiddenSurname": "Nguyen",
                        "_hiddenOtherOrInitial": "M",
                        "_hiddenNameOfEntity": null
                    }
                ]
            }
        ],
        "highlightColor": null,
        "flowOfFundsAccountCurrency": "CAD",
        "flowOfFundsAmlId": 99999999,
        "flowOfFundsAmlTransactionId": "ABM-01KCGG7YKGK8HM1EJYXRHDNMKH",
        "flowOfFundsCasePartyKey": 3415674561,
        "flowOfFundsConductorPartyKey": 3415674561,
        "flowOfFundsCreditAmount": 23400,
        "flowOfFundsCreditedAccount": "5582195",
        "flowOfFundsCreditedTransit": "84255",
        "flowOfFundsDebitAmount": null,
        "flowOfFundsDebitedAccount": null,
        "flowOfFundsDebitedTransit": null,
        "flowOfFundsPostingDate": "2024/01/02",
        "flowOfFundsSource": "ABM",
        "flowOfFundsSourceTransactionId": "000000000245",
        "flowOfFundsTransactionCurrency": "CAD",
        "flowOfFundsTransactionCurrencyAmount": 23400,
        "flowOfFundsTransactionDate": "2024/01/02",
        "flowOfFundsTransactionDesc": "Deposit @ 378 Buell Court, Hamburg Winterhude, ON",
        "flowOfFundsTransactionTime": "11:27:48",
        "eTag": 0,
        "caseRecordId": "33a41dcc-ab8e-4a9b-89ea-c6a2fec46356",
        "changeLogs": [],
        "_hiddenValidation": []
    }
]
export const PARTIES_DEV_OR_TEST_ONLY_FIXTURE: PartyGenType[] = [
    {
        "partyIdentifier": "4903dafbfbf21653a76ede6f2134c2f0dc32d328702c956cd9bcf2b58b482c49",
        "identifiers": {
            "partyKey": "1846597320"
        },
        "partyName": {
            "surname": "Nguyen",
            "givenName": "Laura",
            "otherOrInitial": "M",
            "nameOfEntity": null
        }
    },
    {
        "partyIdentifier": "aa37117af79830a10c5a92e85fb1114769ee46e7aa4138e9f93e186accede213",
        "identifiers": {
            "partyKey": "3415674561"
        },
        "partyName": {
            "surname": "Carter",
            "givenName": "James",
            "otherOrInitial": "L",
            "nameOfEntity": null
        }
    },
    {
        "identifiers": {
            "partyKey": "0907156820"
        },
        "partyName": {
            "surname": "Towers",
            "givenName": "Devondra",
            "otherOrInitial": null,
            "nameOfEntity": null
        },
        "partyIdentifier": "0836e578615f8b6e67ca2fcaede30e8df8fdb39897adb697bc1db555c4a61ece",
    },
    {
        "identifiers": {
            "msgTag50": "ZPW29648\nKuhlman Group\nOld Church Street, Athenry,\nBinglincha\n CN"
        },
        "partyName": {
            "givenName": "Kuhlman",
            "otherOrInitial": null,
            "surname": "Group",
            "nameOfEntity": null
        },
        "partyIdentifier": "1444cca89918e03ad898ded2e0541f5c741650d3973f56afb0c9eddcd42765ac",
    }
]