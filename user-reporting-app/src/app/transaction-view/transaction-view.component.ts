import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
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
  combineLatestWith,
  debounceTime,
  map,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { CaseRecordStore } from '../aml/case-record.store';
import { TransactionSearchComponent } from '../transaction-search/transaction-search.component';
import {
  TransactionSearchResponse,
  TransactionSearchService,
} from '../transaction-search/transaction-search.service';
import { AbmTableComponent } from './abm-table/abm-table.component';
import { EmtTableComponent } from './emt-table/emt-table.component';
import { FofTableComponent } from './fof-table/fof-table.component';
import { OlbTableComponent } from './olb-table/olb-table.component';
import { WiresTableComponent } from './wires-table/wires-table.component';
import { AbstractTransactionViewComponent } from './abstract-transaction-view.component';

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
  ],
  template: `
    <div class="row row-cols-1 mx-0">
      <mat-toolbar class="col">
        <mat-toolbar-row class="px-0 header-toolbar-row">
          <div class="flex-fill"></div>
          <button
            type="button"
            color="primary"
            mat-flat-button
            [disabled]="(selectionControlHasChanges$ | async) === false">
            Save
          </button>
        </mat-toolbar-row>
      </mat-toolbar>
    </div>
    @if (selectionModel$ | async; as selectionModel) {
      <mat-tab-group
        class="col"
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
            [selection]="selectionModel" />
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
            [selection]="selectionModel" />
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
            [selection]="selectionModel" />
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
            [selection]="selectionModel"
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
            [selection]="selectionModel" />
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styleUrl: './transaction-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionViewComponent extends AbstractTransactionViewComponent {
  fofSourceData$ = this.transactionSearch$.pipe(
    map(
      (search) =>
        search.find((res) => res.sourceId === 'FlowOfFunds')?.sourceData!,
    ),
  );

  abmSourceData$ = this.transactionSearch$.pipe(
    map((search) => search.find((res) => res.sourceId === 'ABM')?.sourceData!),
  );

  olbSourceData$ = this.transactionSearch$.pipe(
    map((search) => search.find((res) => res.sourceId === 'OLB')?.sourceData!),
  );

  emtSourceData$ = this.transactionSearch$.pipe(
    map((search) => search.find((res) => res.sourceId === 'EMT')?.sourceData!),
  );

  wiresSourceData$ = this.transactionSearch$.pipe(
    map(
      (search) => search.find((res) => res.sourceId === 'Wires')?.sourceData!,
    ),
  );

  private selectionsLastSaved$ = this.initSelections$.pipe(
    map(
      (selections) =>
        new Set(selections.map((sel) => sel.flowOfFundsAmlTransactionId)),
    ),
  );

  selectionControlHasChanges$ = this.selections$.pipe(debounceTime(200)).pipe(
    combineLatestWith(this.selectionsLastSaved$),
    map(
      ([selections, selectionsLastSaved]) =>
        selections.length !== selectionsLastSaved.size ||
        !selections.every((sel) =>
          selectionsLastSaved.has(sel.flowOfFundsAmlTransactionId),
        ),
    ),
  );
}

export const transactionSearchResolver: ResolveFn<TransactionSearchResponse> = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
) => {
  const txnSearchService = inject(TransactionSearchService);
  const caseRecordStore = inject(CaseRecordStore);

  const searchParams:
    | (typeof TransactionSearchComponent.prototype.searchParamsForm)['value']
    | undefined =
    inject(Router).currentNavigation()?.extras.state?.['searchParams'];

  const amlId = route.paramMap.get('amlId')!;

  if (!searchParams) {
    return caseRecordStore.fetchCaseRecordByAmlId(amlId).pipe(
      switchMap(({ transactionSearchParams }) => {
        return txnSearchService.searchTransactions({
          accountNumbersSelection:
            transactionSearchParams.accountNumbersSelection ?? [],
          partyKeysSelection: transactionSearchParams.partyKeysSelection ?? [],
          productTypesSelection:
            transactionSearchParams.productTypesSelection ?? [],
          reviewPeriodSelection:
            transactionSearchParams.reviewPeriodSelection ?? [],
          sourceSystemsSelection:
            transactionSearchParams.sourceSystemsSelection ?? [],
        });
      }),
    );
  }

  caseRecordStore.setSearchParams(searchParams);
  return caseRecordStore.state$.pipe(
    switchMap(({ transactionSearchParams }) => {
      return txnSearchService.searchTransactions(transactionSearchParams);
    }),
  );
};

export const initSelectionsResolver: ResolveFn<
  { flowOfFundsAmlTransactionId: string }[]
> = (_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  return inject(CaseRecordStore)
    .fetchSelections()
    .pipe(
      map(({ selections }) => {
        return selections.map(
          (txn) =>
            ({
              flowOfFundsAmlTransactionId: txn.flowOfFundsAmlTransactionId,
            }) satisfies TableSelectionType,
        );
      }),
    );
};

export interface TableSelectionType {
  flowOfFundsAmlTransactionId: string;
}
