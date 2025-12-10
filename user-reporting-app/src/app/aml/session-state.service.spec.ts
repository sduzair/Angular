/* eslint-disable vitest/no-commented-out-tests */
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs';
import {
  EDITED_TRANSACTIONS_DEV_OR_TEST_ONLY_FIXTURE,
  SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE,
} from './session-state.fixture';
import {
  CreateSessionResponse,
  GetSessionResponse,
  SessionStateLocal,
  SessionStateService,
} from './session-state.service';

describe('SessionDataService', () => {
  let service: SessionStateService;
  let httpMock: HttpTestingController;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandler>;

  let mockAmlId: string;
  let mockSessionState: SessionStateLocal;

  beforeEach(() => {
    errorHandlerSpy = jasmine.createSpyObj('ErrorHandler', ['handleError']);

    TestBed.configureTestingModule({
      providers: [
        SessionStateService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandler, useValue: errorHandlerSpy },
      ],
    });

    service = TestBed.inject(SessionStateService);
    httpMock = TestBed.inject(HttpTestingController);

    mockAmlId = SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE.amlId;
    mockSessionState = SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sessionStateValue', () => {
    it('should return the current value of sessionState BehaviorSubject', () => {
      const sessionStateValue = service.getSessionStateValue();
      expect(sessionStateValue).toBeDefined();
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
    it('should emit the latest version from session state', (done) => {
      const testState: SessionStateLocal = {
        amlId: mockAmlId,
        version: 5,
        transactionSearchParams: mockSessionState.transactionSearchParams,
        strTransactions: [],
      };

      service['_sessionState$'].next(testState);

      service.latestSessionVersion$.pipe(take(1)).subscribe((version) => {
        expect(version).toBe(5);
        done();
      });
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

  describe('fetchSessionByAmlId', () => {
    it('should fetch session data and emit local session', (done) => {
      const mockGetSessionResponse: GetSessionResponse = {
        amlId: '999999',
        version: 0,
        data: {
          transactionSearchParams: {
            accountNumbersSelection: [],
            partyKeysSelection: [],
            productTypesSelection: [],
            reviewPeriodSelection: [],
            sourceSystemsSelection: [],
          },
          strTransactions: EDITED_TRANSACTIONS_DEV_OR_TEST_ONLY_FIXTURE.map(
            (txn) => ({
              ...txn,
              _hiddenTxnType: txn.flowOfFundsSource,
              _hiddenAmlId: '999999',
              _hiddenStrTxnId: txn.flowOfFundsAmlTransactionId,
              _version: 0,
              changeLogs: [],
            }),
          ),
        },
        updatedAt: '1996-06-13',
        createdAt: '1996-06-12',
        userId: 'test-user',
      };

      const {
        amlId: mockAmlId,
        version: mockVersion,
        data: {
          transactionSearchParams: mockTransactionSearchParam,
          strTransactions: mockStrTransactionsEdited = [],
        },
        updatedAt: mockUpdatedAt,
      } = mockGetSessionResponse;

      service
        .fetchSessionByAmlId(mockAmlId)
        .subscribe(
          ({
            amlId,
            version,
            data: { transactionSearchParams, strTransactions },
          }) => {
            expect(amlId).toBe(mockAmlId);
            expect(version).toBe(mockVersion);
            expect(transactionSearchParams).toEqual(mockTransactionSearchParam);
            expect(strTransactions).toEqual(mockStrTransactionsEdited);
            expect(service.getSessionStateValue()!.version).toBe(mockVersion);
            done();
          },
        );

      const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockGetSessionResponse);
    });

    it('should handle HTTP errors', (done) => {
      service.fetchSessionByAmlId(mockAmlId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createSession', () => {
    it('should create a new session with version 0 and emit local state', (done) => {
      const mockCreateResponse: CreateSessionResponse = {
        amlId: '999999',
        userId: 'test-user',
        version: 0,
        createdAt: '1996-06-12',
      };
      const { amlId: mockAmlId, version: mockVersion } = mockCreateResponse;

      service.createSession(mockAmlId).subscribe(({ version, amlId }) => {
        expect(version).toBe(mockVersion);
        expect(amlId).toBe(mockAmlId);
        expect(service.getSessionStateValue()!.version).toBe(mockVersion);
        done();
      });

      const req = httpMock.expectOne('/api/sessions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.amlId).toBe(mockAmlId);
      req.flush(mockCreateResponse);
    });

    it('should initialize session state with empty selections', (done) => {
      const mockCreateResponse: CreateSessionResponse = {
        amlId: '999999',
        userId: 'test-user',
        version: 0,
        createdAt: '1996-06-12',
      };
      const { amlId: mockAmlId } = mockCreateResponse;

      service.createSession(mockAmlId).subscribe(() => {
        const {
          transactionSearchParams: {
            accountNumbersSelection,
            partyKeysSelection,
            productTypesSelection,
            reviewPeriodSelection,
            sourceSystemsSelection,
          },
          strTransactions,
        } = service.getSessionStateValue()!;
        expect(accountNumbersSelection).toEqual([]);
        expect(partyKeysSelection).toEqual([]);
        expect(productTypesSelection).toEqual([]);
        expect(reviewPeriodSelection).toEqual([]);
        expect(sourceSystemsSelection).toEqual([]);
        expect(strTransactions).toEqual([]);
        done();
      });

      const req = httpMock.expectOne('/api/sessions');
      req.flush(mockCreateResponse);
    });
  });

  //   describe("update (private method)", () => {
  //     beforeEach(() => {
  //       // Set up initial session state
  //       service["sessionState"].next({
  //         amlId: mockAmlId,
  //         version: 1,
  //         transactionSearchParams: mockSessionState.data.transactionSearchParams,
  //         strTransactionsEdited: [
  //           {
  //             _hiddenStrTxnId: "txn-1",
  //             changeLogs: [],
  //           },
  //         ],
  //       });
  //     });

  //     it("should update session and increment version", (done) => {
  //       const changeLogs = [
  //         {
  //           strTxnId: "txn-1",
  //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //         },
  //       ];

  //       const updateResponse = {
  //         newVersion: 2,
  //         updatedAt: "2025-10-29T01:00:00Z",
  //       };

  //       service["update"](
  //         mockAmlId,
  //         service.sessionStateValue,
  //         changeLogs,
  //       ).subscribe((result) => {
  //         expect(result.version).toBe(2);
  //         expect(service.sessionStateValue.version).toBe(2);
  //         done();
  //       });

  //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       expect(req.request.method).toBe("PUT");
  //       expect(req.request.body.currentVersion).toBe(1);
  //       req.flush(updateResponse);
  //     });

  //     it("should set saving state to true during update", () => {
  //       const changeLogs = [
  //         {
  //           strTxnId: "txn-1",
  //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //         },
  //       ];

  //       service["update"](
  //         mockAmlId,
  //         service.sessionStateValue,
  //         changeLogs,
  //       ).subscribe();

  //       expect(service.savingSubject.value).toBe(true);

  //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       req.flush({ newVersion: 2, updatedAt: "2025-10-29T01:00:00Z" });
  //     });

  //     it("should set saving state to false after update completes", (done) => {
  //       const changeLogs = [
  //         {
  //           strTxnId: "txn-1",
  //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //         },
  //       ];

  //       service["update"](
  //         mockAmlId,
  //         service.sessionStateValue,
  //         changeLogs,
  //       ).subscribe(() => {
  //         expect(service.savingSubject.value).toBe(false);
  //         done();
  //       });

  //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       req.flush({ newVersion: 2, updatedAt: "2025-10-29T01:00:00Z" });
  //     });

  //     it("should rollback session state on error", (done) => {
  //       const originalState = service.sessionStateValue;
  //       const changeLogs = [
  //         {
  //           strTxnId: "txn-1",
  //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //         },
  //       ];

  //       service["update"](mockAmlId, originalState, changeLogs).subscribe({
  //         error: () => {
  //           expect(service.sessionStateValue).toEqual(originalState);
  //           done();
  //         },
  //       });

  //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       req.flush("Server error", {
  //         status: 500,
  //         statusText: "Internal Server Error",
  //       });
  //     });

  //     it("should emit conflict$ and refetch session on 409 conflict", (done) => {
  //       const conflictSpy = jasmine.createSpy("conflict");
  //       service.conflict$.subscribe(conflictSpy);

  //       const changeLogs = [
  //         {
  //           strTxnId: "txn-1",
  //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //         },
  //       ];

  //       service["update"](
  //         mockAmlId,
  //         service.sessionStateValue,
  //         changeLogs,
  //       ).subscribe({
  //         error: (error) => {
  //           expect(error.status).toBe(409);
  //           expect(conflictSpy).toHaveBeenCalled();
  //           done();
  //         },
  //       });

  //       const updateReq = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       updateReq.flush("Conflict", { status: 409, statusText: "Conflict" });

  //       const fetchReq = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       fetchReq.flush(mockSessionState);
  //     });

  //     it("should return EMPTY when no versioned edits are present", (done) => {
  //       const changeLogs = [
  //         {
  //           strTxnId: "txn-1",
  //           changeLogs: [],
  //         },
  //       ];

  //       service["update"](
  //         mockAmlId,
  //         service.sessionStateValue,
  //         changeLogs,
  //       ).subscribe({
  //         complete: () => {
  //           done();
  //         },
  //       });
  //     });

  //     it("should set saving state to false on error", (done) => {
  //       const changeLogs = [
  //         {
  //           strTxnId: "txn-1",
  //           changeLogs: [{ field: "amount", oldValue: "100", newValue: "200" }],
  //         },
  //       ];

  //       service["update"](
  //         mockAmlId,
  //         service.sessionStateValue,
  //         changeLogs,
  //       ).subscribe({
  //         error: () => {
  //           expect(service.savingSubject.value).toBe(false);
  //           done();
  //         },
  //       });

  //       const req = httpMock.expectOne(`/api/sessions/${mockAmlId}`);
  //       req.flush("Error", { status: 500, statusText: "Internal Server Error" });
  //     });
  //   });

  // describe("conflict$", () => {
  //   it("should be a Subject that can emit conflict events", (done) => {
  //     service.conflict$.subscribe(() => {
  //       expect(true).toBe(true);
  //       done();
  //     });

  //     service.conflict$.next();
  //   });
  // });
});
