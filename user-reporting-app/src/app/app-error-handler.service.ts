import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpStatusCode,
} from '@angular/common/http';
import { ErrorHandler, inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AppErrorHandlerService implements ErrorHandler {
  private snackBar = inject(MatSnackBar);
  handleError(error: unknown): void {
    if (
      error instanceof HttpErrorResponse &&
      error.status === HttpStatusCode.Conflict
    ) {
      this.snackBar.open(error.error, 'Dismiss', {
        duration: 10000,
      });
    } else if (error instanceof HttpErrorResponse) {
      // Show detailed info for any HTTP error
      const msg =
        error.message || `HTTP Error ${error.status}: ${error.statusText}`;
      this.snackBar.open(msg, 'Dismiss', {
        duration: undefined,
      });
    } else if (error instanceof Error) {
      this.snackBar.open(error.message, 'Dismiss', {
        duration: undefined,
      });
    } else {
      this.snackBar.open('Some error occured!', 'Dismiss', {
        duration: undefined,
      });
    }
    console.warn('Caught by app error handler', error);
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandler);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Automatically forward all HTTP errors to global handler
      errorHandler.handleError(error);
      return throwError(() => error);
    }),
  );
};
