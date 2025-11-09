import type { Routes } from "@angular/router";
import {
  AmlComponent,
  lastUpdatedResolver,
  savingStatusResolver,
} from "./aml/aml.component";
import { SessionDataService } from "./aml/session-data.service";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";
import {
  EditFormComponent,
  singleEditResolver,
} from "./reporting-ui/edit-form/edit-form.component";
import {
  ReportingUiTableComponent,
  strTransactionsEditedResolver,
} from "./reporting-ui/reporting-ui-table/reporting-ui-table.component";
import { ReportingUiComponent } from "./reporting-ui/reporting-ui.component";
import { TransactionSearchComponent } from "./transaction-search/transaction-search.component";
import {
  TransactionViewComponent,
  selectionsResolver,
  transactionSearchResolver,
} from "./transaction-view/transaction-view.component";

export const routes: Routes = [
  {
    path: "transactionsearch",
    component: TransactionSearchComponent,
    title: "Search by AML Id",
  },
  {
    path: "aml/:amlId",
    component: AmlComponent,
    providers: [SessionDataService],
    resolve: {
      lastUpdated$: lastUpdatedResolver,
      savingStatus$: savingStatusResolver,
    },
    data: { reuse: true },
    children: [
      {
        path: "transaction-view",
        component: TransactionViewComponent,
        resolve: {
          transactionSearch: transactionSearchResolver,
          initSelections: selectionsResolver,
        },
        data: { reuse: true },
        title: (route) => `Transaction View - ${route.params["amlId"]}`,
      },
      {
        path: "reporting-ui",
        component: ReportingUiComponent,
        title: (route) => `Reporting UI - ${route.params["amlId"]}`,
        children: [
          {
            path: "table",
            component: ReportingUiTableComponent,
            resolve: { strTransactionData$: strTransactionsEditedResolver },
            data: { reuse: true },
          },
          {
            path: "edit-form/:transactionId",
            component: EditFormComponent,
            resolve: {
              editType: singleEditResolver,
            },
            data: { reuse: false },
            title: (route) => `Edit - ${route.params["transactionId"]}`,
          },
        ],
      },
    ],
  },
  { path: "", redirectTo: "/transactionsearch", pathMatch: "full" },
  { path: "**", component: PageNotFoundComponent },
];
