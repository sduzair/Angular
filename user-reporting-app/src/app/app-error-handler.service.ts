import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, inject, Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable()
export class AppErrorHandlerService implements ErrorHandler {
  private snackBar = inject(MatSnackBar);
  handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.snackBar.open(error.error, "Dismiss", {
        duration: 10000,
      });
    } else if (error instanceof Error) {
      this.snackBar.open(error.message, "Dismiss", {
        duration: 10000,
      });
    } else {
      this.snackBar.open("Some error occured!", "Dismiss", {
        duration: 10000,
      });
    }
    console.warn("Caught by app error handler", error);
  }
}
