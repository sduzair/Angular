import type { Routes } from "@angular/router";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";
import { TableComponent } from "./table/table.component";
import { singleTabGuard } from "./single-tab.guard";
import { SingleTabGuardComponent } from "./single-tab-guard/single-tab-guard.component";
import { TransactionSearchComponent } from "./transaction-search/transaction-search.component";
import {
  transactionSearchResolver,
  TransactionViewComponent,
} from "./transaction-view/transaction-view.component";

export const routes: Routes = [
  {
    path: "transactionsearch",
    component: TransactionSearchComponent,
  },
  {
    path: "aml/:amlId/transaction-view",
    component: TransactionViewComponent,
    resolve: {
      transactionSearch: transactionSearchResolver,
    },
  },
  { path: "table", component: TableComponent, canActivate: [singleTabGuard] },
  {
    path: "edit-form/:sessionId",
    loadComponent: () =>
      import("./edit-form/edit-form.component").then(
        (mod) => mod.EditFormComponent,
      ),
    canActivate: [singleTabGuard],
  },
  { path: "", redirectTo: "/transactionsearch", pathMatch: "full" },
  { path: "single-tab-guard", component: SingleTabGuardComponent },
  { path: "**", component: PageNotFoundComponent },
];
