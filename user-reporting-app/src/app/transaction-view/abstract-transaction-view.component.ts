import { SelectionModel } from '@angular/cdk/collections';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  combineLatestWith,
  debounceTime,
  map,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import { TableSelectionType } from './transaction-view.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
export abstract class AbstractTransactionViewComponent {
  protected _caseRecordStore = inject(CaseRecordStore);
  readonly searchResponse$ = this._caseRecordStore.state$.pipe(
    map(({ searchResponse }) => searchResponse),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly selections$ = this._caseRecordStore.state$.pipe(
    map(({ selections }) => {
      return selections.map(
        (txn) =>
          ({
            flowOfFundsAmlTransactionId: txn.flowOfFundsAmlTransactionId,
          }) satisfies TableSelectionType,
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  searchFlowOfFundsSet$ = this.searchResponse$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'FlowOfFunds')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchAbmSet$ = this.searchResponse$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'ABM')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  searchOlbSet$ = this.searchResponse$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'OLB')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchEmtSet$ = this.searchResponse$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'EMT')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchWiresSet$ = this.searchResponse$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'Wire')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  selectionModel$ = this.selections$.pipe(
    map(
      (selections) =>
        new SelectionModel(true, selections, true, this.selectionComparator),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  selectionComparator(o1: TableSelectionType, o2: TableSelectionType): boolean {
    return o1.flowOfFundsAmlTransactionId === o2.flowOfFundsAmlTransactionId;
  }

  protected _selectionsCurrent$ = this.selectionModel$.pipe(
    switchMap((selectionModel) =>
      selectionModel.changed.pipe(
        map(() => selectionModel.selected),
        startWith(selectionModel.selected),
      ),
    ),
    debounceTime(200),
    shareReplay({ bufferSize: 1, refCount: true }), // Share among multiple subscribers
  );

  fofSourceDataSelectionCount$ = this._selectionsCurrent$.pipe(
    combineLatestWith(this.searchFlowOfFundsSet$),
    map(
      ([selections, fofSet]) =>
        selections.filter((sel) => fofSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  abmSourceDataSelectionCount$ = this._selectionsCurrent$.pipe(
    combineLatestWith(this.searchAbmSet$),
    map(
      ([selections, abmSet]) =>
        selections.filter((sel) => abmSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  olbSourceDataSelectionCount$ = this._selectionsCurrent$.pipe(
    combineLatestWith(this.searchOlbSet$),
    map(
      ([selections, olbSet]) =>
        selections.filter((sel) => olbSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  emtSourceDataSelectionCount$ = this._selectionsCurrent$.pipe(
    combineLatestWith(this.searchEmtSet$),
    map(
      ([selections, emtSet]) =>
        selections.filter((sel) => emtSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  wiresSourceDataSelectionCount$ = this._selectionsCurrent$.pipe(
    combineLatestWith(this.searchWiresSet$),
    map(
      ([selections, wiresSet]) =>
        selections.filter((sel) =>
          wiresSet.has(sel.flowOfFundsAmlTransactionId),
        ).length,
    ),
  );
}
