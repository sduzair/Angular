/* eslint-disable @typescript-eslint/no-explicit-any */
import { Directive, forwardRef } from '@angular/core';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { Observable, merge, of } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Directive({
  selector:
    // eslint-disable-next-line @angular-eslint/directive-selector
    'input[matAutocomplete][persistentAutocomplete], textarea[matAutocomplete][persistentAutocomplete]',
  exportAs: 'persistentAutocompleteTrigger',
  providers: [
    {
      provide: MatAutocompleteTrigger,
      useExisting: forwardRef(() => PersistentAutocompleteTrigger),
    },
  ],
})
export class PersistentAutocompleteTrigger extends MatAutocompleteTrigger {
  override get panelClosingActions(): Observable<any> {
    const self = this as any; // Cast to any to access private members

    return merge(
      // Removed this.optionSelections to prevent close on selection
      this.autocomplete._keyManager.tabOut.pipe(
        filter(() => self._overlayAttached),
      ),
      self._closeKeyEventStream,
      self._getOutsideClickStream(),
      self._overlayRef
        ? self._overlayRef
            .detachments()
            .pipe(filter(() => self._overlayAttached))
        : of(),
    ).pipe(map((event) => null));
  }
}
