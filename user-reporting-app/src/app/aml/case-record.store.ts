import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ErrorHandler,
  Injectable,
  InjectionToken,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { uniqBy } from 'lodash-es';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  forkJoin,
  map,
  merge,
  of,
  throwError,
} from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  defaultIfEmpty,
  distinctUntilChanged,
  filter,
  finalize,
  pairwise,
  scan,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { AuthService } from '../auth.service';
import * as ChangeLog from '../change-logging/change-log';
import {
  hasEntityName,
  hasInvalidFiu,
  hasMissingAccountInfo,
  hasMissingBasicInfo,
  hasMissingBeneficiary,
  hasMissingCheque,
  hasMissingConductorInfo,
  hasPersonName,
} from '../reporting-ui/edit-form/common-validation';
import { EditFormValueType } from '../reporting-ui/edit-form/edit-form.component';
import {
  StrTransaction,
  WithETag,
  _hiddenValidationType,
} from '../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { DeepPartial } from '../test-helpers';
import { type RouteExtrasFromSearch } from '../transaction-search/transaction-search.component';
import {
  AccountNumberSelection,
  TransactionSearchResponse,
} from '../transaction-search/transaction-search.service';
import {
  EntityRes,
  PendingChange,
  RemoveSelectionsReq,
  ResetSelectionsReq,
  SaveChangesReq,
  SelectionRes,
  SelectionsService,
  WithCaseRecordId,
} from '../transaction-view/selections.service';
import {
  EntityGenService,
  EntityGenType,
} from '../transaction-view/transform-to-str-transaction/entity-gen.service';
import { CaseRecordService } from './case-record.service';
import { Dialog } from '@angular/cdk/dialog';
import { SnackbarQueueService } from '../snackbar-queue.service';

export const DEFAULT_CASE_RECORD_STATE: CaseRecordState = {
  searchResponse: [],
  caseRecordId: '',
  amlId: '',
  searchParams: {
    accountNumbersSelection: [],
    partyKeysSelection: [],
    productTypesSelection: [],
    reviewPeriodSelection: [],
    sourceSystemsSelection: [],
  },
  searchParamsHash: '',
  lastSearchedParamsHash: '',
  createdAt: '',
  createdBy: '',
  status: '',
  isClosed: false,
  closedAt: null,
  closedBy: null,
  eTag: NaN,
  selections: [],
  entities: [],
  lastUpdated: null,
};

export const CASE_RECORD_INITIAL_STATE = new InjectionToken<CaseRecordState>(
  'CASE_RECORD_INITIAL_STATE',
  {
    factory: () => DEFAULT_CASE_RECORD_STATE,
  },
);

@Injectable()
export class CaseRecordStore {
  private entityGenService = inject(EntityGenService);

  private selectionsService = inject(SelectionsService);
  private caseRecordService = inject(CaseRecordService);
  private errorHandler = inject(ErrorHandler);
  private readonly initialState = inject(CASE_RECORD_INITIAL_STATE);
  private auth = inject(AuthService);
  private snackBar = inject(SnackbarQueueService);

  // --- STATE STREAMS ---
  // NOTE: All state mutations must spread existing state to preserve reference equality on unchanged properties.
  private _state$ = new BehaviorSubject<CaseRecordState>(this.initialState);

  public state$ = this._state$.asObservable();

  private _conflict$ = new Subject<void>();
  readonly conflict$ = this._conflict$.asObservable();
  readonly latestCaseRecordVersion$ = this._state$.pipe(
    map((sessionState) => sessionState?.eTag),
  );

  readonly lastUpdated$ = this._state$.pipe(
    map((caseRecordState) => caseRecordState.lastUpdated!),
    startWith(new Date(0).toISOString().split('T')[0]),
  );
  readonly status$ = this._state$.pipe(
    map(({ status }) => status),
    distinctUntilChanged(),
  );

  readonly isClosed$ = this._state$.pipe(
    map(({ isClosed }) => isClosed),
    distinctUntilChanged(),
  );

  readonly searchParamsChanged$ = this._state$.pipe(
    map(
      ({ searchParamsHash, lastSearchedParamsHash }) =>
        searchParamsHash === lastSearchedParamsHash,
    ),
    distinctUntilChanged(),
  );

  // --- SAVING STATUS ---
  private _qActiveSaveIds$ = new BehaviorSubject<string[]>([]);
  public qActiveSaveIds$ = this._qActiveSaveIds$.asObservable();
  qIsSaving$ = this.qActiveSaveIds$.pipe(map((txns) => txns.length > 0));

  private processedSaveIds$ = this.qActiveSaveIds$.pipe(
    pairwise(),
    map(([prev, curr]) => {
      // IDs that were being saved but are now processed
      return prev.filter((id) => !curr.includes(id));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  whenProcessed(saveIds: string[]): Observable<string[]> {
    return this.processedSaveIds$.pipe(
      filter(
        (processed) =>
          processed.length > 0 && saveIds.every((id) => processed.includes(id)),
      ),
    );
  }

  private markSavesAsProcessed(incomingSaves: string[]) {
    const remaining = [...this._qActiveSaveIds$.value];
    incomingSaves.forEach((id) => {
      const index = remaining.indexOf(id);
      if (index > -1) {
        remaining.splice(index, 1);
      }
    });
    this._qActiveSaveIds$.next(remaining);
  }

  constructor() {
    // Subscribe immediately to ensure str transaction data accumulates from first emission
    this.selectionsComputed$.pipe(takeUntilDestroyed()).subscribe({
      error: () => {
        console.assert(
          false,
          'Assert errors are handled gracefully in pipeline',
        );
      },
    });

    // Activate the highlight saves pipeline
    this.highlightEditsSave$.pipe(takeUntilDestroyed()).subscribe();

    // Start accepting pending changes for saving
    this.updateQueue$.pipe(takeUntilDestroyed()).subscribe({
      error: () => {
        console.assert(
          false,
          'Assert errors are handled gracefully in pipeline',
        );
      },
    });

    this._conflict$
      .pipe(
        switchMap(() => {
          this.snackBar.open(
            'This record was updated by another user — retrieving remote changes.',
          );
          return forkJoin([
            this.fetchCaseRecordByAmlId(this._state$.value.amlId),
            this.fetchSelectionsAndEntities(),
          ]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  // --- VIEW MODEL FOR REPORTING UI DATA ---
  readonly selectionsComputed$ = this._state$.pipe(
    // Filter ensures we only proceed if there is work to do
    filter(
      ({
        selectionsWithPendingChanges,
        selectionsToAdd,
        selectionsToRemove,
        resetAndAddSelections,
        selections,
      }) =>
        (selectionsWithPendingChanges ?? []).length > 0 ||
        (selectionsToAdd ?? []).length > 0 ||
        (selectionsToRemove ?? []).length > 0 ||
        (resetAndAddSelections ?? []).length > 0 ||
        selections.length === 0, // Allow pass-through for reset/clear scenarios
    ),
    map(
      ({
        selections: currentSelections,
        selectionsWithPendingChanges = [],
        selectionsToAdd = [],
        selectionsToRemove = [],
        resetAndAddSelections = [],
        entities: currentEntities,
      }) => {
        if (resetAndAddSelections.length > 0) {
          const _cloneSelectionIds = structuredClone(resetAndAddSelections);
          // eslint-disable-next-line no-param-reassign
          resetAndAddSelections.length = 0;
          return resetAndAddSelectionsHandler({
            selections: currentSelections,
            selectionsToAdd: _cloneSelectionIds,
            entities: currentEntities,
          });
        }
        if (selectionsWithPendingChanges.length > 0) {
          const _cloneSelectionIds = structuredClone(
            selectionsWithPendingChanges,
          );
          // eslint-disable-next-line no-param-reassign
          selectionsWithPendingChanges.length = 0;
          return computePartialChangesHandler({
            selections: currentSelections,
            selectionsToRecompute: _cloneSelectionIds,
            entities: currentEntities,
          });
        }

        if (selectionsToAdd.length > 0) {
          const _cloneSelectionIds = structuredClone(selectionsToAdd);
          // eslint-disable-next-line no-param-reassign
          selectionsToAdd.length = 0;
          return addSelectionsHandler({
            selections: currentSelections,
            selectionsToAdd: _cloneSelectionIds,
            entities: currentEntities,
          });
        }

        if (selectionsToRemove.length > 0) {
          const _cloneSelectionIds = structuredClone(selectionsToRemove);
          // eslint-disable-next-line no-param-reassign
          selectionsToRemove.length = 0;
          return (acc: StrTransactionWithChangeLogs[]) => {
            return acc.filter(
              (txn) =>
                !_cloneSelectionIds.includes(txn.flowOfFundsAmlTransactionId),
            );
          };
        }

        if (currentSelections.length == 0) return () => [];

        throw new Error('Unexpected state selections change');
      },
    ),
    scan((acc, handler) => {
      try {
        return handler(acc);
      } catch (error) {
        this.errorHandler.handleError(error);
        return acc;
      }
    }, [] as StrTransactionWithChangeLogs[]),
    catchError((error) => {
      this.errorHandler.handleError(error);
      return of();
    }),
    takeUntilDestroyed(),
    shareReplay({ bufferSize: 1, refCount: false }), // stream never dies in aml component scope
  );

  // --- EDIT QUEUE ---
  private _updateQueue$ = new Subject<
    | {
        editType: 'SINGLE_SAVE';
        flowOfFundsAmlTransactionId: string;
        selectionAfter: EditFormValueType;
      }
    | {
        editType: 'BULK_SAVE';
        selectionAfter: EditFormValueType;
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
    | { editType: 'HIGHLIGHT'; highlightsMap: Map<string, string> }
    | {
        editType: 'ADD_SELECTIONS_MANUAL';
        manualSelectionsAndEntities: {
          manualSelection: StrTransactionWithChangeLogs;
          manualEntities: EntityGenType[];
        }[];
      }
    | {
        editType: 'ADD_ENTITIES';
        entities: EntityGenType[];
      }
    | {
        editType: 'RESET_SELECTIONS';
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
    | {
        editType: 'REMOVE_SELECTIONS';
        selectionIds: StrTransaction['flowOfFundsAmlTransactionId'][];
      }
  >();

  private updateQueue$ = this._updateQueue$.asObservable().pipe(
    map((edit) => {
      const existingSaveIds = this._qActiveSaveIds$.value;
      let incomingSaves: string[] = [];

      if (edit.editType === 'SINGLE_SAVE') {
        incomingSaves = [edit.flowOfFundsAmlTransactionId];
      }
      if (edit.editType === 'BULK_SAVE') {
        incomingSaves = edit.selectionIds;
      }
      if (edit.editType === 'HIGHLIGHT') {
        incomingSaves = Array.from(edit.highlightsMap.keys());
      }
      if (edit.editType === 'ADD_SELECTIONS_MANUAL') {
        incomingSaves = edit.manualSelectionsAndEntities.map(
          ({ manualSelection }) => manualSelection.flowOfFundsAmlTransactionId,
        );
      }
      if (edit.editType === 'ADD_ENTITIES') {
        /* empty */
      }
      if (edit.editType === 'RESET_SELECTIONS') {
        incomingSaves = edit.selectionIds;
      }

      this._qActiveSaveIds$.next([...existingSaveIds, ...incomingSaves]);
      return { edit, incomingSaves };
    }),
    concatMap(({ edit, incomingSaves }) => {
      return of(edit).pipe(
        withLatestFrom(
          this.selectionsComputed$,
          this._state$.pipe(map(({ selections }) => selections)),
        ),
        map(([edit, selectionsComputed, selectionsCurrent]) => {
          const { editType } = edit;
          const pendingChanges: SaveChangesReq['pendingChanges'] = [];
          const selectionsAndEntitiesToAdd: {
            selection?: StrTransactionWithChangeLogs;
            entities: EntityGenType[];
          }[] = [];
          const selectionsToReset: ResetSelectionsReq['pendingResets'] = [];
          const selectionsToRemove: RemoveSelectionsReq['selectionIds'] = [];

          if (editType === 'SINGLE_SAVE') {
            const {
              selectionAfter: transactionAfter,
              flowOfFundsAmlTransactionId,
            } = edit;
            const transactionBefore = selectionsComputed.find(
              (txn) =>
                txn.flowOfFundsAmlTransactionId === flowOfFundsAmlTransactionId,
            )!;

            const changeLogs = ChangeLog.generateChangeLogs(
              transactionBefore,
              transactionAfter as StrTransactionWithChangeLogs,
            );
            pendingChanges.push({
              flowOfFundsAmlTransactionId,
              changeLogs: changeLogs,
              eTag: transactionBefore.eTag ?? 0,
            });
          }

          if (editType === 'BULK_SAVE') {
            const {
              selectionIds: selections,
              selectionAfter: transactionAfter,
            } = edit;
            selections.forEach((selection) => {
              const transactionBefore = selectionsComputed.find(
                (txn) => txn.flowOfFundsAmlTransactionId === selection,
              )!;

              const changeLogs = ChangeLog.generateChangeLogs(
                transactionBefore,
                transactionAfter as StrTransactionWithChangeLogs,
                { isBulkEdit: true },
              );

              pendingChanges.push({
                flowOfFundsAmlTransactionId:
                  transactionBefore.flowOfFundsAmlTransactionId,
                changeLogs: changeLogs,
                eTag: transactionBefore.eTag ?? 0,
              });
            });
          }

          if (editType === 'HIGHLIGHT') {
            const { highlightsMap } = edit;

            for (const [txnId, newColor] of highlightsMap.entries()) {
              const transactionRaw = selectionsCurrent.find(
                (txn) => txn.flowOfFundsAmlTransactionId === txnId,
              );

              if (!transactionRaw) continue;

              const transactionBefore = ChangeLog.applyChangeLogs(
                transactionRaw,
                transactionRaw?.changeLogs,
              );

              const pendingChangeLogs = ChangeLog.generateChangeLogs(
                {
                  highlightColor: transactionBefore.highlightColor,
                } satisfies DeepPartial<StrTransactionWithChangeLogs>,
                {
                  highlightColor: newColor,
                } satisfies DeepPartial<StrTransactionWithChangeLogs>,
              );

              if (pendingChangeLogs.length === 0) {
                const isSameHighlightColor =
                  transactionBefore.highlightColor === newColor;
                console.assert(isSameHighlightColor);
                continue;
              }

              console.assert(pendingChangeLogs.length === 1);

              pendingChanges.push({
                flowOfFundsAmlTransactionId: txnId,
                changeLogs: pendingChangeLogs,
                eTag: transactionBefore.eTag ?? 0,
              });
            }
          }

          if (editType === 'ADD_SELECTIONS_MANUAL') {
            const { manualSelectionsAndEntities } = edit;

            selectionsAndEntitiesToAdd.push(
              ...manualSelectionsAndEntities.map((item) => ({
                selection: item.manualSelection,
                entities: item.manualEntities,
              })),
            );
          }

          if (edit.editType === 'ADD_ENTITIES') {
            const { entities } = edit;
            selectionsAndEntitiesToAdd.push({ entities });
          }

          if (editType === 'RESET_SELECTIONS') {
            const { selectionIds: tableSelections } = edit;
            const tableSelectionsSet = new Set(tableSelections);

            const selectionsWithChanges = selectionsComputed
              .filter((selection) => {
                return (
                  tableSelectionsSet.has(
                    selection.flowOfFundsAmlTransactionId,
                  ) && selection.changeLogs.length > 0
                );
              })
              .map(({ flowOfFundsAmlTransactionId, changeLogs }) => ({
                flowOfFundsAmlTransactionId,
                eTag: changeLogs.at(-1)?.eTag ?? 0,
              }));

            selectionsToReset.push(...selectionsWithChanges);
          }

          if (editType === 'REMOVE_SELECTIONS') {
            const { selectionIds: tableSelections } = edit;
            selectionsToRemove.push(...tableSelections);
          }

          return {
            editType,
            pendingChanges,
            selectionsAndEntitiesToAdd: selectionsAndEntitiesToAdd,
            selectionsToReset,
            selectionsToRemove,
          };
        }),
        filter(
          ({
            pendingChanges,
            selectionsAndEntitiesToAdd,
            selectionsToReset,
            selectionsToRemove,
          }) => {
            const hasChanges =
              pendingChanges.length > 0 ||
              selectionsAndEntitiesToAdd.length > 0 ||
              selectionsToReset.length > 0 ||
              selectionsToRemove.length > 0;

            if (!hasChanges) {
              this.markSavesAsProcessed(incomingSaves);
            }
            return hasChanges;
          },
        ),
        switchMap(
          ({
            pendingChanges,
            selectionsAndEntitiesToAdd,
            selectionsToReset,
            selectionsToRemove,
          }) => {
            if (selectionsAndEntitiesToAdd.length > 0) {
              return this.addSelectionsAndEntities(selectionsAndEntitiesToAdd);
            }

            if (pendingChanges.length > 0) {
              return this.saveChanges({
                pendingChanges,
              });
            }

            if (selectionsToReset.length > 0) {
              return this._resetSelections(selectionsToReset);
            }

            if (selectionsToRemove.length > 0) {
              return this.removeSelections(selectionsToRemove);
            }

            throw new Error('Unknown edit type');
          },
        ),
        finalize(() => this.markSavesAsProcessed(incomingSaves)),
        // Outer catchError as safety net for possible change log generation errors
        catchError((error) => {
          this.errorHandler.handleError(error);
          return of();
        }),
      );
    }),
    takeUntilDestroyed(),
    share(),
  );

  // --- HIGHLIGHTS BATCHING ---
  private highlightEdits$ = new Subject<
    { txnId: string; newColor: string }[]
  >();
  private resetHiglightsAccumulator$ = new Subject<void>();

  private highlightEditsSave$ = merge(
    this.highlightEdits$.pipe(
      map((highlightEdits) => {
        return {
          type: 'update' as const,
          data: highlightEdits,
        };
      }),
    ),

    this.resetHiglightsAccumulator$.pipe(
      map(() => ({ type: 'reset' as const })),
    ),
  ).pipe(
    scan((accumulator, action) => {
      if (action.type === 'reset') {
        return new Map<string, string>();
      }
      const newAccumulator = new Map(accumulator);
      const highlightEdits = action.data;

      for (const { txnId, newColor } of highlightEdits) {
        newAccumulator.set(txnId, newColor);
      }

      return newAccumulator;
    }, new Map<string, string>()),
    debounceTime(1000),
    filter((accumulator) => accumulator.size > 0),
    tap(() => this.resetHiglightsAccumulator$.next()),
    tap((highlightsMap) =>
      this._updateQueue$.next({ editType: 'HIGHLIGHT', highlightsMap }),
    ),
    takeUntilDestroyed(),
  );

  // --- PUBLIC ACTIONS ---
  setSearchResult(searchResult: TransactionSearchResponse) {
    this._state$.next({
      ...this._state$.value,
      searchResponse: searchResult,
    });
  }

  setSearchParams(searchParam: RouteExtrasFromSearch['searchParams']) {
    const searchParamsClone = structuredClone(searchParam);
    this._state$.next({
      ...this._state$.value,
      searchParams: searchParamsClone,
    });
  }

  setCaseRecordId(caseRecordId: string) {
    this._state$.next({
      ...this._state$.value,
      caseRecordId,
    });
  }

  qSaveEditForm(
    edit: ExtractSubjectType<typeof CaseRecordStore.prototype._updateQueue$>,
  ) {
    if (edit.editType !== 'SINGLE_SAVE' && edit.editType !== 'BULK_SAVE')
      throw new Error();

    const { selectionAfter: editFormValue } = edit;

    const entitiesToGenerate = extractAllEntityRefs(editFormValue).filter(
      (ref) => !ref.linkToSub && (hasPersonName(ref) || hasEntityName(ref)),
    );

    forkJoin(
      entitiesToGenerate.map((ref) => {
        const {
          _hiddenPartyKey: partyKey,
          _hiddenGivenName: givenName,
          _hiddenSurname: surname,
          _hiddenOtherOrInitialName: otherOrInitialName,
          _hiddenNameOfEntity: nameOfEntity,
        } = ref;
        return this.entityGenService
          .generateEntity({
            partyKey,
            givenName,
            otherOrInitialName,
            surname,
            nameOfEntity,
          })
          .pipe(
            tap((generatedEntity) => {
              const { entityIdentifier } = generatedEntity!;
              // eslint-disable-next-line no-param-reassign
              ref.linkToSub = entityIdentifier;
            }),
          );
      }),
    )
      .pipe(defaultIfEmpty([] as (EntityGenType | null)[]), take(1))
      // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil
      .subscribe((entities) => {
        console.assert(entities.every((p) => !!p));

        if (entities.length > 0) {
          this._updateQueue$.next({
            editType: 'ADD_ENTITIES',
            entities: entities as EntityGenType[],
          });
        }

        this._updateQueue$.next(edit);
      });
  }

  qSaveHighlightEdits(
    highlights: ExtractSubjectType<
      typeof CaseRecordStore.prototype.highlightEdits$
    >,
  ) {
    this.highlightEdits$.next(highlights);
  }

  qAddManualSelectionsAndEntities(
    manualSelectionsAndEntities: {
      manualSelection: StrTransactionWithChangeLogs;
      manualEntities: EntityGenType[];
    }[],
  ) {
    this._updateQueue$.next({
      editType: 'ADD_SELECTIONS_MANUAL',
      manualSelectionsAndEntities,
    });
  }

  qResetSelections(selectionIds: string[]) {
    this._updateQueue$.next({
      editType: 'RESET_SELECTIONS',
      selectionIds,
    });
  }

  qRemoveSelections(selectionIds: string[]) {
    this._updateQueue$.next({
      editType: 'REMOVE_SELECTIONS',
      selectionIds,
    });
  }

  // --- API PROXIES ---
  fetchCaseRecordByAmlId(amlId: string) {
    return this.caseRecordService.fetchCaseRecordByAmlId(amlId).pipe(
      tap(({ searchParams, ...rest }) => {
        const {
          reviewPeriodSelection,
          partyKeysSelection,
          accountNumbersSelection,
          sourceSystemsSelection,
          productTypesSelection,
        } = searchParams ?? {};
        this._state$.next({
          ...this._state$.value,
          searchParams: {
            accountNumbersSelection: accountNumbersSelection ?? [],
            partyKeysSelection: partyKeysSelection ?? [],
            productTypesSelection: productTypesSelection ?? [],
            reviewPeriodSelection: reviewPeriodSelection ?? [],
            sourceSystemsSelection: sourceSystemsSelection ?? [],
          },
          ...rest,
        });
      }),
      // access case record state from state
      map(() => true),
    );
  }

  public fetchSelectionsAndEntities() {
    return this.selectionsService
      .fetchSelections(this._state$.value.caseRecordId)
      .pipe(
        tap(({ selectionList, entityList }) => {
          this._state$.next({
            ...this._state$.value,
            selections: selectionList as StrTransactionWithChangeLogs[],
            entities: entityList as WithCaseRecordId<EntityGenType>[],
            resetAndAddSelections: selectionList.map(
              (sel) => sel.flowOfFundsAmlTransactionId,
            ),
          });
        }),
      );
  }

  public addSelectionsAndEntities(
    selectionsAndEntities: {
      selection?: StrTransactionWithChangeLogs;
      entities: EntityGenType[];
    }[],
  ) {
    if (selectionsAndEntities.length === 0)
      return of({ selectionCount: 0, lastUpdated: '' });

    return this._state$.pipe(
      take(1),
      switchMap(
        ({ caseRecordId, eTag: caseETag, entities: entitiesCurrent }) => {
          const selections = selectionsAndEntities.flatMap(({ selection }) =>
            selection ? [selection] : [],
          );
          const isNotExistingEntity = (item: EntityGenType): boolean =>
            entitiesCurrent.findIndex(
              (curr) => curr.entityIdentifier === item.entityIdentifier,
            ) === -1;

          const entities = uniqBy(
            selectionsAndEntities.flatMap(({ entities }) => entities),
            (entity) => entity.entityIdentifier,
          ).filter(isNotExistingEntity);

          return this.selectionsService
            .addSelectionsAndEntities(caseRecordId, {
              caseETag,
              selections,
              entities: entities as unknown as Omit<
                EntityRes,
                'caseRecordId'
              >[],
            })
            .pipe(
              tap(({ caseETag: newCaseETag, lastUpdated }) => {
                this._state$.next({
                  ...this._state$.value,
                  selections: [
                    ...this._state$.value.selections,
                    ...selections.map(
                      (sel) =>
                        ({
                          ...sel,
                          caseRecordId,
                          changeLogs: [],
                          eTag: 0,
                        }) satisfies StrTransactionWithChangeLogs,
                    ),
                  ],
                  selectionsToAdd: selections.map(
                    (sel) => sel.flowOfFundsAmlTransactionId,
                  ),
                  entities: [
                    ...entitiesCurrent,
                    ...entities.map((entity) => ({ ...entity, caseRecordId })),
                  ],
                  eTag: newCaseETag,
                  lastUpdated,
                });
              }),
              catchError((error: HttpErrorResponse) => {
                // Conflict triggers refresh of local state
                if (error.status === HttpStatusCode.Conflict) {
                  this._conflict$.next();
                }

                return throwError(() => error);
              }),
              // access selections directly from state
              map(({ selectionCount, lastUpdated }) => ({
                selectionCount,
                lastUpdated,
              })),
            );
        },
      ),
    );
  }

  public removeSelections(selectionIds: RemoveSelectionsReq['selectionIds']) {
    if (selectionIds.length === 0) return of({ count: 0 });

    const { caseRecordId, eTag: caseETag } = this._state$.value;

    return this.selectionsService
      .removeSelections(caseRecordId, { caseETag, selectionIds: selectionIds })
      .pipe(
        tap(({ caseETag: newCaseETag, lastUpdated }) => {
          this._state$.next({
            ...this._state$.value,
            selections: [
              ...this._state$.value.selections.filter(
                (sel) =>
                  !selectionIds.includes(sel.flowOfFundsAmlTransactionId),
              ),
            ],
            selectionsToRemove: selectionIds,
            eTag: newCaseETag,
            lastUpdated,
          });
        }),
        catchError((error: HttpErrorResponse) => {
          // Conflict triggers refresh of local state
          if (error.status === HttpStatusCode.Conflict) {
            this._conflict$.next();
          }

          return throwError(() => error);
        }),
        map(({ count }) => ({ count })),
      );
  }

  private saveChanges(payload: SaveChangesReq) {
    const { caseRecordId } = this._state$.value;

    const payloadClone = structuredClone(payload);
    return this.selectionsService.saveChanges(caseRecordId, payloadClone).pipe(
      tap(({ updatedAt, updatedBy }) => {
        const { pendingChanges } = payloadClone;

        pendingChanges
          .filter((change) => change.changeLogs.length > 0)
          .forEach(
            ({
              flowOfFundsAmlTransactionId,
              eTag,
              changeLogs: pendingChangeLogs,
            }) => {
              const txn = this._state$.value.selections.find(
                (strTxn) =>
                  strTxn.flowOfFundsAmlTransactionId ===
                  flowOfFundsAmlTransactionId,
              )!;

              txn.eTag = eTag + 1;
              txn.changeLogs.push(
                ...pendingChangeLogs.map(
                  (changeLog) =>
                    ({
                      ...changeLog,
                      eTag: eTag + 1,
                      updatedBy,
                      updatedAt,
                    }) as ChangeLogAudit,
                ),
              );
            },
          );

        this._state$.next({
          ...this._state$.value,
          selectionsWithPendingChanges: pendingChanges.map(
            ({ flowOfFundsAmlTransactionId }) => flowOfFundsAmlTransactionId,
          ),
        });
      }),
      catchError((error: HttpErrorResponse) => {
        // Conflict triggers refresh of local state
        if (error.status === HttpStatusCode.Conflict) {
          this._conflict$.next();
          return EMPTY;
        }

        // rollback highlights applied optimistically
        const { pendingChanges } = payloadClone;
        this._state$.next({
          ...this._state$.value,
          selectionsWithPendingChanges: pendingChanges.map(
            ({ flowOfFundsAmlTransactionId }) => flowOfFundsAmlTransactionId,
          ),
        });

        return throwError(() => error);
      }),
    );
  }

  private _resetSelections(pendingResets: ResetSelectionsReq['pendingResets']) {
    const { caseRecordId } = this._state$.value;

    return this.selectionsService
      .resetSelections(caseRecordId, { pendingResets })
      .pipe(
        tap(() => {
          const selectionIdsSet = new Set(
            pendingResets.map((item) => item.flowOfFundsAmlTransactionId),
          );

          for (const selection of this._state$.value.selections) {
            if (!selectionIdsSet.has(selection.flowOfFundsAmlTransactionId))
              continue;

            selection.eTag = 0;
            selection.changeLogs = [];
          }

          this._state$.next({
            ...this._state$.value,
            selectionsWithPendingChanges: [...selectionIdsSet.values()],
          });
        }),
        catchError((error: HttpErrorResponse) => {
          // Handle errors gracefylly
          this.errorHandler.handleError(error);

          // Conflict triggers refresh of local state
          if (error.status === HttpStatusCode.Conflict) {
            this._conflict$.next();
          }

          return throwError(() => error);
        }),
      );
  }
}

export interface CaseRecordState {
  caseRecordId: string;
  amlId: string;
  searchParams: {
    partyKeysSelection: string[];
    accountNumbersSelection: AccountNumberSelection[];
    sourceSystemsSelection: string[];
    productTypesSelection: string[];
    reviewPeriodSelection: ReviewPeriod[];
  };
  searchParamsHash: string;
  lastSearchedParamsHash: string | null;
  createdAt: string;
  createdBy: string;
  lastUpdatedBy?: string | null;
  status: string;
  isClosed: boolean;
  closedAt?: string | null;
  closedBy?: string | null;
  eTag: number;
  lastUpdated?: string | null;

  selections: StrTransactionWithChangeLogs[];
  entities: WithCaseRecordId<EntityType>[];

  // table partial update use
  selectionsWithPendingChanges?: PendingChange['flowOfFundsAmlTransactionId'][];
  selectionsToAdd?: StrTransactionWithChangeLogs['flowOfFundsAmlTransactionId'][];
  selectionsToRemove?: StrTransactionWithChangeLogs['flowOfFundsAmlTransactionId'][];
  resetAndAddSelections?: StrTransactionWithChangeLogs['flowOfFundsAmlTransactionId'][];
  searchResponse: TransactionSearchResponse;
}

export type EntityType = EntityGenType;

// Hidden props prefixed with '_hidden' are ignored by the change logging service.
export type StrTransactionWithChangeLogs = StrTransaction &
  SelectionRes & {
    _hiddenValidation?: _hiddenValidationType[];
  };

export type ChangeLogAudit = WithETag<ChangeLog.ChangeLogType> & {
  updatedAt: string;
  updatedBy: string;
  eTag: number;
};

export interface StrTransactionChangeLogs {
  txnId: string;
  changeLogs: ChangeLog.ChangeLogType[];
}

export interface ReviewPeriod {
  start: string;
  end: string;
}

const computePartialChangesHandler = ({
  selections,
  selectionsToRecompute,
  entities,
}: {
  selections: StrTransactionWithChangeLogs[];
  selectionsToRecompute: NonNullable<
    CaseRecordState['selectionsWithPendingChanges']
  >;
  entities: WithCaseRecordId<EntityGenType>[];
}) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const enrichEntities = createTransactionEntityEnricher(entities);

    const recomputedSelections = selections
      .filter(({ flowOfFundsAmlTransactionId }) =>
        selectionsToRecompute.includes(flowOfFundsAmlTransactionId),
      )
      .map((txn) => {
        return ChangeLog.applyChangeLogs(txn, txn.changeLogs);
      })
      .map(enrichEntities)
      .map(setRowValidationInfo);

    return [
      ...acc.map((sel) => {
        const { flowOfFundsAmlTransactionId } = sel;
        return selectionsToRecompute.includes(flowOfFundsAmlTransactionId)
          ? recomputedSelections.find(
              (sel) =>
                sel.flowOfFundsAmlTransactionId === flowOfFundsAmlTransactionId,
            )!
          : sel;
      }),
    ];
  };
};

const addSelectionsHandler = ({
  selections,
  selectionsToAdd,
  entities,
}: {
  selections: StrTransactionWithChangeLogs[];
  selectionsToAdd: NonNullable<CaseRecordState['selectionsToAdd']>;
  entities: WithCaseRecordId<EntityGenType>[];
}) => {
  return (acc: StrTransactionWithChangeLogs[]) => {
    const enrichEntities = createTransactionEntityEnricher(entities);

    return [
      ...acc,
      ...selections
        .filter((sel) =>
          selectionsToAdd.includes(sel.flowOfFundsAmlTransactionId),
        )
        .map((txn) => {
          return ChangeLog.applyChangeLogs(txn, txn.changeLogs);
        })
        .map(enrichEntities)
        .map(setRowValidationInfo),
    ];
  };
};

const resetAndAddSelectionsHandler = ({
  selections,
  selectionsToAdd,
  entities,
}: {
  selections: StrTransactionWithChangeLogs[];
  selectionsToAdd: NonNullable<CaseRecordState['resetAndAddSelections']>;
  entities: WithCaseRecordId<EntityGenType>[];
}) => {
  return (_acc: StrTransactionWithChangeLogs[]) => {
    // Ignore accumulator - start fresh
    const enrichEntities = createTransactionEntityEnricher(entities);

    return selections
      .filter((sel) =>
        selectionsToAdd.includes(sel.flowOfFundsAmlTransactionId),
      )
      .map((txn) => {
        return ChangeLog.applyChangeLogs(txn, txn.changeLogs);
      })
      .map(enrichEntities)
      .map(setRowValidationInfo);
  };
};

export function setRowValidationInfo(selection: StrTransactionWithChangeLogs) {
  const errors: _hiddenValidationType[] = [];
  if (
    selection.changeLogs.length > 0 &&
    !selection.changeLogs.every((log) => log.path === '/highlightColor')
  )
    errors.push('edited');

  if (selection.startingActions.some((sa) => hasMissingConductorInfo(sa)))
    errors.push('conductorMissing');

  if (
    selection.startingActions.some(hasMissingAccountInfo) ||
    selection.completingActions.some(hasMissingAccountInfo)
  )
    errors.push('bankInfoMissing');

  if (
    selection.startingActions.some(hasInvalidFiu) ||
    selection.completingActions.some(hasInvalidFiu)
  )
    errors.push('invalidFiu');

  if (selection.startingActions.some(hasMissingCheque))
    errors.push('missingCheque');

  if (hasMissingBasicInfo(selection)) errors.push('missingBasicInfo');

  if (hasMissingBeneficiary(selection)) errors.push('beneficiaryMissing');

  return { ...selection, _hiddenValidation: errors };
}

const createEntityEnricher =
  (entities: WithCaseRecordId<EntityGenType>[]) =>
  <T extends EntityDenormalized>(ref: T): T => {
    if (!ref.linkToSub) {
      return {
        ...ref,
        _hiddenPartyKey: null,
        _hiddenSurname: null,
        _hiddenGivenName: null,
        _hiddenOtherOrInitialName: null,
        _hiddenNameOfEntity: null,
      };
    }

    const entity = entities.find(
      (entity) => entity.entityIdentifier === ref.linkToSub,
    );
    const { surname, givenName, otherOrInitialName, nameOfEntity, partyKey } =
      entity ?? {};

    return {
      ...ref,
      _hiddenPartyKey: partyKey,
      _hiddenSurname: surname,
      _hiddenGivenName: givenName,
      _hiddenOtherOrInitialName: otherOrInitialName,
      _hiddenNameOfEntity: nameOfEntity,
    };
  };

export const createTransactionEntityEnricher =
  (entities: WithCaseRecordId<EntityGenType>[]) =>
  (txn: StrTransactionWithChangeLogs): StrTransactionWithChangeLogs => {
    const enrichEntity = createEntityEnricher(entities);

    const startingActions = txn.startingActions.map((sa) => ({
      ...sa,
      accountHolders: sa.accountHolders?.map((ah) => ({
        ...ah,
        ...enrichEntity(ah),
      })),
      conductors: sa.conductors?.map((c) => ({
        ...c,
        ...enrichEntity(c),
        onBehalfOf: c.onBehalfOf?.map((b) => ({ ...b, ...enrichEntity(b) })),
      })),
      sourceOfFunds: sa.sourceOfFunds?.map((sof) => ({
        ...sof,
        ...enrichEntity(sof),
      })),
    }));

    const completingActions = txn.completingActions.map((ca) => ({
      ...ca,
      accountHolders: ca.accountHolders?.map((ah) => ({
        ...ah,
        ...enrichEntity(ah),
      })),
      involvedIn: ca.involvedIn?.map((inv) => ({
        ...inv,
        ...enrichEntity(inv),
      })),
      beneficiaries: ca.beneficiaries?.map((ben) => ({
        ...ben,
        ...enrichEntity(ben),
      })),
    }));

    return {
      ...txn,
      startingActions,
      completingActions,
    };
  };

function extractAllEntityRefs(
  editFormValue: EditFormValueType,
): EntityDenormalized[] {
  const entityRefs: EntityDenormalized[] = [];

  // Extract from starting actions
  editFormValue.startingActions?.forEach((sa) => {
    entityRefs.push(...(sa.accountHolders || []));
    entityRefs.push(...(sa.sourceOfFunds || []));

    sa.conductors?.forEach((conductor) => {
      entityRefs.push(conductor);
      entityRefs.push(...(conductor.onBehalfOf || []));
    });
  });

  // Extract from completing actions
  editFormValue.completingActions?.forEach((ca) => {
    entityRefs.push(...(ca.accountHolders || []));
    entityRefs.push(...(ca.involvedIn || []));
    entityRefs.push(...(ca.beneficiaries || []));
  });

  return entityRefs;
}

export interface EntityDenormalized {
  linkToSub?: string | null;
  _hiddenPartyKey?: string | null;
  _hiddenSurname?: string | null;
  _hiddenGivenName?: string | null;
  _hiddenOtherOrInitialName?: string | null;
  _hiddenNameOfEntity?: string | null;
}

type ExtractSubjectType<T> = T extends Subject<infer U> ? U : never;
