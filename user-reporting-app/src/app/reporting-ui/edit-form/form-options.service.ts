import { Injectable } from '@angular/core';
import { delay, Observable, of, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FormOptionsService {
  formOptions$ = this.fetchFormOptions().pipe(shareReplay(1));

  private fetchFormOptions() {
    // Simulating HTTP call with of()
    return of(FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE).pipe(delay(2000));
  }
}

export type FormOptions =
  typeof FormOptionsService.prototype.formOptions$ extends Observable<infer U>
    ? U
    : never;

export const FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE = {
  methodOfTxn: {
    ABM: 'ABM',
    'In-Person': 'In-Person',
    Online: 'Online',
    Other: 'Other',
  },
  typeOfFunds: {
    'Funds withdrawal': 'Funds withdrawal',
    Cash: 'Cash',
    Cheque: 'Cheque',
    'Domestic Funds Transfer': 'Domestic Funds Transfer',
    'Email money transfer': 'Email money transfer',
    'International Funds Transfer': 'International Funds Transfer',
    Other: 'Other',
  },
  accountType: {
    Business: 'Business',
    Casino: 'Casino',
    Personal: 'Personal',
    Other: 'Other',
  },
  amountCurrency: {
    CAD: 'CAD',
    USD: 'USD',
    INR: 'INR',
  },
  accountCurrency: {
    CAD: 'CAD',
    USD: 'USD',
  },
  accountStatus: {
    Active: 'Active',
    Closed: 'Closed',
    Inactive: 'Inactive',
    Dorment: 'Dorment',
  },
  directionOfSA: {
    In: 'In',
    Out: 'Out',
  },
  detailsOfDisposition: {
    'Deposit to account': 'Deposit to account',
    'Cash Withdrawal': 'Cash Withdrawal',
    'Issued Cheque': 'Issued Cheque',
    'Outgoing email money transfer': 'Outgoing email money transfer',
    Other: 'Other',
  },
} as const;
