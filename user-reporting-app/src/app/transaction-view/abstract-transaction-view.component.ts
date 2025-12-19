import { SelectionModel } from '@angular/cdk/collections';
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  shareReplay,
  map,
  switchMap,
  startWith,
  debounceTime,
  combineLatestWith,
} from 'rxjs';
import { TransactionSearchResponse } from '../transaction-search/transaction-search.service';
import { TableSelectionType } from './transaction-view.component';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
export abstract class AbstractTransactionViewComponent {
  readonly transactionSearch = input.required<TransactionSearchResponse>();
  readonly initSelections = input.required<TableSelectionType[]>();

  transactionSearch$ = toObservable(this.transactionSearch).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  initSelections$ = toObservable(this.initSelections).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  searchFlowOfFundsSet$ = this.transactionSearch$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'FlowOfFunds')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchAbmSet$ = this.transactionSearch$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'ABM')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  searchOlbSet$ = this.transactionSearch$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'OLB')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchEmtSet$ = this.transactionSearch$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'EMT')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchWiresSet$ = this.transactionSearch$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'Wires')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  selectionModel$ = this.initSelections$.pipe(
    map(
      (selections) =>
        new SelectionModel(true, selections, true, this.selectionComparator),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  selectionComparator(o1: TableSelectionType, o2: TableSelectionType): boolean {
    return o1.flowOfFundsAmlTransactionId === o2.flowOfFundsAmlTransactionId;
  }

  protected selections$ = this.selectionModel$.pipe(
    switchMap((selectionModel) =>
      selectionModel.changed.pipe(
        map(() => selectionModel.selected),
        startWith(selectionModel.selected),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }), // Share among multiple subscribers
  );

  fofSourceDataSelectionCount$ = this.selections$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchFlowOfFundsSet$),
    map(
      ([selections, fofSet]) =>
        selections.filter((sel) => fofSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  abmSourceDataSelectionCount$ = this.selections$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchAbmSet$),
    map(
      ([selections, abmSet]) =>
        selections.filter((sel) => abmSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  olbSourceDataSelectionCount$ = this.selections$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchOlbSet$),
    map(
      ([selections, olbSet]) =>
        selections.filter((sel) => olbSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  emtSourceDataSelectionCount$ = this.selections$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchEmtSet$),
    map(
      ([selections, emtSet]) =>
        selections.filter((sel) => emtSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  wiresSourceDataSelectionCount$ = this.selections$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchWiresSet$),
    map(
      ([selections, wiresSet]) =>
        selections.filter((sel) =>
          wiresSet.has(sel.flowOfFundsAmlTransactionId),
        ).length,
    ),
  );
}
