import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { BehaviorSubject, concatMap, filter } from 'rxjs';

interface SnackbarRequest {
  message: string;
  action?: string;
  config?: MatSnackBarConfig;
}

@Injectable({ providedIn: 'root' })
export class SnackbarQueueService {
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  // Subject to feed the queue
  private queue$ = new BehaviorSubject<SnackbarRequest | null>(null);

  constructor() {
    this.initQueueWorker();
  }

  /**
   * Public API to add a message to the queue.
   */
  open(message: string, action = 'OK', config?: MatSnackBarConfig) {
    this.queue$.next({
      message,
      action,
      config: { duration: 4000, ...config },
    });
  }

  /**
   * Worker that processes requests sequentially.
   * concatMap ensures the next observable doesn't start until the previous completes.
   */
  private initQueueWorker() {
    this.queue$
      .pipe(
        // Filter out initial null value
        filter((req) => !!req),
        // concatMap waits for the inner observable (afterDismissed) to complete
        concatMap((req: SnackbarRequest) => {
          const ref = this.snackBar.open(req.message, req.action, req.config);
          // Return the observable that completes when the snackbar closes
          return ref.afterDismissed();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
