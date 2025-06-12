import type { Routes } from "@angular/router";
import { PageNotFoundComponent } from "./page-not-found/page-not-found.component";
import { EditFormComponent } from "./edit-form/edit-form.component";
import { TableComponent } from "./table/table.component";

export const routes: Routes = [
  { path: "table", component: TableComponent },
  { path: "edit-form/:sessionId", component: EditFormComponent },
  { path: "", redirectTo: "/table", pathMatch: "full" },
  { path: "**", component: PageNotFoundComponent },
];
