import { DestroyRef, Directive, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appValidateOnParentChanges]',
  standalone: true,
})
export class ValidateOnParentChangesDirective implements OnInit {
  private control = inject(NgControl);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    // We need to wait a tick to ensure the control is attached to its parent
    setTimeout(() => {
      const currentControl = this.control.control;
      const parentGroup = currentControl?.parent;

      if (!parentGroup || !currentControl) return;

      parentGroup.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          // Whenever the parent group changes (e.g. status changes),
          // re-validate THIS control (i.e. the close date).
          currentControl.updateValueAndValidity({ emitEvent: false });
        });
    });
  }
}
