import type { Routes } from "@angular/router";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";
import { RecordFormComponent } from "./record-form/record-form.component";
import { TableComponent } from "./table/table.component";

export const routes: Routes = [
  { path: "table", component: TableComponent },
  { path: "record/:userId", component: RecordFormComponent },
  { path: "", redirectTo: "/table", pathMatch: "full" },
  { path: "**", component: PageNotFoundComponent },
];
