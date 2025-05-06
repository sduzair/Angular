import type { Routes } from "@angular/router";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";
import { RecordComponent } from "./record/record.component";
import { TableComponent } from "./table/table.component";

export const routes: Routes = [
  { path: "table", component: TableComponent },
  { path: "record", component: RecordComponent },
  { path: "", redirectTo: "/table", pathMatch: "full" },
  { path: "**", component: PageNotFoundComponent },
];
