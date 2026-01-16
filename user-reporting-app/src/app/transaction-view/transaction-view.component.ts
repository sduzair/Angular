import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  combineLatestWith,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  Subject,
  switchMap,
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
  OlbSourceData,
  TransactionSearchService,
  WireSourceData,
} from '../transaction-search/transaction-search.service';
import { AbmTableComponent } from './abm-table/abm-table.component';
import { AbstractTransactionViewComponent } from './abstract-transaction-view.component';
import { EmtTableComponent } from './emt-table/emt-table.component';
import { FofTableComponent } from './fof-table/fof-table.component';
import { OlbTableComponent } from './olb-table/olb-table.component';
import { transformABMToStrTransaction } from './transform-to-str-transaction/abm-transform';
import { transformOlbEmtToStrTransaction } from './transform-to-str-transaction/olb-emt-transform';
import { transformWireInToStrTransaction } from './transform-to-str-transaction/wire-transform';
import { WiresTableComponent } from './wires-table/wires-table.component';

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
  ],
  template: `
    <div class="row row-cols-1 mx-0">
      <mat-toolbar class="col">
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
            [masterSelection]="selectionModel" />
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
            [masterSelection]="selectionModel" />
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
            [masterSelection]="selectionModel" />
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
        /></mat-tab>
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
            [masterSelection]="selectionModel" />
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styleUrl: './transaction-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionViewComponent extends AbstractTransactionViewComponent {
  private snackBar = inject(SnackbarQueueService);
  protected qIsSaving$ = this._caseRecordStore.qIsSaving$;

  fofSourceData$ = this.searchResponse$.pipe(
    map(
      (search) =>
        search.find((res) => res.sourceId === 'FlowOfFunds')?.sourceData!,
    ),
  );

  abmSourceData$ = this.searchResponse$.pipe(
    map((search) => search.find((res) => res.sourceId === 'ABM')?.sourceData!),
  );

  olbSourceData$ = this.searchResponse$.pipe(
    map((search) => search.find((res) => res.sourceId === 'OLB')?.sourceData!),
  );

  emtSourceData$ = this.searchResponse$.pipe(
    map((search) => search.find((res) => res.sourceId === 'EMT')?.sourceData!),
  );

  wiresSourceData$ = this.searchResponse$.pipe(
    map((search) => search.find((res) => res.sourceId === 'Wire')?.sourceData!),
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

        const transformations: Observable<StrTransactionWithChangeLogs | null>[] =
          [];

        for (const {
          flowOfFundsAmlTransactionId: selectionId,
        } of _addedSelections) {
          const abmTxn = searchResponse
            .find((src) => src.sourceId === 'ABM')
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
          const wireTxn = searchResponse
            .find((src) => src.sourceId === 'Wire')
            ?.sourceData.find(
              (txn) => txn.flowOfFundsAmlTransactionId === selectionId,
            );

          if (abmTxn) {
            transformations.push(
              this.transformABM(abmTxn, caseRecordId).pipe(
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

          if (olbTxn && emtTxn) {
            transformations.push(
              this.transformOlbEmt(olbTxn, emtTxn, caseRecordId).pipe(
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

          if (wireTxn) {
            transformations.push(
              this.transformWire(wireTxn, caseRecordId).pipe(
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
        }

        // Handle empty transformations array (forkJoin emits EMPTY for empty arrays)
        const transformations$ =
          transformations.length > 0 ? forkJoin(transformations) : of([]);

        return transformations$.pipe(
          map((results) => {
            const transformedTxns = results.filter(
              (txn): txn is StrTransactionWithChangeLogs => txn !== null,
            );

            if (results.length - transformedTxns.length > 0) {
              this.snackBar.open('Some transformations have failed', 'Close');
            }

            this.saveProgress$.next({
              ...this.saveProgress$.value,
              completed: transformedTxns.length,
              status: 'saving',
            });

            return {
              transformedTxns,
              removedSelectionIds,
            };
          }),
        );
      },
    ),
    // Save transformed transactions
    switchMap(({ transformedTxns, removedSelectionIds }) => {
      return this._caseRecordStore.addSelections(transformedTxns).pipe(
        switchMap(({ count: addedSelectionsCount }) => {
          this.saveProgress$.next({
            ...this.saveProgress$.value,
            completed: transformedTxns.length + addedSelectionsCount,
            status: 'saving',
          });
          return this._caseRecordStore
            .removeSelections(removedSelectionIds)
            .pipe(
              tap(({ count: removedSelectionsCount }) => {
                this.saveProgress$.next({
                  ...this.saveProgress$.value,
                  completed:
                    transformedTxns.length +
                    addedSelectionsCount +
                    removedSelectionsCount,
                  status: 'complete',
                });
              }),
            );
        }),
        finalize(() => {
          this.saveProgress$.next({
            ...this.saveProgress$.value,
            completed: 0,
            status: 'error',
          });
        }),
      );
    }),
  );

  // Transformation helper methods
  private searchService = inject(TransactionSearchService);
  private transformABM(
    abmTxn: AbmSourceData,
    caseRecordId: string,
  ): Observable<StrTransactionWithChangeLogs> {
    return transformABMToStrTransaction(
      abmTxn,
      (partyKey) => this.searchService.getPartyInfo(partyKey),
      (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    );
  }

  private transformOlbEmt(
    olbTxn: OlbSourceData,
    emtTxn: EmtSourceData,
    caseRecordId: string,
  ): Observable<StrTransactionWithChangeLogs> {
    return transformOlbEmtToStrTransaction(
      olbTxn,
      emtTxn,
      (partyKey) => this.searchService.getPartyInfo(partyKey),
      (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    );
  }

  private transformWire(
    wireTxn: WireSourceData,
    caseRecordId: string,
  ): Observable<StrTransactionWithChangeLogs> {
    return transformWireInToStrTransaction(
      wireTxn,
      (partyKey) => this.searchService.getPartyInfo(partyKey),
      (account) => this.searchService.getAccountInfo(account),
      caseRecordId,
    );
  }
}

export const searchResultResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const caseRecordStore = inject(CaseRecordStore);

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
    caseRecordStore.fetchSelections(),
  ]).pipe(
    map(() => true),
    catchError(() => of(false)),
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
