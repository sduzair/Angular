import { AbstractControl, ValidationErrors } from "@angular/forms";

/**
 * Set error based on predicate - add if true, remove if false
 * Set error to control while preserving existing errors
 */
export function setError(
  control: AbstractControl,
  error: ValidationErrors,
  predicate: () => boolean,
  opts?: {
    emitEvent?: boolean;
  },
): void {
  console.assert(
    Object.keys(error).length === 1,
    "Assert only one error key is being set",
  );
  const errorKey = Object.keys(error)[0];

  if (predicate()) {
    // Add error while preserving existing errors
    const existingErrors = control.errors || {};
    control.setErrors(
      {
        ...existingErrors,
        ...error,
      },
      opts,
    );
  } else {
    // Remove error while preserving other errors
    const existingErrors = control.errors;

    if (!existingErrors || !(errorKey in existingErrors)) {
      return;
    }

    const remainingErrors = { ...existingErrors };
    delete remainingErrors[errorKey];

    control.setErrors(
      Object.keys(remainingErrors).length > 0 ? remainingErrors : null,
      opts,
    );
  }
}
