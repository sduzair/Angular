import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { WorkSheet, read, utils } from '@e965/xlsx';
import {
  BehaviorSubject,
  catchError,
  defer,
  filter,
  finalize,
  from,
  fromEvent,
  map,
  switchMap,
  tap,
  throttleTime,
  throwError,
} from 'rxjs';
import {
  SessionStateService,
  StrTransactionWithChangeLogs,
} from '../../aml/session-state.service';
import {
  FormOptions,
  FormOptionsService,
} from '../edit-form/form-options.service';
import {
  ReportingUiTableComponent,
  _hiddenValidationType,
} from '../reporting-ui-table/reporting-ui-table.component';
import { ManualTransactionBuilder } from './manual-transaction-builder';
import {
  MANUAL_TRANSACTIONS_WITH_CHANGELOGS_DEV_OR_TEST_ONLY_FIXTURE,
  ManualUploadReviewTableComponent,
} from './manual-upload-review-table/manual-upload-review-table.component';

@Component({
  selector: 'app-manual-upload-stepper',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatStepperModule,
    MatIcon,
    MatButtonModule,
    ManualUploadReviewTableComponent,
  ],
  template: `
    <h2 mat-dialog-title>Manual Upload Dialog</h2>

    <mat-dialog-content>
      <form [formGroup]="stepperFormGroup">
        <mat-stepper
          [linear]="true"
          #stepper
          (selectionChange)="onStepChange($event)">
          <!-- Step 1: Pick File -->
          <mat-step
            [stepControl]="stepperFormGroup.controls.step1PickFile"
            [editable]="stepperFormGroup.invalid"
            label="Upload File">
            <div class="py-4 text-center">
              <div
                #dropZone
                class="drop-zone"
                (drop)="onDrop($event)"
                [ngClass]="{
                  'drop-zone-valid': (isValidExcelFile$ | async) === true,
                  'drop-zone-invalid': (isValidExcelFile$ | async) === false,
                }">
                <mat-icon class="upload-icon mb-3">cloud_upload</mat-icon>

                <p class="upload-text my-3">Drag and drop your file here or</p>

                <input
                  #fileInput
                  type="file"
                  id="file-input"
                  hidden
                  accept=".csv,.xlsx"
                  (click)="onFileInputClick(fileInput)"
                  (change)="onFilePicked($event)" />

                <button
                  mat-raised-button
                  color="primary"
                  type="button"
                  (click)="fileInput.click()"
                  [disabled]="_processingFile$ | async">
                  Browse Files
                </button>

                @if (selectedFile) {
                  <p
                    class="file-info d-flex justify-content-center align-items-center gap-2 mt-3">
                    <mat-icon>description</mat-icon>
                    {{ selectedFile.name }} ({{
                      (selectedFile.size / 1024).toFixed(2)
                    }}
                    KB)
                  </p>
                }
              </div>

              <p class="help-text mt-3">Supported format: Excel (.xlsx)</p>
            </div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button type="button" mat-button (click)="cancelDialog()">
                Cancel
              </button>
              <button
                type="button"
                mat-raised-button
                color="primary"
                matStepperNext
                [disabled]="
                  !stepperFormGroup.controls.step1PickFile.valid ||
                  (_processingFile$ | async)
                ">
                Next
              </button>
            </div>
          </mat-step>

          <!-- Step 2: Preview Data -->
          <mat-step
            [stepControl]="
              stepperFormGroup.controls.step2ReviewTableValidationErrors
            "
            [editable]="stepperFormGroup.invalid"
            label="Review Data">
            <div class="py-4">
              <p>Preview of uploaded data:</p>

              @if (parsedData) {
                <div>
                  <app-manual-upload-review-table
                    [manualStrTransactionData]="parsedData" />
                </div>
              }
            </div>

            <div class="d-flex justify-content-end gap-2 mt-4">
              <button type="button" mat-button matStepperPrevious>Back</button>
              <button
                type="button"
                mat-raised-button
                color="primary"
                (click)="onUpload(stepper)"
                [disabled]="
                  !stepperFormGroup.controls.step2ReviewTableValidationErrors
                    .valid ||
                  stepperFormGroup.controls.readyForUpload.valid ||
                  (sessionDataService.savingStatus$ | async)
                ">
                Upload
              </button>
            </div>
          </mat-step>

          <!-- Step 3: Success Message -->
          <mat-step label="Complete">
            <div class="success-container">
              <mat-icon class="success-icon">check_circle</mat-icon>
              <h3>Success!</h3>
              <p>Your data has been imported successfully.</p>
              @if (parsedData) {
                <p>{{ parsedData.length }} records were processed.</p>
              }
            </div>
          </mat-step>
        </mat-stepper>
      </form>
    </mat-dialog-content>
  `,
  styleUrl: './manual-upload-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualUploadStepperComponent implements AfterViewInit, OnDestroy {
  onFileInputClick(fileInput: HTMLInputElement) {
    // eslint-disable-next-line no-param-reassign
    fileInput.value = null as unknown as string;
  }
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<ManualUploadStepperComponent>);

  @ViewChild('dropZone') dropZone!: ElementRef;
  stepperFormGroup = this.fb.nonNullable.group({
    step1PickFile: [null as File | null, Validators.required],
    step2ReviewTableValidationErrors: [
      [] as _hiddenValidationType[],
      reviewTableErrorValidation(),
    ],
    readyForUpload: [false, readyForUploadValidator()],
  });
  selectedFile: File | null = null;
  parsedData: StrTransactionWithChangeLogs[] =
    MANUAL_TRANSACTIONS_WITH_CHANGELOGS_DEV_OR_TEST_ONLY_FIXTURE;

  private _isValidExcelFile = new BehaviorSubject<boolean | null>(null);
  isValidExcelFile$ = this._isValidExcelFile.asObservable();

  ngOnDestroy(): void {
    this._isValidExcelFile.complete();
  }

  ngAfterViewInit(): void {
    fromEvent<DragEvent>(this.dropZone.nativeElement, 'dragover')
      .pipe(
        tap((event) => {
          event.preventDefault();
          event.stopPropagation();
          if (this._isValidExcelFile.value === true) {
            // eslint-disable-next-line no-param-reassign
            event.dataTransfer!.dropEffect = 'copy';
          } else if (this._isValidExcelFile.value === false) {
            // eslint-disable-next-line no-param-reassign
            event.dataTransfer!.dropEffect = 'none';
          }
        }),
        throttleTime(300),
        tap((event) => this.onDragOver(event)),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe();

    fromEvent<DragEvent>(this.dropZone.nativeElement, 'dragleave')
      .pipe(
        tap((event) => this.onDragLeave(event)),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    // Check if we're still within the drop zone
    if (this.dropZone.nativeElement.contains(event.relatedTarget as Node)) {
      return;
    }

    this._isValidExcelFile.next(null);
  }

  onDragOver(event: DragEvent): void {
    const dragEvent = event;
    const fileTypes = Array.from(
      event.dataTransfer ? event.dataTransfer.items : [],
    ).map((item) => item.type);

    if (!this.isValidFileType(fileTypes)) {
      this._isValidExcelFile.next(false);
      dragEvent.dataTransfer!.dropEffect = 'none';
      return;
    }

    this._isValidExcelFile.next(true);
    dragEvent.dataTransfer!.dropEffect = 'copy';
  }

  onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;

    const fileTypes = Array.from(input.files ?? []).map((file) => file.type);

    if (!this.isValidFileType(fileTypes)) {
      this._isValidExcelFile.next(false);
      this.selectedFile = null;
      this.stepperFormGroup.patchValue({ step1PickFile: null });
      return;
    }

    this._isValidExcelFile.next(null);
    const file = input.files![0];
    this.selectedFile = file;
    this.stepperFormGroup.patchValue({ step1PickFile: file });
    this.processFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const fileTypes = Array.from(
      event.dataTransfer ? event.dataTransfer.items : [],
    ).map((item) => item.type);

    if (!this.isValidFileType(fileTypes)) {
      this._isValidExcelFile.next(false);
      this.selectedFile = null;
      this.stepperFormGroup.patchValue({ step1PickFile: null });
      return;
    }

    this._isValidExcelFile.next(null);
    const file = event.dataTransfer!.files[0];
    this.selectedFile = file;
    this.stepperFormGroup.patchValue({ step1PickFile: file });
    this.processFile(file);
  }

  readonly VALID_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  ];

  private isValidFileType(fileTypes: string[]) {
    if (fileTypes.length !== 1) {
      return false;
    }

    // Check MIME type
    const hasValidMimeType = this.VALID_TYPES.includes(fileTypes[0]);

    return hasValidMimeType;
  }

  protected _processingFile$ = new BehaviorSubject(false);

  processFile(file: File) {
    this._processingFile$.next(true);
    this._processFile(file)
      .pipe(
        catchError((error) => {
          this._isValidExcelFile.next(false);
          this.selectedFile = null;
          this.stepperFormGroup.patchValue({ step1PickFile: null });

          return throwError(() => error);
        }),

        finalize(() => this._processingFile$.next(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe({
        next: (strTxns = []) => {
          this.parsedData = strTxns;
          this.stepperFormGroup.controls.step2ReviewTableValidationErrors.setValue(
            this.parsedData.reduce(
              (acc, { _hiddenValidation = [] }) => [
                ...acc,
                ..._hiddenValidation,
              ],
              [] as _hiddenValidationType[],
            ),
          );
          console.log('Processed transactions:', this.parsedData);
        },
      });
  }

  private formOptionsService = inject(FormOptionsService);

  _processFile(file: File) {
    return defer(() => from(file.arrayBuffer())).pipe(
      map((arrayBuffer) => read(arrayBuffer)),
      map((wb) => {
        const ws: WorkSheet = wb.Sheets[wb.SheetNames[0]];
        const customProps = wb.Custprops as typeof MANUAL_UPLOAD_FILE_VERSION;
        if (
          customProps.manualupload !== MANUAL_UPLOAD_FILE_VERSION.manualupload
        ) {
          throw new Error('Unknown manual upload file');
        }
        // Convert to JSON
        return utils.sheet_to_json<Record<ColumnHeaderLabels, string>>(ws, {
          defval: null,
          raw: false,
        });
      }),
      switchMap((jsonData) => {
        return this.formOptionsService.formOptions$.pipe(
          map((formOptions) => ({ jsonData, formOptions })),
        );
      }),
      map(({ jsonData, formOptions }) =>
        jsonData.map((json) =>
          this.convertSheetJsonToStrTxn(json, formOptions),
        ),
      ),
    );
  }

  convertSheetJsonToStrTxn(
    value: Record<ColumnHeaderLabels, string>,
    formOptions: FormOptions,
  ): StrTransactionWithChangeLogs {
    const transaction = new ManualTransactionBuilder(value, formOptions)
      .withMetadata()
      .withBasicInfo()
      .withFlowOfFundsInfo()
      .withStartingAction()
      .withCompletingAction()
      .withRowValidation()
      .withValidationErrors()
      .build();

    return transaction;
  }

  protected sessionDataService = inject(SessionStateService);
  onUpload(stepper: MatStepper) {
    this.stepperFormGroup.controls.readyForUpload.setValue(true);
    this.sessionDataService.saveManualTransactions(this.parsedData);
    // After successful upload, move to next step
    this.sessionDataService
      .whenCompleted(this.parsedData.map((d) => d.flowOfFundsAmlTransactionId))
      .pipe(
        tap(() => stepper.next()),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-composition
      .subscribe();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  cancelDialog(): void {
    this.dialogRef.close();
  }

  onStepChange(event: StepperSelectionEvent): void {
    switch (event.selectedIndex) {
      case 0: // Step 1: Upload
        this.dialogRef.updateSize(MANUAL_UPLOAD_STEPPER_WIDTH_DEFAULT, '');
        break;
      case 1: // Step 2: Preview data
        this.dialogRef.updateSize('920px', ''); // Wider for table
        break;
      case 2: // Step 3: Success
        this.dialogRef.updateSize(MANUAL_UPLOAD_STEPPER_WIDTH_DEFAULT, '');
        break;
    }
  }
}

export const MANUAL_UPLOAD_STEPPER_WIDTH_DEFAULT = '600px';

export type ColumnHeaderLabels =
  (typeof ReportingUiTableComponent.displayedColumnsColumnHeaderMap)[keyof typeof ReportingUiTableComponent.displayedColumnsColumnHeaderMap];

function reviewTableErrorValidation(): (
  control: AbstractControl,
) => ValidationErrors | null {
  const blockingValidationErrors = new Set([
    'invalidDate',
    'invalidTime',
    'conductorMissing',
    'invalidDirectionOfSA',
    'invalidAmountCurrency',
    'invalidAccountCurrency',
    'invalidAccountStatus',
  ] as _hiddenValidationType[]);

  return (control) => {
    const { value: validationErrors } =
      control as typeof ManualUploadStepperComponent.prototype.stepperFormGroup.controls.step2ReviewTableValidationErrors;

    const isBlockingValidationError = validationErrors.some((validationError) =>
      blockingValidationErrors.has(validationError),
    );

    if (isBlockingValidationError) {
      return { isBlockingValidationError: true };
    }
    return null;
  };
}
function readyForUploadValidator(): (
  control: AbstractControl,
) => ValidationErrors | null {
  return (control) => {
    const { value: isReadyForUpload } =
      control as typeof ManualUploadStepperComponent.prototype.stepperFormGroup.controls.readyForUpload;
    if (!isReadyForUpload) return { isReadyForUpload: false };

    return null;
  };
}

const MANUAL_UPLOAD_FILE_VERSION = { manualupload: 'v0.1' } as const;
