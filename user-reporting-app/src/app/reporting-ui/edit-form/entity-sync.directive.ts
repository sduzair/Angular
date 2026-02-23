import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  DestroyRef,
  Directive,
  ErrorHandler,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlContainer, FormGroup } from '@angular/forms';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  map,
  startWith,
  switchMap,
  tap,
  timer,
  withLatestFrom,
} from 'rxjs';
import { CaseRecordStore } from '../../aml/case-record.store';
import { setError } from '../../form-helpers';
import { TransactionSearchService } from '../../transaction-search/transaction-search.service';
import { TypedForm } from './edit-form.component';

@Directive({
  selector: '[appEntitySync]',
})
export class EntitySyncDirective implements OnInit {
  private controlContainer = inject(ControlContainer);
  protected caseRecordStore = inject(CaseRecordStore);
  private searchService = inject(TransactionSearchService);
  private destroyRef = inject(DestroyRef);
  private errorHandler = inject(ErrorHandler);

  protected entities$ = this.caseRecordStore.state$.pipe(
    map(({ entities }) => entities),
  );

  ngOnInit() {
    const group = this.controlContainer.control as FormGroup<
      TypedForm<{
        linkToSub: string;
        _hiddenPartyKey: string | null;
        _hiddenSurname: string | null;
        _hiddenGivenName: string | null;
        _hiddenOtherOrInitialName: string | null;
        _hiddenNameOfEntity: string | null;
      }>
    >;

    const linkCtrl = group.controls.linkToSub;
    const partyKeyCtrl = group.controls._hiddenPartyKey;

    // -----------------------------------------------------------
    // 1. Link to Subject -> Populate & Disable Hidden Fields
    // -----------------------------------------------------------
    linkCtrl.valueChanges
      .pipe(
        startWith(linkCtrl.value),
        withLatestFrom(this.entities$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([linkId, entitiesLocal]) => {
        if (linkCtrl.disabled) return;

        // Toggle logic based on whether a link is selected
        if (!linkId) {
          // Clear Link -> Enable fields for manual entry
          group.controls._hiddenPartyKey.enable({ emitEvent: false });
          group.controls._hiddenGivenName.enable({ emitEvent: false });
          group.controls._hiddenSurname.enable({ emitEvent: false });
          group.controls._hiddenNameOfEntity.enable({ emitEvent: false });
          group.controls._hiddenOtherOrInitialName.enable({ emitEvent: false });

          group.patchValue(
            {
              _hiddenPartyKey: null,
              _hiddenGivenName: null,
              _hiddenSurname: null,
              _hiddenOtherOrInitialName: null,
              _hiddenNameOfEntity: null,
            },
            { emitEvent: false }, // do not trigger infinite loops
          );
          return;
        }

        const entity = entitiesLocal.find((p) => p.entityIdentifier === linkId);
        console.assert(!!entity, 'Assert entity exists in local state');

        const {
          givenName,
          surname,
          otherOrInitialName,
          nameOfEntity,
          partyKey,
        } = entity ?? {};

        // Populate fields
        group.patchValue(
          {
            _hiddenPartyKey: partyKey,
            _hiddenGivenName: givenName,
            _hiddenSurname: surname,
            _hiddenOtherOrInitialName: otherOrInitialName,
            _hiddenNameOfEntity: nameOfEntity,
          },
          { emitEvent: false }, // do not trigger infinite loops
        );

        group.controls._hiddenPartyKey.disable({ emitEvent: false });
        group.controls._hiddenGivenName.disable({ emitEvent: false });
        group.controls._hiddenSurname.disable({ emitEvent: false });
        group.controls._hiddenNameOfEntity.disable({ emitEvent: false });
        group.controls._hiddenOtherOrInitialName.disable({ emitEvent: false });
      });

    // -----------------------------------------------------------
    // 2. Manual Party Key -> Auto-Select Subject
    // -----------------------------------------------------------
    partyKeyCtrl.valueChanges
      .pipe(
        distinctUntilChanged(),
        withLatestFrom(this.entities$),
        tap(() => {
          group.patchValue(
            {
              _hiddenGivenName: null,
              _hiddenSurname: null,
              _hiddenOtherOrInitialName: null,
              _hiddenNameOfEntity: null,
            },
            { emitEvent: false },
          );
        }),
        switchMap(([inputKey, entitiesLocal]) => {
          if (partyKeyCtrl.disabled) return EMPTY;

          if (!inputKey) return EMPTY;

          const partyMatch = entitiesLocal.find((p) => p.partyKey === inputKey);

          const isPartyAlreadySet =
            linkCtrl.value === partyMatch?.entityIdentifier;

          if (partyMatch && !isPartyAlreadySet) {
            // This sets the link, which triggers Logic #1 above
            linkCtrl.setValue(partyMatch.entityIdentifier);
            return EMPTY;
          }

          // Attempting to fetch party info when entity not found in local state
          return timer(1000).pipe(
            switchMap(() =>
              this.searchService.getPartyInfo(inputKey).pipe(
                tap(
                  ({
                    givenName,
                    surname,
                    otherOrInitialName,
                    nameOfEntity,
                  }) => {
                    group.patchValue(
                      {
                        _hiddenGivenName: givenName,
                        _hiddenSurname: surname,
                        _hiddenOtherOrInitialName: otherOrInitialName,
                        _hiddenNameOfEntity: nameOfEntity,
                      },
                      { emitEvent: false },
                    );
                    group.controls._hiddenGivenName.disable({
                      emitEvent: false,
                    });
                    group.controls._hiddenSurname.disable({ emitEvent: false });
                    group.controls._hiddenNameOfEntity.disable({
                      emitEvent: false,
                    });
                    group.controls._hiddenOtherOrInitialName.disable({
                      emitEvent: false,
                    });
                  },
                ),
                catchError((error: HttpErrorResponse) => {
                  if (error.status === HttpStatusCode.NotFound) {
                    setError(partyKeyCtrl, {
                      invalidPartyKey: 'Invalid party key',
                    });
                    return EMPTY;
                  }

                  this.errorHandler.handleError(error);
                  return EMPTY;
                }),
              ),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
