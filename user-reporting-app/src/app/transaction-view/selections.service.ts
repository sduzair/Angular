import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { StrTransactionWithChangeLogs } from '../aml/case-record.store';
import * as ChangeLog from '../change-logging/change-log';
import { StrTxnFlowOfFunds } from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';

@Injectable({
  providedIn: 'root',
})
export class SelectionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/caserecord';

  /**
   * Fetch all selections for a case record
   */
  fetchSelections(
    caseRecordId: string,
  ): Observable<StrTransactionWithChangeLogs[]> {
    // return of({
    //   selections: CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE.selections,
    // }).pipe(delay(100));

    return this.http
      .get<FetchSelectionsResponse>(
        `${this.baseUrl}/${caseRecordId}/selections`,
      )
      .pipe(
        map((response) => response.selections),
      );
  }

  /**
   * Add selections to a case record
   */
  addSelections(
    caseRecordId: string,
    request: AddSelectionsRequest,
  ): Observable<AddSelectionsResponse> {
    return this.http
      .post<AddSelectionsResponse>(
        `${this.baseUrl}/${caseRecordId}/selections/add`,
        request,
      )
  }

  /**
   * Remove selections from a case record
   */
  removeSelections(
    caseRecordId: string,
    request: RemoveSelectionsRequest,
  ): Observable<RemoveSelectionsResponse> {
    return this.http
      .post<RemoveSelectionsResponse>(
        `${this.baseUrl}/${caseRecordId}/selections/remove`,
        request,
      )
  }

  /**
   * Save changes to selections
   */
  saveChanges(
    caseRecordId: string,
    request: SaveChangesRequest,
  ): Observable<SaveChangesResponse> {
    // return of(void 0).pipe(delay(150));

    return this.http
      .post<SaveChangesResponse>(
        `${this.baseUrl}/${caseRecordId}/selections/save`,
        request,
      )
  }

  /**
   * Reset selections to their original state
   */
  resetSelections(
    caseRecordId: string,
    request: ResetSelectionsRequest,
  ): Observable<ResetSelectionsResponse> {
    // return of(void 0).pipe(delay(150));

    return this.http
      .post<ResetSelectionsResponse>(
        `${this.baseUrl}/${caseRecordId}/selections/reset`,
        request,
      )
  }
}

// Request DTOs
export interface AddSelectionsRequest {
  caseETag: number;
  selections: Omit<
    StrTransactionWithChangeLogs,
    'caseRecordId' | 'eTag' | 'changeLogs'
  >[];
}

export interface RemoveSelectionsRequest {
  caseETag: number;
  selectionIds: StrTxnFlowOfFunds['flowOfFundsAmlTransactionId'][];
}

export interface PendingChange {
  flowOfFundsAmlTransactionId: string;
  eTag: number;
  changeLogs: ChangeLog.ChangeLogType[];
}

export interface SaveChangesRequest {
  pendingChanges: PendingChange[];
}

export interface PendingReset {
  flowOfFundsAmlTransactionId: string;
  eTag: number;
}

export interface ResetSelectionsRequest {
  pendingResets: PendingReset[];
}

// Response DTOs
export interface FetchSelectionsResponse {
  selections: StrTransactionWithChangeLogs[];
}

export interface AddSelectionsResponse {
  caseETag: number;
  count: number;
  lastUpdated: string;
}

export interface RemoveSelectionsResponse {
  caseETag: number;
  count: number;
  lastUpdated: string;
}

export interface SaveChangesResponse {
  message: string;
  requested: number;
  succeeded: number;
  updatedBy: string;
  updatedAt: string;
}

export interface ResetSelectionsResponse {
  message: string;
  requested: number;
  succeeded: number;
}

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
