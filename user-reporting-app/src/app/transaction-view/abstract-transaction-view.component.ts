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
  readonly searchResult$ = inject(CaseRecordStore).state$.pipe(
    map(({ searchResult }) => searchResult),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly selections$ = inject(CaseRecordStore).state$.pipe(
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

  searchFlowOfFundsSet$ = this.searchResult$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'FlowOfFunds')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchAbmSet$ = this.searchResult$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'ABM')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  searchOlbSet$ = this.searchResult$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'OLB')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchEmtSet$ = this.searchResult$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'EMT')
          ?.sourceData.map((txn) => txn.flowOfFundsAmlTransactionId),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  searchWiresSet$ = this.searchResult$.pipe(
    map((search) => {
      return new Set(
        search
          .find((source) => source.sourceId === 'Wires')
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

  protected selectionsCurrent$ = this.selectionModel$.pipe(
    switchMap((selectionModel) =>
      selectionModel.changed.pipe(
        map(() => selectionModel.selected),
        startWith(selectionModel.selected),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }), // Share among multiple subscribers
  );

  fofSourceDataSelectionCount$ = this.selectionsCurrent$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchFlowOfFundsSet$),
    map(
      ([selections, fofSet]) =>
        selections.filter((sel) => fofSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  abmSourceDataSelectionCount$ = this.selectionsCurrent$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchAbmSet$),
    map(
      ([selections, abmSet]) =>
        selections.filter((sel) => abmSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  olbSourceDataSelectionCount$ = this.selectionsCurrent$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchOlbSet$),
    map(
      ([selections, olbSet]) =>
        selections.filter((sel) => olbSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  emtSourceDataSelectionCount$ = this.selectionsCurrent$.pipe(
    debounceTime(200),
    combineLatestWith(this.searchEmtSet$),
    map(
      ([selections, emtSet]) =>
        selections.filter((sel) => emtSet.has(sel.flowOfFundsAmlTransactionId))
          .length,
    ),
  );

  wiresSourceDataSelectionCount$ = this.selectionsCurrent$.pipe(
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
