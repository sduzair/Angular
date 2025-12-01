import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  RouteReuseStrategy,
  Router,
  provideRouter,
  withComponentInputBinding,
  withNavigationErrorHandler,
  withRouterConfig,
} from '@angular/router';

import { provideHttpClient } from '@angular/common/http';
import {
  MAT_DATE_FNS_FORMATS,
  provideDateFnsAdapter,
} from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { enCA } from 'date-fns/locale';
import { AppErrorHandlerService } from './app-error-handler.service';
import { routes } from './app.routes';
import { CachedRouteReuseStrategy } from './route-cache/preserve-route-reuse-strategy';
import {
  MAT_DIALOG_DEFAULT_OPTIONS,
  MatDialogConfig,
} from '@angular/material/dialog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({
        paramsInheritanceStrategy: 'always',
      }),
      withNavigationErrorHandler((navError) => {
        const router = inject(Router);
        console.error('Navigation error:', navError.error);
        router.navigate(['/transactionsearch']);
      }),
      // withDebugTracing(), // for debugging router
    ),
    { provide: RouteReuseStrategy, useClass: CachedRouteReuseStrategy },
    provideHttpClient(),
    provideDateFnsAdapter(MAT_DATE_FNS_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: enCA },
    { provide: ErrorHandler, useClass: AppErrorHandlerService },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'outline',
        floatLabel: 'auto',
      } satisfies MatFormFieldDefaultOptions,
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        autoFocus: 'dialog',
        restoreFocus: true,
      } satisfies MatDialogConfig,
    },
  ],
};
