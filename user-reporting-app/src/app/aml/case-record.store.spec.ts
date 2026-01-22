import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AppErrorHandlerService } from '../app-error-handler.service';
import { CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE } from './case-record.state.fixture';
import { CaseRecordState, CaseRecordStore } from './case-record.store';

describe('SessionDataService', () => {
  let store: CaseRecordStore;
  let httpMock: HttpTestingController;
  let errorHandlerSpy: jasmine.SpyObj<AppErrorHandlerService>;

  let mockAmlId: string;
  let mockCaseRecordState: CaseRecordState;

  beforeEach(() => {
    errorHandlerSpy = jasmine.createSpyObj('ErrorHandler', ['handleError']);

    TestBed.configureTestingModule({
      providers: [
        CaseRecordStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandler, useValue: errorHandlerSpy },
      ],
    });

    store = TestBed.inject(CaseRecordStore);
    httpMock = TestBed.inject(HttpTestingController);

    mockAmlId = CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE.amlId;
    mockCaseRecordState = CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('sessionStateValue', () => {
    it('should return the current value of sessionState BehaviorSubject', () => {
      expect(store['_state$'].value).toBeDefined();
    });
  });

  // describe("sessionState$", () => {
  //   it("should emit session state updates", (done) => {
  //     service.sessionState$.pipe(take(1)).subscribe((state) => {
  //       expect(state).toBeDefined();
  //       done();
  //     });
  //   });
  // });

  describe('latestSessionVersion$', () => {
    it('should emit the latest version from session state', async () => {
      const testState: CaseRecordState = {
        ...mockCaseRecordState,
        eTag: 5,
      };

      store['_state$'].next(testState);

      const version = await firstValueFrom(store.latestCaseRecordVersion$);

      expect(version).toBe(5);
    });
  });

  // describe("saving$", () => {
  //   it("should emit saving state changes", (done) => {
  //     service.savingSubject.next(true);

  //     service.savingStatus$.pipe(take(1)).subscribe((isSaving) => {
  //       expect(isSaving).toBe(true);
  //       done();
  //     });
  //   });
  // });

  //   describe('fetchSessionByAmlId', () => {
  //     it('should fetch session data and emit local session', async () => {
  //       const mockGetSessionResponse: GetCaseRecordResponse = {
  //         amlId: '999999',
  //         version: 0,
  //         data: {
  //           searchParams: {
  //             accountNumbersSelection: [],
  //             partyKeysSelection: [],
  //             productTypesSelection: [],
  //             reviewPeriodSelection: [],
  //             sourceSystemsSelection: [],
  //           },
  //           strTransactions: EDITED_TRANSACTIONS_DEV_OR_TEST_ONLY_FIXTURE.map(
  //             (txn) => ({
  //               ...txn,
  //               _hiddenTxnType: txn.flowOfFundsSource,
  //               _hiddenAmlId: '999999',
  //               _hiddenStrTxnId: txn.flowOfFundsAmlTransactionId,
  //               _version: 0,
  //               changeLogs: [],
  //             }),
  //           ),
  //         },
  //         updatedAt: '1996-06-13',
  //         createdAt: '1996-06-12',
  //         userId: 'test-user',
  //       };

  //       const {
  //         amlId: mockAmlId,
  //         version: mockVersion,
  //         data: {
  //           searchParams: mockTransactionSearchParam,
  //           strTransactions: mockStrTransactionsEdited = [],
  //         },
  //         updatedAt: mockUpdatedAt,
  //       } = mockGetSessionResponse;

  //       const result = firstValueFrom(store.fetchCaseRecordByAmlId(mockAmlId));

  //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);

  //       expect(req.request.method).toBe('GET');
  //       req.flush(mockGetSessionResponse);

  //       const {
  //         amlId,
  //         version,
  //         data: { searchParams, strTransactions },
  //       } = await result;

  //       expect(amlId).toBe(mockAmlId);
  //       expect(version).toBe(mockVersion);
  //       expect(searchParams).toEqual(mockTransactionSearchParam);
  //       expect(strTransactions).toEqual(mockStrTransactionsEdited);
  //       expect(store['_caseRecordState$'].value.version).toBe(mockVersion);
  //     });

  //     it('should handle HTTP errors', async () => {
  //       const resultPromise = firstValueFrom(
  //         store.fetchCaseRecordByAmlId(mockAmlId),
  //       );

  //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       req.flush('Not found', { status: 404, statusText: 'Not Found' });

  //       await expectAsync(resultPromise).toBeRejectedWith(
  //         jasmine.objectContaining({ status: 404 }),
  //       );

  //       expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
  //         jasmine.objectContaining({
  //           status: 404,
  //           statusText: 'Not Found',
  //         }),
  //       );
  //     });
  //   });

  //   describe('createSession', () => {
  //     it('should create a new session with version 0 and emit local state', async () => {
  //       const mockCreateResponse: CreateSessionResponse = {
  //         amlId: '999999',
  //         userId: 'test-user',
  //         version: 0,
  //         createdAt: '1996-06-12',
  //       };
  //       const { amlId: mockAmlId, version: mockVersion } = mockCreateResponse;

  //       const result = firstValueFrom(store.createSession(mockAmlId));

  //       const req = httpMock.expectOne('/api/sessions');

  //       expect(req.request.method).toBe('POST');
  //       expect(req.request.body.amlId).toBe(mockAmlId);
  //       req.flush(mockCreateResponse);

  //       const { version, amlId } = await result;

  //       expect(version).toBe(mockVersion);
  //       expect(amlId).toBe(mockAmlId);
  //       expect(store['_caseRecordState$'].value.version).toBe(mockVersion);
  //     });

  //     it('should initialize session state with empty selections', async () => {
  //       const mockCreateResponse: CreateSessionResponse = {
  //         amlId: '999999',
  //         userId: 'test-user',
  //         version: 0,
  //         createdAt: '1996-06-12',
  //       };
  //       const { amlId: mockAmlId } = mockCreateResponse;

  //       const result = firstValueFrom(store.createSession(mockAmlId));

  //       const req = httpMock.expectOne('/api/sessions');
  //       req.flush(mockCreateResponse);

  //       await result;

  //       const {
  //         searchParams: {
  //           accountNumbersSelection,
  //           partyKeysSelection,
  //           productTypesSelection,
  //           reviewPeriodSelection,
  //           sourceSystemsSelection,
  //         },
  //         strTransactions,
  //       } = store['_caseRecordState$'].value;

  //       expect(accountNumbersSelection).toEqual([]);
  //       expect(partyKeysSelection).toEqual([]);
  //       expect(productTypesSelection).toEqual([]);
  //       expect(reviewPeriodSelection).toEqual([]);
  //       expect(sourceSystemsSelection).toEqual([]);
  //       expect(strTransactions).toEqual([]);
  //     });
  //   });

  //   //   describe("update (private method)", () => {
  //   //     beforeEach(() => {
  //   //       // Set up initial session state
  //   //       service["sessionState"].next({
  //   //         amlId: mockAmlId,
  //   //         version: 1,
  //   //         searchParams: mockSessionState.data.searchParams,
  //   //         strTransactionsEdited: [
  //   //           {
  //   //             _hiddenStrTxnId: "txn-1",
  //   //             changeLogs: [],
  //   //           },
  //   //         ],
  //   //       });
  //   //     });

  //   //     it("should update session and increment version", (done) => {
  //   //       const changeLogs = [
  //   //         {
  //   //           strTxnId: "txn-1",
  //   //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //   //         },
  //   //       ];

  //   //       const updateResponse = {
  //   //         newVersion: 2,
  //   //         updatedAt: "2025-10-29T01:00:00Z",
  //   //       };

  //   //       service["update"](
  //   //         mockAmlId,
  //   //         service.sessionStateValue,
  //   //         changeLogs,
  //   //       ).subscribe((result) => {
  //   //         expect(result.version).toBe(2);
  //   //         expect(service.sessionStateValue.version).toBe(2);
  //   //         done();
  //   //       });

  //   //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //   //       expect(req.request.method).toBe("PUT");
  //   //       expect(req.request.body.currentVersion).toBe(1);
  //   //       req.flush(updateResponse);
  //   //     });

  //   //     it("should set saving state to true during update", () => {
  //   //       const changeLogs = [
  //   //         {
  //   //           strTxnId: "txn-1",
  //   //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //   //         },
  //   //       ];

  //   //       service["update"](
  //   //         mockAmlId,
  //   //         service.sessionStateValue,
  //   //         changeLogs,
  //   //       ).subscribe();

  //   //       expect(service.savingSubject.value).toBe(true);

  //   //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //   //       req.flush({ newVersion: 2, updatedAt: "2025-10-29T01:00:00Z" });
  //   //     });

  //   //     it("should set saving state to false after update completes", (done) => {
  //   //       const changeLogs = [
  //   //         {
  //   //           strTxnId: "txn-1",
  //   //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //   //         },
  //   //       ];

  //   //       service["update"](
  //   //         mockAmlId,
  //   //         service.sessionStateValue,
  //   //         changeLogs,
  //   //       ).subscribe(() => {
  //   //         expect(service.savingSubject.value).toBe(false);
  //   //         done();
  //   //       });

  //   //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //   //       req.flush({ newVersion: 2, updatedAt: "2025-10-29T01:00:00Z" });
  //   //     });

  //   //     it("should rollback session state on error", (done) => {
  //   //       const originalState = service.sessionStateValue;
  //   //       const changeLogs = [
  //   //         {
  //   //           strTxnId: "txn-1",
  //   //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //   //         },
  //   //       ];

  //   //       service["update"](mockAmlId, originalState, changeLogs).subscribe({
  //   //         error: () => {
  //   //           expect(service.sessionStateValue).toEqual(originalState);
  //   //           done();
  //   //         },
  //   //       });

  //   //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //   //       req.flush("Server error", {
  //   //         status: 500,
  //   //         statusText: "Internal Server Error",
  //   //       });
  //   //     });

  //   //     it("should emit conflict$ and refetch session on 409 conflict", (done) => {
  //   //       const conflictSpy = jasmine.createSpy("conflict");
  //   //       service.conflict$.subscribe(conflictSpy);

  //   //       const changeLogs = [
  //   //         {
  //   //           strTxnId: "txn-1",
  //   //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //   //         },
  //   //       ];

  //   //       service["update"](
  //   //         mockAmlId,
  //   //         service.sessionStateValue,
  //   //         changeLogs,
  //   //       ).subscribe({
  //   //         error: (error) => {
  //   //           expect(error.status).toBe(409);
  //   //           expect(conflictSpy).toHaveBeenCalled();
  //   //           done();
  //   //         },
  //   //       });

  //   //       const updateReq = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //   //       updateReq.flush("Conflict", { status: 409, statusText: "Conflict" });

  //   //       const fetchReq = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //   //       fetchReq.flush(mockSessionState);
  //   //     });

  //   //     it("should return EMPTY when no versioned edits are present", (done) => {
  //   //       const changeLogs = [
  //   //         {
  //   //           strTxnId: "txn-1",
  //   //           changeLogs: [],
  //   //         },
  //   //       ];

  //   //       service["update"](
  //   //         mockAmlId,
  //   //         service.sessionStateValue,
  //   //         changeLogs,
  //   //       ).subscribe({
  //   //         complete: () => {
  //   //           done();
  //   //         },
  //   //       });
  //   //     });

  //   //     it("should set saving state to false on error", (done) => {
  //   //       const changeLogs = [
  //   //         {
  //   //           strTxnId: "txn-1",
  //   //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //   //         },
  //   //       ];

  //   //       service["update"](
  //   //         mockAmlId,
  //   //         service.sessionStateValue,
  //   //         changeLogs,
  //   //       ).subscribe({
  //   //         error: () => {
  //   //           expect(service.savingSubject.value).toBe(false);
  //   //           done();
  //   //         },
  //   //       });

  //   //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //   //       req.flush("Error", { status: 500, statusText: "Internal Server Error" });
  //   //     });
  //   //   });

  //   // describe("conflict$", () => {
  //   //   it("should be a Subject that can emit conflict events", (done) => {
  //   //     service.conflict$.subscribe(() => {
  //   //       expect(true).toBe(true);
  //   //       done();
  //   //     });

  //   //     service.conflict$.next();
  //   //   });
  //   // });
});
