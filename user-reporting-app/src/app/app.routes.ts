import type { Routes } from "@angular/router";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";
import {
  EditFormComponent,
  singleEditResolver
} from "./reporting-ui/edit-form/edit-form.component";
import {
  ReportingUiTableComponent,
  strTransactionsEditedResolver,
} from "./reporting-ui/reporting-ui-table/reporting-ui-table.component";
import { ReportingUiComponent } from "./reporting-ui/reporting-ui.component";
import { SingleTabGuardComponent } from "./single-tab-guard/single-tab-guard.component";
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
    path: "aml/:amlId/transaction-view",
    component: TransactionViewComponent,
    resolve: {
      transactionSearch: transactionSearchResolver,
      initSelections: selectionsResolver,
    },
    title: (route) => `Transaction View - ${route.params["amlId"]}`,
  },
  {
    path: "aml/:amlId/reporting-ui",
    component: ReportingUiComponent,
    title: (route) => `Reporting UI - ${route.params["amlId"]}`,
    children: [
      {
        path: "table",
        component: ReportingUiTableComponent,
        resolve: { strTransactionsEdited: strTransactionsEditedResolver },
      },
      {
        path: "edit-form/:txnId",
        component: EditFormComponent,
        resolve: {
          editType: singleEditResolver,
        },
        title: (route) => `Edit - ${route.params["txnId"]}`,
      },
    ],
  },
  { path: "", redirectTo: "/transactionsearch", pathMatch: "full" },
  { path: "single-tab-guard", component: SingleTabGuardComponent },
  { path: "**", component: PageNotFoundComponent },
];
