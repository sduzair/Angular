import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  StrTxnFlowOfFunds,
  WithETag,
} from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { AccountNumberSelection } from '../transaction-search/transaction-search.service';
import {
  CaseRecordState,
  PendingChange,
  ReviewPeriod,
  StrTransactionWithChangeLogs,
} from './case-record.store';

@Injectable({
  providedIn: 'root',
})
export class CaseRecordService {
  private http = inject(HttpClient);

  fetchCaseRecord(amlId: string) {
    // return of({
    //   ...CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE,
    //   lastUpdated: CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE.lastUpdated ?? '',
    // }).pipe(delay(100));

    return this.http.get<FetchCaseRecordRes>(`/api/aml/${amlId}/caserecord`);
  }

  updateCaseRecord(caseRecordId: string, payload: UpdateCaseRecordReq) {
    return this.http.post<UpdateCaseRecordRes>(
      `/api/caserecord/${caseRecordId}/update`,
      payload,
    );
  }

  fetchSelections(caseRecordId: string) {
    // return of({
    //   selections: CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE.selections,
    // }).pipe(delay(100));

    return this.http.get<FetchSelectionsRes>(
      `/api/caserecord/${caseRecordId}/selections`,
    );
  }

  addSelections(caseRecordId: string, payload: AddSelectionsReq) {
    return this.http.post<AddSelectionsRes>(
      `/api/caserecord/${caseRecordId}/selections/add`,
      payload,
    );
  }

  removeSelections(caseRecordId: string, payload: RemoveSelectionsReq) {
    return this.http.post<RemoveSelectionsRes>(
      `/api/caserecord/${caseRecordId}/selections/remove`,
      payload,
    );
  }

  saveChanges(caseRecordId: string, payload: SaveChangesReq) {
    // return of(void 0).pipe(delay(150));

    return this.http.post<SaveChangesRes>(
      `/api/caserecord/${caseRecordId}/selections/save`,
      payload! as SaveChangesReq,
    );
  }

  resetSelections(
    caseRecordId: string,
    pendingResets: ResetSelectionsRequest['pendingResets'],
  ) {
    // return of(void 0).pipe(delay(150));

    const payload: ResetSelectionsRequest = { pendingResets };
    return this.http.post<void>(
      `/api/caserecord/${caseRecordId}/selections/reset`,
      payload,
    );
  }
}

export interface FetchCaseRecordRes {
  caseRecordId: string;
  amlId: string;
  searchParams: {
    partyKeysSelection?: string[] | null;
    accountNumbersSelection?: AccountNumberSelection[] | null;
    sourceSystemsSelection?: string[] | null;
    productTypesSelection?: string[] | null;
    reviewPeriodSelection?: ReviewPeriod[] | null;
  } | null;
  createdAt: string;
  createdBy: string;
  status: string;
  eTag: number;
  lastUpdated: string;
}

interface FetchSelectionsRes {
  selections: StrTransactionWithChangeLogs[];
}

export interface AddSelectionsReq {
  caseETag: number;
  selections: StrTransactionWithChangeLogs[];
}

interface AddSelectionsRes {
  caseETag: number;
  count: number;
}

interface RemoveSelectionsReq {
  caseETag: number;
  selections: StrTxnFlowOfFunds['flowOfFundsAmlTransactionId'][];
}

interface RemoveSelectionsRes {
  caseETag: number;
  count: number;
}

type UpdateCaseRecordReq = WithETag<{
  searchParams: {
    partyKeysSelection: string[];
    accountNumbersSelection: AccountNumberSelection[];
    sourceSystemsSelection: string[];
    productTypesSelection: string[];
    reviewPeriodSelection: ReviewPeriod[];
  };
}>;

type UpdateCaseRecordRes = FetchCaseRecordRes;

export interface SaveChangesReq {
  pendingChanges: WithETag<PendingChange>[];
}

export interface ResetSelectionsRequest {
  pendingResets: { flowOfFundsAmlTransactionId: string; eTag: number }[];
}

interface SaveChangesRes {
  message: string;
  requested: number;
  succeeded: number;
}
