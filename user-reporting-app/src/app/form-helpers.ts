import {
  AbstractControl,
  FormArray,
  FormGroup,
  ValidationErrors,
} from '@angular/forms';

/**
 * Set error based on predicate - add if true, remove if false
 * Set error to control while preserving existing errors
 */
export function setError(
  control: AbstractControl,
  error: ValidationErrors,
  predicate: () => boolean = () => true,
  opts?: {
    emitEvent?: boolean;
  },
): void {
  console.assert(
    Object.keys(error).length === 1,
    'Assert only one error key is being set',
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

export function getFormErrors(
  form: FormGroup | FormArray,
  path = '',
): Record<string, ValidationErrors> {
  const parentErrors: Record<string, ValidationErrors> = {
    [`${path}`]: form.errors ?? {},
  };

  const result = Object.keys(form.controls).reduce(
    (acc, key) => {
      const control = form.get(key)!;
      const errors =
        control instanceof FormGroup || control instanceof FormArray
          ? getFormErrors(control, path ? `${path}.${key}` : key)
          : { [path ? `${path}.${key}` : key]: control.errors ?? {} };

      return { ...acc, ...errors };
    },
    {} as Record<string, ValidationErrors>,
  );
  return { ...parentErrors, ...result };
}
