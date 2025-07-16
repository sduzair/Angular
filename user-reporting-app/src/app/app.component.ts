import { Component } from "@angular/core";
import {
  DateFnsAdapter,
  MAT_DATE_FNS_FORMATS,
} from "@angular/material-date-fns-adapter";
import {
  MAT_DATE_LOCALE,
  DateAdapter,
  MAT_DATE_FORMATS,
} from "@angular/material/core";
import { RouterOutlet } from "@angular/router";
import { enCA } from "date-fns/locale";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  template: "<router-outlet/>",
  styles: [],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: enCA },
    { provide: DateAdapter, useClass: DateFnsAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MAT_DATE_FNS_FORMATS },
  ],
})
export class AppComponent {
  title = "strtxn-reporting-app";
}
