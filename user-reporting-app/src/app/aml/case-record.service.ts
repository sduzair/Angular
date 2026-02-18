import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { WithETag } from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { AccountNumberSelection } from '../transaction-search/transaction-search.service';
import { ReviewPeriod } from './case-record.store';

@Injectable({
  providedIn: 'root',
})
export class CaseRecordService {
  private http = inject(HttpClient);

  fetchCaseRecordByAmlId(amlId: string) {
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

  closeCaseRecord(caseRecordId: string, payload: CloseCaseRecordReq) {
    return this.http.post<CaseRecordRes>(
      `/api/caserecord/${caseRecordId}/close`,
      payload,
    );
  }

  activateCaseRecord(caseRecordId: string, payload: ActivateCaseRecordReq) {
    return this.http.post<CaseRecordRes>(
      `/api/caserecord/${caseRecordId}/activate`,
      payload,
    );
  }
}

export interface CaseRecordRes {
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
  lastUpdatedBy?: string | null;
  status: string;
  isClosed: boolean;
  closedAt?: string | null;
  closedBy?: string | null;
  eTag: number;
  lastUpdated?: string | null;
}

export type FetchCaseRecordRes = CaseRecordRes;

type UpdateCaseRecordReq = WithETag<{
  searchParams: {
    partyKeysSelection: string[];
    accountNumbersSelection: AccountNumberSelection[];
    sourceSystemsSelection: string[];
    productTypesSelection: string[];
    reviewPeriodSelection: ReviewPeriod[];
  };
}>;

type UpdateCaseRecordRes = CaseRecordRes;

type CloseCaseRecordReq = WithETag<Record<never, never>>;
type ActivateCaseRecordReq = WithETag<Record<never, never>>;
