import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import {
  StrTxnFlowOfFunds,
  WithVersion,
} from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  PendingChange,
  ReviewPeriod,
  StrTransactionWithChangeLogs,
} from './case-record.store';
import { SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE } from './case-record.state.fixture';

@Injectable({
  providedIn: 'root',
})
export class CaseRecordService {
  private http = inject(HttpClient);

  fetchCaseRecordByAmlId(amlId: string): Observable<GetCaseRecordResponse> {
    return of({
      ...SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE,
      lastUpdated: SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE.lastUpdated ?? '',
      selections: [],
    }).pipe(delay(1000));
    // return this.http.get<GetCaseRecordResponse>(
    //   `/api/aml/${amlId}/case-record`,
    // );
  }

  createCaseRecord(amlId: string, payload: CreateCaseRecordRequest) {
    return this.http.post<CreateCaseRecordResponse>(
      `/api/aml/${amlId}/case-record`,
      payload,
    );
  }

  fetchSelections(caseRecordId: string): Observable<FetchSelectionsResponse> {
    return of({
      selections: SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE.selections,
    }).pipe(delay(100));
    // return this.http.get<FetchSelectionsResponse>(
    //   `/api/case-record/${caseRecordId}/selections`,
    // );
  }

  addSelections(
    caseRecordId: string,
    payload: AddSelectionsRequest,
  ): Observable<void> {
    return this.http.put<void>(
      `/api/case-record/${caseRecordId}/selections/add`,
      payload! as AddSelectionsRequest,
    );
  }

  editSelections(caseRecordId: string, payload: EditSelectionsRequest) {
    return this.http.put<void>(
      `/api/case-record/${caseRecordId}/selections/edit`,
      payload! as EditSelectionsRequest,
    );
  }
}

export interface GetCaseRecordResponse {
  caseRecordId: string;
  amlId: string;
  transactionSearchParams: {
    partyKeysSelection?: string[] | null;
    accountNumbersSelection?: string[] | null;
    sourceSystemsSelection?: string[] | null;
    productTypesSelection?: string[] | null;
    reviewPeriodSelection?: ReviewPeriod[] | null;
  };
  createdAt: string;
  createdBy: string;
  status: string;
  etag: number;
  lastUpdated: string;
}

interface CreateSessionRequest {
  amlId: string;
  transactionSearchParams: {
    partyKeysSelection?: string[] | null;
    accountNumbersSelection?: string[] | null;
    sourceSystemsSelection?: string[] | null;
    productTypesSelection?: string[] | null;
    reviewPeriodSelection?: ReviewPeriod[] | null;
  };
}

export interface CreateCaseRecordRequest {
  accountNumbersSelection: [];
  partyKeysSelection: [];
  productTypesSelection: [];
  reviewPeriodSelection: [];
  sourceSystemsSelection: [];
}

export interface CreateCaseRecordResponse {
  amlId: string;
  caseRecordId: string;
  etag: number;
}

interface FetchSelectionsResponse {
  selections: StrTransactionWithChangeLogs[];
}

export interface AddSelectionsRequest {
  caseETag: number;
  selections: StrTransactionWithChangeLogs[];
}

interface RemoveSelectionsRequest {
  selections: StrTxnFlowOfFunds['flowOfFundsAmlTransactionId'][];
}

interface UpdateSearchParamsRequest {
  etag: number;
  transactionSearchParams: {
    partyKeysSelection?: string[] | null;
    accountNumbersSelection?: string[] | null;
    sourceSystemsSelection?: string[] | null;
    productTypesSelection?: string[] | null;
    reviewPeriodSelection?: ReviewPeriod[] | null;
  };
}

interface UpdateSearchParamsResponse {
  amlId: string;
  newVersion: number;
  updatedAt: string;
}

export interface EditSelectionsRequest {
  pendingChanges: WithVersion<PendingChange>[];
}

interface BulkUpdateTransactionsConflictResponse {
  message: string;
  requested: number;
  succeeded: number;
}
