import {
  type ApplicationConfig,
  ErrorHandler,
  provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter, withComponentInputBinding } from "@angular/router";

import { provideHttpClient } from "@angular/common/http";
import { routes } from "./app.routes";
import { provideDateFnsAdapter } from "@angular/material-date-fns-adapter";
import { AppErrorHandlerService } from "./app-error-handler.service";
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from "@angular/material/form-field";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideDateFnsAdapter(),
    { provide: ErrorHandler, useClass: AppErrorHandlerService },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: "outline",
        floatLabel: "auto",
      } as MatFormFieldDefaultOptions,
    },
  ],
};
