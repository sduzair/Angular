import {
  ChangeDetectorRef,
  DestroyRef,
  Directive,
  HostBinding,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl } from '@angular/forms';
import { MARKED_AS_CLEARED } from './mark-as-cleared.directive';

@Directive({
  selector: '[appToggleControl]',
})
export class ControlToggleReadonlyDirective implements OnInit {
  private ngControl = inject(NgControl, { optional: true });
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  @HostBinding('attr.readonly')
  get readonly() {
    return this.ngControl?.control?.value === MARKED_AS_CLEARED ? '' : null;
  }

  ngOnInit() {
    if (!this.ngControl?.control) {
      return;
    }

    // Trigger initial evaluation
    this.cdr.markForCheck();

    // Re-evaluate whenever control value changes
    this.ngControl.control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }
}
