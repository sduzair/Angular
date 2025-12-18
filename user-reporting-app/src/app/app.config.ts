import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  RedirectCommand,
  RouteReuseStrategy,
  Router,
  provideRouter,
  withComponentInputBinding,
  withDebugTracing,
  withNavigationErrorHandler,
  withRouterConfig,
} from '@angular/router';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  MAT_DATE_FNS_FORMATS,
  provideDateFnsAdapter,
} from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  MAT_DIALOG_DEFAULT_OPTIONS,
  MatDialogConfig,
} from '@angular/material/dialog';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { enCA } from 'date-fns/locale';
import {
  AppErrorHandlerService,
  errorInterceptor,
} from './app-error-handler.service';
import { routes } from './app.routes';
import { CachedRouteReuseStrategy } from './route-cache/preserve-route-reuse-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({
        paramsInheritanceStrategy: 'always',
      }),
      withNavigationErrorHandler((navError) => {
        console.error('Navigation error:', navError.error);
        inject(ErrorHandler).handleError(navError.error);
        return new RedirectCommand(
          inject(Router).parseUrl('/transactionsearch'),
        );
      }),
      // withDebugTracing(), // for debugging router
    ),
    { provide: RouteReuseStrategy, useClass: CachedRouteReuseStrategy },
    provideHttpClient(withInterceptors([errorInterceptor])),
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
