import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpStatusCode,
} from '@angular/common/http';
import { ErrorHandler, inject, Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SnackbarQueueService } from './snackbar-queue.service';

@Injectable()
export class AppErrorHandlerService implements ErrorHandler {
  private snackbarQ = inject(SnackbarQueueService);
  handleError(error: unknown): void {
    if (
      error instanceof HttpErrorResponse &&
      error.status === HttpStatusCode.Conflict
    ) {
      this.snackbarQ.open(error.error, 'Dismiss', {
        duration: 10000,
      });
    } else if (error instanceof HttpErrorResponse) {
      // Show detailed info for any HTTP error
      const msg =
        error.message || `HTTP Error ${error.status}: ${error.statusText}`;
      this.snackbarQ.open(msg, 'Dismiss', {
        duration: undefined,
      });
    } else if (error instanceof Error) {
      this.snackbarQ.open(error.message, 'Dismiss', {
        duration: undefined,
      });
    } else {
      this.snackbarQ.open('Some error occured!', 'Dismiss', {
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
