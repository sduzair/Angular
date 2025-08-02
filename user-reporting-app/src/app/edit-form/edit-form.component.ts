import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { FormArray, FormControl, FormGroup } from "@angular/forms";
import {
  map,
  Observable,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from "rxjs";
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from "@angular/material/form-field";
import { MAT_CARD_CONFIG } from "@angular/material/card";
import {
  CrossTabEditService,
  EditTabReqResType,
} from "../cross-tab-edit.service";
import { WithVersion } from "../change-log.service";
import { ActivatedRoute } from "@angular/router";
import { removePageFromOpenTabs } from "../single-tab.guard";
import { StrTxn } from "../table/table.component";
import { MatToolbarModule } from "@angular/material/toolbar";
import { EditFormTemplateComponent } from "./edit-form-template/edit-form-template.component";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-edit-form",
  imports: [CommonModule, MatToolbarModule, EditFormTemplateComponent],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: "outline",
        floatLabel: "auto",
      } as MatFormFieldDefaultOptions,
    },
    {
      provide: MAT_CARD_CONFIG,
      useValue: { appearance: "outlined" },
    },
  ],
  template: `
    <!-- str-txn-form.component.html -->
    <mat-toolbar>
      <div class="d-flex justify-content-between align-items-center">
        <h1>
          STR Transaction Form
          {{ this.isBulkEdit ? " - Bulk Edit" : "" }}
        </h1>
      </div>
    </mat-toolbar>
    <app-edit-form-template *ngIf="editReq$" [editReq$]="editReq$" />
  `,
  styleUrls: ["./edit-form.component.scss"],
})
export class EditFormComponent implements OnInit, OnDestroy {
  isBulkEdit = false;
  validatorParams = {
    maxBirthDate: new Date(),
    passwordLenMin: 6,
    usernameLenMin: 4,
    phonePatterns: {
      us: /^(\+?\d{1,2}\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/,
    },
    postalCodeLenMax: 12,
    stateCodeLenMax: 3,
  };

  editFormTemplateComponent!: EditFormTemplateComponent;
  constructor(
    private crossTabEditService: CrossTabEditService,
    private activatedRoute: ActivatedRoute,
    private route: ActivatedRoute,
  ) {}
  editReq$: Observable<{ sessionId: string } & EditTabReqResType> | null = null;
  ngOnInit() {
    this.editReq$ = this.activatedRoute.params.pipe(
      takeUntil(this.destroy$),
      map((params) => params["sessionId"] as string),

      switchMap((sessionId) =>
        this.crossTabEditService
          .getEditRequestBySessionId(sessionId)
          .pipe(takeUntil(this.destroy$)),
      ),
      tap(({ type }) => {
        if (type === "BULK_EDIT_REQUEST") this.isBulkEdit = true;
      }),
      shareReplay(1),
    );
  }
  private readonly destroy$ = new Subject<void>();

  @HostListener("window:beforeunload", ["$event"])
  ngOnDestroy = (($event: Event) => {
    this.destroy$.next();
    this.destroy$.complete();

    removePageFromOpenTabs(this.route.snapshot);
  }) as () => void;
}
export type TypedForm<T> = {
  [K in keyof T]: Exclude<T[K], undefined> extends Array<infer U>
    ? FormArray<
        U extends object ? FormGroup<TypedForm<U>> : FormControl<U | null>
      >
    : T[K] extends object
      ? FormGroup<TypedForm<T[K]>>
      : FormControl<T[K] | null>;
};

export type StrTxnFormType = FormGroup<TypedForm<WithVersion<StrTxn>>>;
