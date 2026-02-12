import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ErrorHandler,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  combineLatestWith,
  EMPTY,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';
import {
  CaseRecordStore,
  StrTransactionWithChangeLogs,
} from '../aml/case-record.store';
import { SnackbarQueueService } from '../snackbar-queue.service';
import { RouteExtrasFromSearch } from '../transaction-search/transaction-search.component';
import {
  AbmSourceData,
  EmtSourceData,
  FlowOfFundsSourceData,
  OlbSourceData,
  OTCSourceData,
  POSSourceData,
  TransactionSearchService,
  WireSourceData,
} from '../transaction-search/transaction-search.service';
import { AbmTableComponent } from './abm-table/abm-table.component';
import { AbstractTransactionViewComponent } from './abstract-transaction-view.component';
import { EmtTableComponent } from './emt-table/emt-table.component';
import { FofTableComponent } from './fof-table/fof-table.component';
import { LocalHighlightsService } from './local-highlights.service';
import { OlbTableComponent } from './olb-table/olb-table.component';
import { OtcTableComponent } from './otc-table/otc-table.component';
import { transformABMToStrTransaction } from './transform-to-str-transaction/abm-transform';
import { transformOlbEmtToStrTransaction } from './transform-to-str-transaction/olb-emt-transform';
import { transformOTCToStrTransaction } from './transform-to-str-transaction/otc-transform';
import {
  PartyGenService,
  PartyGenType,
} from './transform-to-str-transaction/party-gen.service';
import { transformWireToStrTransaction } from './transform-to-str-transaction/wire-transform';
import { WiresTableComponent } from './wires-table/wires-table.component';
import { PosTableComponent } from './pos-table/pos-table.component';
import { transformPOSToStrTransaction } from './transform-to-str-transaction/pos-transform';

@Component({
  selector: 'app-transaction-view',
  imports: [
    CommonModule,
    MatToolbarModule,
    FofTableComponent,
    MatSelectModule,
    MatTabsModule,
    AbmTableComponent,
    OlbTableComponent,
    EmtTableComponent,
    MatChip,
    MatButton,
    WiresTableComponent,
    MatIconModule,
    OtcTableComponent,
    PosTableComponent,
  ],
  template: `
    <div class="row row-cols-1 mx-0">
      <mat-toolbar class="col px-0">
        <mat-toolbar-row class="px-0 header-toolbar-row">
          <div class="flex-fill"></div>
          <button
            type="button"
            color="accent"
            mat-raised-button
            [disabled]="(selectionControlHasChanges$ | async) === false"
            (click)="resetSelections()"
            aria-label="Reset selections">
            <mat-icon>refresh</mat-icon>
            Reset
          </button>
          <button
            type="button"
            color="primary"
            mat-flat-button
            [disabled]="
              (selectionControlHasChanges$ | async) === false ||
              (saveProgress$ | async)?.status === 'transforming' ||
              (saveProgress$ | async)?.status === 'saving' ||
              (qIsSaving$ | async)
            "
            (click)="onSave()">
            @let isSaving =
              (saveProgress$ | async)?.status === 'transforming' ||
              (saveProgress$ | async)?.status === 'saving';
            @if (isSaving) {
              <mat-icon class="spinning">sync</mat-icon>
            }
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
        </mat-toolbar-row>
      </mat-toolbar>
    </div>
    @if (selectionModel$ | async; as selectionModel) {
      <mat-tab-group
        class="col tab-group"
        mat-stretch-tabs="false"
        mat-align-tabs="start">
        <mat-tab>
          <ng-template mat-tab-label>
            Flow of Funds
            <mat-chip class="ms-1" disableRipple>
              {{ fofSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-fof-table
            [fofSourceData]="(fofSourceData$ | async) || []"
            [selectionCount]="(fofSourceDataSelectionCount$ | async) ?? 0"
            [masterSelection]="selectionModel"
            [highlightedRecords]="highlightedRecords" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            ABM
            <mat-chip class="ms-1" disableRipple>
              {{ abmSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-abm-table
            [abmSourceData]="(abmSourceData$ | async) || []"
            [selectionCount]="(abmSourceDataSelectionCount$ | async) ?? 0"
            [masterSelection]="selectionModel"
            [highlightedRecords]="highlightedRecords" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            OLB
            <mat-chip class="ms-1" disableRipple>
              {{ olbSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-olb-table
            [olbSourceData]="(olbSourceData$ | async) || []"
            [selectionCount]="(olbSourceDataSelectionCount$ | async) ?? 0"
            [masterSelection]="selectionModel"
            [highlightedRecords]="highlightedRecords" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            EMT
            <mat-chip class="ms-1" disableRipple>
              {{ emtSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-emt-table
            [emtSourceData]="(emtSourceData$ | async) || []"
            [selectionCount]="(emtSourceDataSelectionCount$ | async) ?? 0"
            [masterSelection]="selectionModel"
            [highlightedRecords]="highlightedRecords" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            Wires
            <mat-chip class="ms-1" disableRipple>
              {{ wiresSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-wires-table
            [wiresSourceData]="(wiresSourceData$ | async) || []"
            [selectionCount]="(wiresSourceDataSelectionCount$ | async) ?? 0"
            [masterSelection]="selectionModel"
            [highlightedRecords]="highlightedRecords" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            OTC
            <mat-chip class="ms-1" disableRipple>
              {{ otcSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-otc-table
            [otcSourceData]="(otcSourceData$ | async) || []"
            [selectionCount]="(otcSourceDataSelectionCount$ | async) ?? 0"
            [masterSelection]="selectionModel"
            [highlightedRecords]="highlightedRecords" />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            POS
            <mat-chip class="ms-1" disableRipple>
              {{ posSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-pos-table
            [posSourceData]="(posSourceData$ | async) || []"
            [selectionCount]="(posSourceDataSelectionCount$ | async) ?? 0"
            [masterSelection]="selectionModel"
            [highlightedRecords]="highlightedRecords" />
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styleUrl: './transaction-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionViewComponent extends AbstractTransactionViewComponent {
  private snackBar = inject(SnackbarQueueService);
  private highlightsService = inject(LocalHighlightsService);
  private errorHandler = inject(ErrorHandler);
  protected qIsSaving$ = this._caseRecordStore.qIsSaving$;

  highlightedRecords = signal<Map<string, string>>(new Map());

  private highlights$ = this._caseRecordStore.state$.pipe(
    take(1),
    switchMap(({ caseRecordId }) => {
      return this.highlightsService.getHighlights(caseRecordId);
    }),
    tap((initHighlightsMap) => {
      this.highlightedRecords.update(() => new Map(initHighlightsMap));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  fofSourceData$ = combineLatest([this.searchResponse$, this.highlights$]).pipe(
    map(([search, higlightsMap]) =>
      search
        .find((res) => res.sourceId === 'FlowOfFunds')
        ?.sourceData!.map((row) => ({
          ...row,
          _uiPropHighlightColor: higlightsMap.get(
            row.flowOfFundsAmlTransactionId,
          ),
        })),
    ),
  );

  abmSourceData$ = combineLatest([this.searchResponse$, this.highlights$]).pipe(
    map(([search, higlightsMap]) =>
      search
        .find((res) => res.sourceId === 'ABM')
        ?.sourceData!.map((row) => ({
          ...row,
          _uiPropHighlightColor: higlightsMap.get(
            row.flowOfFundsAmlTransactionId,
          ),
        })),
    ),
  );

  olbSourceData$ = combineLatest([this.searchResponse$, this.highlights$]).pipe(
    map(([search, higlightsMap]) =>
      search
        .find((res) => res.sourceId === 'OLB')
        ?.sourceData!.map((row) => ({
          ...row,
          _uiPropHighlightColor: higlightsMap.get(
            row.flowOfFundsAmlTransactionId,
          ),
        })),
    ),
  );

  emtSourceData$ = combineLatest([this.searchResponse$, this.highlights$]).pipe(
    map(([search, higlightsMap]) =>
      search
        .find((res) => res.sourceId === 'EMT')
        ?.sourceData!.map((row) => ({
          ...row,
          _uiPropHighlightColor: higlightsMap.get(
            row.flowOfFundsAmlTransactionId,
          ),
        })),
    ),
  );

  wiresSourceData$ = combineLatest([
    this.searchResponse$,
    this.highlights$,
  ]).pipe(
    map(([search, higlightsMap]) =>
      search
        .find((res) => res.sourceId === 'Wire')
        ?.sourceData!.map((row) => ({
          ...row,
          _uiPropHighlightColor: higlightsMap.get(
            row.flowOfFundsAmlTransactionId,
          ),
        })),
    ),
  );

  otcSourceData$ = combineLatest([this.searchResponse$, this.highlights$]).pipe(
    map(([search, higlightsMap]) =>
      search
        .find((res) => res.sourceId === 'OTC')
        ?.sourceData!.map((row) => ({
          ...row,
          _uiPropHighlightColor: higlightsMap.get(
            row.flowOfFundsAmlTransactionId,
          ),
        })),
    ),
  );

  posSourceData$ = combineLatest([this.searchResponse$, this.highlights$]).pipe(
    map(([search, higlightsMap]) =>
      search
        .find((res) => res.sourceId === 'POS')
        ?.sourceData!.map((row) => ({
          ...row,
          _uiPropHighlightColor: higlightsMap.get(
            row.flowOfFundsAmlTransactionId,
          ),
        })),
    ),
  );

  private selectionIdsLastSaved$ = this.selections$.pipe(
    map(
      (selections) =>
        new Set(selections.map((sel) => sel.flowOfFundsAmlTransactionId)),
    ),
  );

  selectionControlHasChanges$ = this._selectionsCurrent$.pipe(
    combineLatestWith(this.selectionIdsLastSaved$),
    map(
      ([selections, selectionsLastSaved]) =>
        selections.length !== selectionsLastSaved.size ||
        !selections.every((sel) =>
          selectionsLastSaved.has(sel.flowOfFundsAmlTransactionId),
        ),
    ),
  );

  private _resetSelections = new Subject<void>();
  resetSelections() {
    this._resetSelections.next();
  }

  _ = this._resetSelections
    .pipe(
      withLatestFrom(this.selectionModel$),
      map(([_, selectionModel]) => {
        selectionModel.clear();
        return selectionModel;
      }),
      withLatestFrom(this.selectionIdsLastSaved$),
      tap(([selectionModel, selectionIdsLastSaved]) => {
        selectionModel.select(
          ...Array.from(selectionIdsLastSaved).map(
            (id) =>
              ({ flowOfFundsAmlTransactionId: id }) satisfies {
                flowOfFundsAmlTransactionId: string;
              },
          ),
        );
      }),
      takeUntilDestroyed(),
    )
    // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
    .subscribe();

  constructor() {
    super();
    // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
    this.onSave$.pipe(takeUntilDestroyed()).subscribe();
  }

  protected onSaveSubject = new Subject<void>();
  onSave() {
    this.onSaveSubject.next();
  }

  // Save progress tracking
  saveProgress$ = new BehaviorSubject<SaveProgress>({
    total: 0,
    completed: 0,
    status: 'idle',
  });

  onSave$ = this.onSaveSubject.pipe(
    withLatestFrom(
      this._selectionsCurrent$,
      this.selectionIdsLastSaved$,
      this.searchResponse$,
      inject(CaseRecordStore).state$.pipe(map((state) => state.caseRecordId)),
    ),
    switchMap(
      ([
        _,
        _selectionsCurrent,
        selectionIdsLastSaved,
        searchResponse,
        caseRecordId,
      ]) => {
        const _addedSelections = _selectionsCurrent.filter(
          (sel) => !selectionIdsLastSaved.has(sel.flowOfFundsAmlTransactionId),
        );

        const removedSelectionIds = Array.from(selectionIdsLastSaved).filter(
          (selectionIdFromLastSaved) =>
            !_selectionsCurrent
              .map(
                ({ flowOfFundsAmlTransactionId }) =>
                  flowOfFundsAmlTransactionId,
              )
              .includes(selectionIdFromLastSaved),
        );

        const totalOperations =
          2 * _addedSelections.length + removedSelectionIds.length;

        this.saveProgress$.next({
          total: totalOperations,
          completed: 0,
          status: 'transforming',
        });

        const transformations: Observable<{
          selection: StrTransactionWithChangeLogs;
          parties: PartyGenType[];
        } | null>[] = [];

        for (const {
          flowOfFundsAmlTransactionId: selectionId,
        } of _addedSelections) {
          const abmTxn = searchResponse
            .find((src) => src.sourceId === 'ABM')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );
          const abmFofTxn = searchResponse
            .find((src) => src.sourceId === 'FlowOfFunds')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );

          const emtTxn = searchResponse
            .find((src) => src.sourceId === 'EMT')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );
          const olbTxn = searchResponse
            .find((src) => src.sourceId === 'OLB')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );
          const olbFofTxn = searchResponse
            .find((src) => src.sourceId === 'FlowOfFunds')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );

          const wireTxn = searchResponse
            .find((src) => src.sourceId === 'Wire')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );
          const wireFofTxn = searchResponse
            .find((src) => src.sourceId === 'FlowOfFunds')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );

          const otcTxn = searchResponse
            .find((src) => src.sourceId === 'OTC')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );
          const otcFofTxn = searchResponse
            .find((src) => src.sourceId === 'FlowOfFunds')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );

          const posTxn = searchResponse
            .find((src) => src.sourceId === 'POS')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );
          const posFofTxn = searchResponse
            .find((src) => src.sourceId === 'FlowOfFunds')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );

          if (abmTxn && abmFofTxn) {
            transformations.push(
              this.transformABM(abmTxn, abmFofTxn, caseRecordId).pipe(
                catchError((err) => {
                  console.error(
                    `Failed to transform ABM transaction ${selectionId}:`,
                    err,
                  );
                  return of(null);
                }),
              ),
            );
          }

          if (olbTxn && olbFofTxn && emtTxn) {
            transformations.push(
              this.transformOlbEmt(
                olbTxn,
                olbFofTxn,
                emtTxn,
                caseRecordId,
              ).pipe(
                catchError((err) => {
                  console.error(
                    `Failed to transform OLB/EMT transaction ${selectionId}:`,
                    err,
                  );
                  return of(null);
                }),
              ),
            );
          }

          if (wireTxn && wireFofTxn) {
            transformations.push(
              this.transformWire(wireTxn, wireFofTxn, caseRecordId).pipe(
                catchError((err) => {
                  console.error(
                    `Failed to transform Wire transaction ${selectionId}:`,
                    err,
                  );
                  return of(null);
                }),
              ),
            );
          }

          if (otcTxn && otcFofTxn) {
            transformations.push(
              this.transformOTC(otcTxn, otcFofTxn, caseRecordId).pipe(
                catchError((err) => {
                  console.error(
                    `Failed to transform OTC transaction ${selectionId}:`,
                    err,
                  );
                  return of(null);
                }),
              ),
            );
          }

          if (posTxn && posFofTxn) {
            transformations.push(
              this.transformPOS(posTxn, posFofTxn, caseRecordId).pipe(
                catchError((err) => {
                  console.error(
                    `Failed to transform POS transaction ${selectionId}:`,
                    err,
                  );
                  return of(null);
                }),
              ),
            );
          }
        }

        // Handle empty transformations array (forkJoin emits EMPTY for empty arrays)
        const transformations$ =
          transformations.length > 0 ? forkJoin(transformations) : of([]);

        return transformations$.pipe(
          map((results) => {
            const transformations = results.filter(
              (
                item,
              ): item is {
                selection: StrTransactionWithChangeLogs;
                parties: PartyGenType[];
              } => item !== null,
            );

            if (results.length - transformations.length > 0) {
              this.snackBar.open('Some transformations have failed', 'Close');
            }

            this.saveProgress$.next({
              ...this.saveProgress$.value,
              completed: transformations.length,
              status: 'saving',
            });

            return {
              transformations,
              removedSelectionIds,
            };
          }),
        );
      },
    ),
    // Save transformed transactions
    switchMap(({ transformations, removedSelectionIds }) => {
      return this._caseRecordStore
        .addSelectionsAndParties(transformations)
        .pipe(
          switchMap(({ count: addedSelectionsCount }) => {
            this.saveProgress$.next({
              ...this.saveProgress$.value,
              completed: transformations.length + addedSelectionsCount,
              status: 'saving',
            });
            return this._caseRecordStore
              .removeSelections(removedSelectionIds)
              .pipe(
                tap(({ count: removedSelectionsCount }) => {
                  this.saveProgress$.next({
                    ...this.saveProgress$.value,
                    completed:
                      transformations.length +
                      addedSelectionsCount +
                      removedSelectionsCount,
                    status: 'complete',
                  });
                }),
              );
          }),
          catchError((error) => {
            this.saveProgress$.next({
              ...this.saveProgress$.value,
              status: 'error',
            });
            this.errorHandler.handleError(error);
            return EMPTY;
          }),
        );
    }),
  );

  // Transformation helper methods
  private searchService = inject(TransactionSearchService);
  private partyGenService = inject(PartyGenService);
  private transformABM(
    abmTxn: AbmSourceData,
    fofTxn: FlowOfFundsSourceData,
    caseRecordId: string,
  ) {
    return transformABMToStrTransaction(
      abmTxn,
      fofTxn,
      (party: Omit<PartyGenType, 'partyIdentifier'>) =>
        this.partyGenService.generateParty(party),
      (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    );
  }

  private transformOlbEmt(
    olbTxn: OlbSourceData,
    fofTxn: FlowOfFundsSourceData,
    emtTxn: EmtSourceData,
    caseRecordId: string,
  ) {
    return transformOlbEmtToStrTransaction({
      olbTxn,
      fofTxn,
      emtTxn,
      generateParty: (party: Omit<PartyGenType, 'partyIdentifier'>) =>
        this.partyGenService.generateParty(party),
      getAccountInfo: (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    });
  }

  private transformWire(
    wireTxn: WireSourceData,
    fofTxn: FlowOfFundsSourceData,
    caseRecordId: string,
  ) {
    return transformWireToStrTransaction({
      wireTxn,
      fofTxn,
      generateParty: (party: Omit<PartyGenType, 'partyIdentifier'>) =>
        this.partyGenService.generateParty(party),
      getAccountInfo: (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    });
  }

  private transformOTC(
    otcTxn: OTCSourceData,
    fofTxn: FlowOfFundsSourceData,
    caseRecordId: string,
  ) {
    return transformOTCToStrTransaction({
      sourceTxn: otcTxn,
      fofTxn,
      generateParty: (party: Omit<PartyGenType, 'partyIdentifier'>) =>
        this.partyGenService.generateParty(party),
      getAccountInfo: (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    });
  }

  private transformPOS(
    posTxn: POSSourceData,
    fofTxn: FlowOfFundsSourceData,
    caseRecordId: string,
  ) {
    return transformPOSToStrTransaction({
      posTxn,
      fofTxn,
      generateParty: (party: Omit<PartyGenType, 'partyIdentifier'>) =>
        this.partyGenService.generateParty(party),
      getAccountInfo: (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    });
  }
}

export const searchResultResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const caseRecordStore = inject(CaseRecordStore);
  const errorHandler = inject(ErrorHandler);

  const routeExtras = inject(Router).currentNavigation()?.extras.state as
    | RouteExtrasFromSearch
    | undefined;

  if (!routeExtras) {
    return true;
  }

  // On navigation from transaction search page
  const { searchParams, searchResult, caseRecordId } = routeExtras;
  caseRecordStore.setSearchParams(searchParams);
  caseRecordStore.setSearchResult(searchResult);
  caseRecordStore.setCaseRecordId(caseRecordId);

  const amlId = route.paramMap.get('amlId')!;

  return forkJoin([
    caseRecordStore.fetchCaseRecordByAmlId(amlId),
    caseRecordStore.fetchSelectionsAndParties(),
  ]).pipe(
    map(() => true),
    catchError((error) => {
      errorHandler.handleError(error);
      return of(false);
    }),
  );
};

export interface TableSelectionType {
  flowOfFundsAmlTransactionId: string;
}

interface SaveProgress {
  total: number;
  completed: number;
  status: 'idle' | 'transforming' | 'saving' | 'complete' | 'error';
}
