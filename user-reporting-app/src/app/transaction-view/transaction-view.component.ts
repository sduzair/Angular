import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import {
  AbmSourceData,
  AmlTransactionSearchService,
  EmtSourceData,
  FlowOfFundsSourceData,
  OlbSourceData,
  SourceData,
  TransactionSearchResponse,
} from "../transaction-search/aml-transaction-search.service";
import { map, Observable, startWith, tap } from "rxjs";
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { FofTableComponent } from "./fof-table/fof-table.component";
import { MatSelectModule } from "@angular/material/select";
import { ISelectionComparator } from "../base-table/abstract-base-table";
import { SelectionModel } from "@angular/cdk/collections";
import { MatTabsModule } from "@angular/material/tabs";
import { AbmTableComponent } from "./abm-table/abm-table.component";
import { OlbTableComponent } from "./olb-table/olb-table.component";
import { EmtTableComponent } from "./emt-table/emt-table.component";
import { FormControl } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MatChip } from "@angular/material/chips";
import { MatButton } from "@angular/material/button";
import { isEqual } from "lodash-es";

@Component({
  selector: "app-transaction-view",
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
  ],
  template: `<div class="container-fluid px-0 my-1">
    <div class="row row-cols-1 mx-0">
      <mat-toolbar class="col">
        <mat-toolbar-row class="px-0 header-toolbar-row">
          <h1>Transaction View</h1>
          <!-- <mat-chip
            *ngIf="lastUpdated"
            selected="true"
            class="last-updated-chip"
          >
            <ng-container
              *ngIf="sessionDataService.saving$ | async; else updateIcon"
            >
              <mat-progress-spinner
                diameter="20"
                mode="indeterminate"
                class="last-updated-chip-spinner"
              ></mat-progress-spinner>
            </ng-container>
            <ng-template #updateIcon>
              <mat-icon class="mat-accent last-updated-chip-spinner"
                >update</mat-icon
              >
            </ng-template>
            Last Updated: {{ lastUpdated | date : "short" }}
          </mat-chip> -->
          <div class="flex-fill"></div>
          <button
            color="primary"
            mat-flat-button
            [disabled]="!(selectionControlHasChanges$ | async)"
          >
            Save
          </button>
        </mat-toolbar-row>
      </mat-toolbar>
      <mat-tab-group
        class="col"
        mat-stretch-tabs="false"
        mat-align-tabs="start"
      >
        <mat-tab>
          <ng-template mat-tab-label>
            Flow of Funds
            <mat-chip class="ms-1" disableRipple>
              {{ fofSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-fof-table
            [fofSourceData]="fofSourceData"
            [selection]="selection"
          />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            ABM
            <mat-chip class="ms-1" disableRipple>
              {{ abmSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-abm-table
            [abmSourceData]="abmSourceData"
            [selection]="selection"
          />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            OLB
            <mat-chip class="ms-1" disableRipple>
              {{ olbSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-olb-table
            [olbSourceData]="olbSourceData"
            [selection]="selection"
          />
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            EMT
            <mat-chip class="ms-1" disableRipple>
              {{ emtSourceDataSelectionCount$ | async }}
            </mat-chip>
          </ng-template>
          <app-emt-table
            [emtSourceData]="emtSourceData"
            [selection]="selection"
        /></mat-tab>
      </mat-tab-group>
    </div>
  </div> `,
  styleUrl: "./transaction-view.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionViewComponent
  implements ISelectionComparator<TableSelectionCompareWithAmlTxnId>
{
  fofSourceData: FlowOfFundsSourceData[] = [];
  abmSourceData: AbmSourceData[] = [];
  olbSourceData: OlbSourceData[] = [];
  emtSourceData: EmtSourceData[] = [];

  constructor(private route: ActivatedRoute) {
    (
      this.route.data as Observable<{
        transactionSearch: TransactionSearchResponse;
      }>
    ).subscribe(({ transactionSearch }) => {
      this.fofSourceData = transactionSearch.find(
        (res) => res.sourceId === "FlowOfFunds",
      )?.sourceData!;
      this.abmSourceData = transactionSearch.find(
        (res) => res.sourceId === "ABM",
      )?.sourceData!;
      this.olbSourceData = transactionSearch.find(
        (res) => res.sourceId === "OLB",
      )?.sourceData!;
      this.emtSourceData = transactionSearch.find(
        (res) => res.sourceId === "EMT",
      )?.sourceData!;
    });

    this.selection.changed
      .asObservable()
      .pipe(
        tap(() => {
          this.selectionControl.setValue(this.selection.selected);
        }),
      )
      .subscribe();

    this.selectionLastSaved = [];
    this.selectionControlHasChanges$ = this.selectionControl.valueChanges.pipe(
      startWith(this.selectionLastSaved),
      map((currentSelections) => {
        return !isEqual(currentSelections, this.selectionLastSaved);
      }),
    );
  }

  selection = new SelectionModel(true, [], true, this.selectionComparator);

  selectionComparator(
    o1: TableSelectionCompareWithAmlTxnId,
    o2: TableSelectionCompareWithAmlTxnId,
  ): boolean {
    return o1.flowOfFundsAmlTransactionId === o2.flowOfFundsAmlTransactionId;
  }

  selectionControl = new FormControl(this.selection.selected, {
    nonNullable: true,
  });

  fofSourceDataSelectionCount$ = this.selectionControl.valueChanges.pipe(
    startWith([] as TableSelectionCompareWithAmlTxnId[]),
    map((selectionTxns) => (selectionTxns as SourceData[]).length),
  );

  abmSourceDataSelectionCount$ = this.selectionControl.valueChanges.pipe(
    startWith([] as TableSelectionCompareWithAmlTxnId[]),
    map((selectionTxns) => {
      return (selectionTxns as SourceData[]).filter((txn) =>
        txn.flowOfFundsAmlTransactionId.startsWith("ABM"),
      ).length;
    }),
  );

  olbSourceDataSelectionCount$ = this.selectionControl.valueChanges.pipe(
    startWith([] as TableSelectionCompareWithAmlTxnId[]),
    map((selectionTxns) => {
      return (selectionTxns as SourceData[]).filter((txn) =>
        txn.flowOfFundsAmlTransactionId.startsWith("OLB"),
      ).length;
    }),
  );

  emtSourceDataSelectionCount$ = this.selectionControl.valueChanges.pipe(
    startWith([] as TableSelectionCompareWithAmlTxnId[]),
    map((selectionTxns) => {
      return (selectionTxns as SourceData[]).filter(
        (txn) =>
          txn.flowOfFundsAmlTransactionId.startsWith("OLB") &&
          (txn as EmtSourceData).sourceId === "EMT",
      ).length;
    }),
  );

  selectionLastSaved!: typeof TransactionViewComponent.prototype.selection.selected;
  selectionControlHasChanges$!: Observable<boolean>;
}

export const transactionSearchResolver: ResolveFn<TransactionSearchResponse> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const amlTransactionSearchService = inject(AmlTransactionSearchService);
  const amlId = route.paramMap.get("amlId")!;
  return amlTransactionSearchService.fetchTransactionSearch(amlId);
};

export type TableSelectionCompareWithAmlTxnId = {
  flowOfFundsAmlTransactionId: string;
};
