import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { shareReplay } from 'rxjs';
// import { FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE } from './form-options.fixture';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class FormOptionsService {
  private http = inject(HttpClient);

  formOptions$ = this.fetchFormOptions().pipe(
    takeUntilDestroyed(),
    shareReplay(1),
  );

  private fetchFormOptions() {
    // Simulating HTTP call with of()
    // return of(FORM_OPTIONS_DEV_OR_TEST_ONLY_FIXTURE).pipe(delay(2000));
    return this.http.get<FormOptions>('/api/aml/formoptions');
  }
}

export interface FormOptions {
  methodOfTxn: {
    ABM: string;
    'In-Person': string;
    Online: string;
    Other: string;
  };
  typeOfFunds: {
    'Funds Withdrawal': string;
    Cash: string;
    Cheque: string;
    'Domestic Funds Transfer': string;
    'Email money transfer': string;
    'International Funds Transfer': string;
    Other: string;
  };
  accountType: {
    Business: string;
    Casino: string;
    Personal: string;
    Other: string;
  };
  amountCurrency: {
    CAD: string;
    USD: string;
    INR: string;
  };
  accountCurrency: {
    CAD: string;
    USD: string;
  };
  accountStatus: {
    Active: string;
    Closed: string;
    Inactive: string;
    Dorment: string;
  };
  directionOfSA: {
    In: string;
    Out: string;
  };
  detailsOfDisposition: {
    'Deposit to account': string;
    'Cash Withdrawal (account based)': string;
    'Issued Cheque': string;
    'Outgoing email money transfer': string;
    Other: string;
  };
}

export type FORM_OPTIONS_DIRECTION = 'In' | 'Out';

export type FORM_OPTIONS_ACCOUNT_TYPE =
  | 'Business'
  | 'Casino'
  | 'Personal'
  | 'Other';

export type FORM_OPTIONS_TYPE_OF_FUNDS =
  | 'Funds Withdrawal'
  | 'Cash'
  | 'Cheque'
  | 'Domestic Funds Transfer'
  | 'Email money transfer'
  | 'International Funds Transfer';

export type FORM_OPTIONS_DETAILS_OF_DISPOSITION =
  | 'Deposit to account'
  | 'Cash Withdrawal (account based)'
  | 'Issued Cheque'
  | 'Outgoing email money transfer';

export type FORM_OPTIONS_METHOD_OF_TXN =
  | 'ABM'
  | 'In-Person'
  | 'Online'
  | 'Other';
