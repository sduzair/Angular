# Introduction

- Facilitates reporting and management of Suspicious Transaction Reporting (STR) data
- Allows users to create, edit, and track STR transactions with full auditability
- Captures all changes as detailed change logs stored in versioned sessions
- Supports optimistic concurrency control to prevent conflicting updates during concurrent edits
- Ensures data integrity and consistency without hindering collaboration
- Streamlines STR reporting with robust versioning, transparent change tracking, and concurrency management

- [Introduction](#introduction)
  - [MongoDB Storage Details](#mongodb-storage-details)
  - [Suspicious Transaction Reporting (STR) Model Schema](#suspicious-transaction-reporting-str-model-schema)
    - [Usage Notes](#usage-notes)
    - [General Subject (sub)](#general-subject-sub)
    - [Personal Subject with Structured Address (subPersonStrucAddress)](#personal-subject-with-structured-address-subpersonstrucaddress)
    - [Personal Subject with Unstructured Address (subPersonUnstrucAddress)](#personal-subject-with-unstructured-address-subpersonunstrucaddress)
    - [Entity Subject with Structured Address (subEntityStrucAddress)](#entity-subject-with-structured-address-subentitystrucaddress)
    - [Entity Subject with Unstructured Address (subEntityUnstrucAddress)](#entity-subject-with-unstructured-address-subentityunstrucaddress)
    - [Transaction Schema (strTxn)](#transaction-schema-strtxn)
    - [Starting Action Schema (startingAction)](#starting-action-schema-startingaction)
    - [Completing Action Schema (completingAction)](#completing-action-schema-completingaction)
    - [Conductor Schema (conductor and conductorWithNpd)](#conductor-schema-conductor-and-conductorwithnpd)
    - [Basic Conductor](#basic-conductor)
    - [Conductor with Non-Personal Device Details (conductorWithNpd)](#conductor-with-non-personal-device-details-conductorwithnpd)
    - [Beneficiary Schema (beneficiary)](#beneficiary-schema-beneficiary)
    - [Account Holder Schema (accountHolder)](#account-holder-schema-accountholder)
  - [Mock Data Identifiers](#mock-data-identifiers)

## MongoDB Storage Details

| Item            | Description                                  |
| --------------- | -------------------------------------------- |
| **Database**    | `strTxnDB`                                   |
| **Collections** |                                              |
| `strTxns`       | Stores suspicious transaction documents      |
| `subjects`      | Stores subject (individual/entity) documents |
| `sessions`      | Stores session-related data                  |

## Suspicious Transaction Reporting (STR) Model Schema

This document provides an overview and explanation of the schema used for modeling Suspicious Transaction Reporting (STR) data.

### Usage Notes

- The model supports multiple starting and completing actions per transaction.
- The linkToSub field connects related parties across different parts of the schema.
- Use the appropriate subject schema depending on whether the subject is a person or entity and whether the address is structured or unstructured.

### General Subject (sub)

```json
{
  "subType": null,
  "surname": null,
  "givenName": null,
  "otherName": null,
  "partyKey": null,
  "nameOfEntity": null,
  "telephoneNo": null,
  "addressType": "structured",
  "strucUnitNo": null,
  "strucHouseNo": null,
  "strucStAddress": null,
  "strucCity": null,
  "strucDistrict": null,
  "strucPostalCode": null,
  "strucCountry": null,
  "strucProvince": null,
  "strucSubProvince": null,
  "unstrucAddDetails": null,
  "unstrucCountry": null
}
```

### Personal Subject with Structured Address (subPersonStrucAddress)

```json
{
  "subType": "personal",
  "surname": null,
  "givenName": null,
  "otherName": null,
  "partyKey": null,
  "addressType": "structured",
  "strucUnitNo": null,
  "strucHouseNo": null,
  "strucStAddress": null,
  "strucCity": null,
  "strucDistrict": null,
  "strucPostalCode": null,
  "strucCountry": null,
  "strucProvince": null,
  "strucSubProvince": null
}
```

### Personal Subject with Unstructured Address (subPersonUnstrucAddress)

```json
{
  "subType": "personal",
  "surname": null,
  "givenName": null,
  "otherName": null,
  "partyKey": null,
  "addressType": "unstructured",
  "unstrucAddDetails": null,
  "unstrucCountry": null
}
```

### Entity Subject with Structured Address (subEntityStrucAddress)

```json
{
  "subType": "entity",
  "partyKey": null,
  "nameOfEntity": null,
  "telephoneNo": null,
  "addressType": "structured",
  "strucUnitNo": null,
  "strucHouseNo": null,
  "strucStAddress": null,
  "strucCity": null,
  "strucDistrict": null,
  "strucPostalCode": null,
  "strucCountry": null,
  "strucProvince": null,
  "strucSubProvince": null
}
```

### Entity Subject with Unstructured Address (subEntityUnstrucAddress)

```json
{
  "subType": "entity",
  "partyKey": null,
  "nameOfEntity": null,
  "telephoneNo": null,
  "addressType": "unstructured",
  "unstrucAddDetails": null,
  "unstrucCountry": null
}
```

### Transaction Schema (strTxn)

```json
{
  "wasTxnAttempted": false,
  "wasTxnAttemptedReason": null,
  "dateOfTxn": null,
  "timeOfTxn": null,
  "hasPostingDate": false,
  "dateOfPosting": null,
  "timeOfPosting": null,
  "methodOfTxn": null,
  // "hasMethodOfTxnOther": false, note: use 'Other' option on method of txn dropdown
  "methodOfTxnOther": null,
  "reportingEntityTxnRefNo": null,
  "purposeOfTxn": null,
  "reportingEntityLocationNo": null,
  "startingActions": [],
  "completingActions": []
}
```

### Starting Action Schema (startingAction)

```json
{
  "directionOfSA": null,
  "typeOfFunds": null,
  "typeOfFundsOther": null,
  "amount": null,
  "currency": null,
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
  "accountHolders": [],
  "wasSofInfoObtained": null,
  "sourceOfFunds": [],
  "wasCondInfoObtained": null,
  "conductors": []
}
```

### Completing Action Schema (completingAction)

```json
{
  "detailsOfDispo": null,
  "detailsOfDispoOther": null,
  "amount": null,
  "currency": null,
  "exchangeRate": null,
  "valueInCad": null,
  "fiuNo": null,
  "branch": null,
  "account": null,
  "accountType": null,
  "accountTypeOther": null,
  "accountCurrency": null,
  "accountOpen": null,
  "accountClose": null,
  "accountStatus": null,
  "accountHolders": [],
  "wasAnyOtherSubInvolved": null,
  "involvedIn": [],
  "wasBenInfoObtained": null,
  "beneficiaries": []
}
```

### Conductor Schema (conductor and conductorWithNpd)

### Basic Conductor

```json
{
  "linkToSub": null,
  "clientNo": null,
  "email": null,
  "url": null,
  "wasConductedOnBehalf": null,
  "onBehalfOf": []
}
```

### Conductor with Non-Personal Device Details (conductorWithNpd)

```json
{
  "linkToSub": null,
  "clientNo": null,
  "email": null,
  "url": null,
  "wasConductedOnBehalf": null,
  "onBehalfOf": [],
  "npdTypeOfDevice": null,
  "npdTypeOfDeviceOther": null,
  "npdDeviceIdNo": null,
  "npdUsername": null,
  "npdIp": null,
  "npdDateTimeSession": null,
  "npdTimeZone": null
}
```

Extends the basic conductor with device-related metadata such as device type, IP address, and session time

### Beneficiary Schema (beneficiary)

```json
{
  "linkToSub": null,
  "clientNo": null,
  "email": null,
  "url": null
}
```

### Account Holder Schema (accountHolder)

```json
{
  "linkToSub": null
}
```

## Mock Data Identifiers

Focal Clients:

- 78b7022a-5fc4-4495-9dca-7b50c6c4e8b0
- 0ba7dc99-5ae0-40c5-96d3-12a08d798eac

Accounts/Products:

- transit: 84255, 31980, 87594
- account: 5582195, 8692413, 5647218
- type: Personal, Business, Trust
- open: 2003/08/24, 2001/07/14, 2005/06/23
- close: null, 2017/12/11, null

Session ID: 6860df310a7abaeb4bd24fab
