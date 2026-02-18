import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChangeLogAudit } from '../aml/case-record.store';

@Injectable({
  providedIn: 'root',
})
export class SelectionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/caserecord';

  fetchSelections(caseRecordId: string) {
    // return of({
    //   selections: CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE.selections,
    // }).pipe(delay(100));

    return this.http.get<FetchSelectionsRes>(
      `${this.baseUrl}/${caseRecordId}/selections`,
    );
  }

  addSelectionsAndParties(
    caseRecordId: string,
    request: AddSelectionsReq,
  ): Observable<AddSelectionsRes> {
    return this.http.post<AddSelectionsRes>(
      `${this.baseUrl}/${caseRecordId}/selections/add`,
      request,
    );
  }

  removeSelections(
    caseRecordId: string,
    request: RemoveSelectionsReq,
  ): Observable<RemoveSelectionsRes> {
    return this.http.post<RemoveSelectionsRes>(
      `${this.baseUrl}/${caseRecordId}/selections/remove`,
      request,
    );
  }

  saveChanges(
    caseRecordId: string,
    request: SaveChangesReq,
  ): Observable<SaveChangesRes> {
    // return of(void 0).pipe(delay(150));

    return this.http.post<SaveChangesRes>(
      `${this.baseUrl}/${caseRecordId}/selections/save`,
      request,
    );
  }

  resetSelections(
    caseRecordId: string,
    request: ResetSelectionsReq,
  ): Observable<ResetSelectionsRes> {
    // return of(void 0).pipe(delay(150));

    return this.http.post<ResetSelectionsRes>(
      `${this.baseUrl}/${caseRecordId}/selections/reset`,
      request,
    );
  }
}

export interface SelectionRes {
  caseRecordId: string;
  flowOfFundsAmlTransactionId: string;
  isClosed?: boolean; // denormalized from case record
  eTag: number;
  changeLogs: ChangeLogAudit[];
  [key: string]: unknown; // extra elements from BsonDocument
}

export interface PartyRes {
  partyIdentifier: string;
  caseRecordId: string;
  [key: string]: unknown;
}

// ---- Fetch ----

export interface FetchSelectionsRes {
  selectionList: SelectionRes[];
  partyList: PartyRes[];
}

// ---- Add ----

interface AddSelectionsReq {
  caseETag: number;
  selections: Omit<SelectionRes, 'isClosed' | 'eTag' | 'changeLogs'>[];
  parties: Omit<PartyRes, 'caseRecordId'>[];
}

export interface AddSelectionsRes {
  caseETag: number;
  selectionCount: number;
  partyCount: number;
  lastUpdated: string;
}

// ---- Remove ----

export interface RemoveSelectionsReq {
  caseETag: number;
  selectionIds: string[]; // flowOfFundsAmlTransactionId values
}

export interface RemoveSelectionsRes {
  caseETag: number;
  count: number;
  lastUpdated: string;
}

// ---- Save ----

export interface PendingChange {
  flowOfFundsAmlTransactionId: string;
  eTag: number;
  changeLogs: Omit<ChangeLogAudit, 'updatedAt' | 'updatedBy' | 'eTag'>[];
}

export interface SaveChangesReq {
  pendingChanges: PendingChange[];
}

export interface SaveChangesRes {
  message: string;
  requested: number;
  succeeded: number;
  updatedBy: string;
  updatedAt: string;
}

// ---- Reset ----

export interface PendingReset {
  flowOfFundsAmlTransactionId: string;
  eTag: number;
}

export interface ResetSelectionsReq {
  pendingResets: PendingReset[];
}

export interface ResetSelectionsRes {
  message: string;
  requested: number;
  succeeded: number;
}

export type WithCaseRecordId<T = object> = T & {
  caseRecordId: string;
};

// Error response types
export interface ConflictResponse {
  message: string;
  currentETag?: number;
  requestedETag?: number;
  requested?: number;
  succeeded?: number;
}

export interface NotFoundResponse {
  message: string;
}
