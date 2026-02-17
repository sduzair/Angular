import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import * as ChangeLog from '../../change-logging/change-log';
import { finalize, map, Observable, of } from 'rxjs';
import {
  EditFormComponent,
  EditFormEditType,
  EditFormType,
  EditType,
  InvalidFormOptionsErrorKeys,
  InvalidFormOptionsErrors,
  RecursiveOmit,
  StrTxnEditForm,
  TypedForm,
} from './edit-form.component';
import {
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  AsyncValidatorFn,
  AbstractControl,
  ValidationErrors,
  isFormGroup,
  ValidatorFn,
} from '@angular/forms';
import { StrTransactionWithChangeLogs } from '../../aml/case-record.store';
import {
  WithETag,
  StartingAction,
  ConductorNpdData,
  CompletingAction,
  AccountHolder,
  SourceOfFunds,
  Conductor,
  OnBehalfOf,
  InvolvedIn,
  Beneficiary,
  StrTransaction,
} from '../reporting-ui-table/reporting-ui-table.component';
import { FormOptions, FormOptionsService } from './form-options.service';
import { SET_AS_EMPTY } from './mark-as-cleared.directive';
import { isValid } from 'date-fns';
import { setError } from '../../form-helpers';
import {
  hasMissingAccountInfo,
  hasMissingConductorInfo,
  hasMissingCheque,
  hasPersonName,
  hasEntityName,
  hasInvalidFiu,
  hasMissingBasicInfo,
  hasMissingBeneficiary,
} from './common-validation';
import { TransactionDateDirective } from './transaction-date.directive';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class EditableFormComponent {
  private formOptionsService = inject(FormOptionsService);
  protected editForm: EditFormType | null = null;
  readonly editType = input.required<EditFormEditType>();
  protected readonly editType$ = toObservable(this.editType);

  createEditForm({
    txn,
    options,
  }: {
    txn?:
      | WithETag<StrTransactionWithChangeLogs>
      | StrTransactionWithChangeLogs
      | null;
    options: { editType: EditType; disabled?: boolean };
  }) {
    const { editType, disabled = false } = options;
    const createEmptyArrays = editType === 'BULK_SAVE';

    const editForm = new FormGroup(
      {
        id: new FormControl({
          value: txn?.id ?? '',
          disabled,
        }),
        eTag: new FormControl<number>({
          value: txn?.changeLogs.at(-1)?.eTag ?? 0,
          disabled,
        }),
        wasTxnAttempted: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'wasTxnAttempted',
            txn?.wasTxnAttempted,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        wasTxnAttemptedReason: new FormControl(
          { value: txn?.wasTxnAttemptedReason ?? SET_AS_EMPTY, disabled },
          [dependentPropValidator('wasTxnAttempted')],
        ),
        dateOfTxn: new FormControl(
          { value: txn?.dateOfTxn ?? SET_AS_EMPTY, disabled },
          [Validators.required, dateValidator()],
        ),
        timeOfTxn: new FormControl(
          { value: txn?.timeOfTxn ?? SET_AS_EMPTY, disabled },
          Validators.required,
        ),
        hasPostingDate: new FormControl({
          value: ChangeLog.getToggleInitVal(
            'hasPostingDate',
            txn?.hasPostingDate,
            editType === 'BULK_SAVE',
          ),
          disabled,
        }),
        dateOfPosting: new FormControl(
          { value: txn?.dateOfPosting ?? SET_AS_EMPTY, disabled },
          [dateValidator(), dependentPropValidator('hasPostingDate')],
        ),
        timeOfPosting: new FormControl(
          { value: txn?.timeOfPosting ?? SET_AS_EMPTY, disabled },
          [dependentPropValidator('hasPostingDate')],
        ),
        methodOfTxn: new FormControl(
          { value: txn?.methodOfTxn ?? SET_AS_EMPTY, disabled },
          [Validators.required],
          this.methodOfTxnValidator(),
        ),
        methodOfTxnOther: new FormControl(
          { value: txn?.methodOfTxnOther ?? SET_AS_EMPTY, disabled },
          [dependentPropValidator('methodOfTxn')],
        ),
        reportingEntityTxnRefNo: new FormControl({
          value: txn?.reportingEntityTxnRefNo!,
          disabled,
        }),
        purposeOfTxn: new FormControl({
          value: txn?.purposeOfTxn ?? SET_AS_EMPTY,
          disabled,
        }),
        reportingEntityLocationNo: new FormControl(
          { value: txn?.reportingEntityLocationNo ?? SET_AS_EMPTY, disabled },
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(5),
          ],
        ),
        startingActions: new FormArray(
          txn?.startingActions?.map((action) =>
            this.createStartingActionGroup({
              action,
              options: { editType, disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createStartingActionGroup({
                    options: { editType, disabled },
                  }),
                ]
              : []),
        ),
        completingActions: new FormArray(
          txn?.completingActions?.map((action) =>
            this.createCompletingActionGroup({
              action,
              options: { editType, disabled },
            }),
          ) ||
            (createEmptyArrays
              ? [
                  this.createCompletingActionGroup({
                    options: { editType, disabled },
                  }),
                ]
              : []),
        ),
        highlightColor: new FormControl(txn?.highlightColor ?? ''),
        _hiddenUpdatedBy: new FormControl(
          txn?.changeLogs.at(-1)?.updatedBy ?? '',
        ),
        _hiddenUpdatedAt: new FormControl(
          txn?.changeLogs.at(-1)?.updatedAt ?? '',
        ),
      },
      {
        validators: [basicInfoValidator(), beneficiaryValidator()],
        updateOn: 'change',
      },
    ) satisfies FormGroup<TypedForm<WithETag<StrTxnEditForm>>>;

    return editForm;
  }

  // --------------------------
  // Form Group Creation Methods
  // --------------------------
  createStartingActionGroup({
    action,
    options,
  }: {
    action?: StartingAction;
    options: { editType: EditType; disabled: boolean };
  }) {
    const { editType, disabled } = options;
    const createEmptyArrays = editType === 'BULK_SAVE';

    const sAction = action;
    if (sAction?.accountHolders)
      sAction.hasAccountHolders = sAction.accountHolders.length > 0;

    const saGroup = new FormGroup({
      _id: new FormControl({
        value: action?._id ?? getFormGroupId(),
        // enabled to allow nth starting action bulk edit
        disabled: false,
      }),
      directionOfSA: new FormControl(
        {
          value: action?.directionOfSA ?? SET_AS_EMPTY,
          disabled,
        },
        [Validators.required],
        this.directionOfSAValidator(),
      ),
      typeOfFunds: new FormControl(
        {
          value: action?.typeOfFunds ?? SET_AS_EMPTY,
          disabled,
        },
        [Validators.required, chequeValidator()],
        this.typeOfFundsValidator(),
      ),
      typeOfFundsOther: new FormControl(
        { value: action?.typeOfFundsOther ?? SET_AS_EMPTY, disabled },
        [dependentPropValidator('typeOfFunds')],
      ),
      amount: new FormControl(
        { value: action?.amount ?? null, disabled },
        Validators.required,
      ),
      currency: new FormControl(
        { value: action?.currency ?? SET_AS_EMPTY, disabled },
        [],
        this.amountCurrencyValidator(),
      ),
      fiuNo: new FormControl(
        { value: action?.fiuNo ?? SET_AS_EMPTY, disabled },
        [accountInfoValidator(), fiuValidator()],
      ),
      branch: new FormControl(
        { value: action?.branch ?? SET_AS_EMPTY, disabled },
        [Validators.minLength(5), Validators.maxLength(5)],
      ),
      account: new FormControl({
        value: action?.account ?? SET_AS_EMPTY,
        disabled,
      }),
      accountType: new FormControl(
        {
          value: action?.accountType ?? SET_AS_EMPTY,
          disabled,
        },
        [],
        this.accountTypeValidator(),
      ),
      accountTypeOther: new FormControl(
        { value: action?.accountTypeOther ?? SET_AS_EMPTY, disabled },
        [dependentPropValidator('accountType')],
      ),
      accountOpen: new FormControl({
        value: action?.accountOpen ?? SET_AS_EMPTY,
        disabled,
      }),
      accountClose: new FormControl(
        {
          value: action?.accountClose ?? SET_AS_EMPTY,
          disabled,
        },
        [accountCloseDateValidator()],
      ),
      accountStatus: new FormControl(
        {
          value: action?.accountStatus ?? SET_AS_EMPTY,
          disabled,
        },
        [],
        [this.accountStatusValidator()],
      ),
      howFundsObtained: new FormControl({
        value: action?.howFundsObtained ?? SET_AS_EMPTY,
        disabled,
      }),
      accountCurrency: new FormControl(
        {
          value: action?.accountCurrency ?? SET_AS_EMPTY,
          disabled,
        },
        [],
        this.accountCurrencyValidator(),
      ),
      hasAccountHolders: new FormControl({
        value: ChangeLog.getToggleInitVal(
          'hasAccountHolders',
          action?.hasAccountHolders,
          editType === 'BULK_SAVE',
        ),
        disabled,
      }),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup({
            holder,
            options: { disabled },
          }),
        ) ||
          (createEmptyArrays
            ? [
                this.createAccountHolderGroup({
                  options: { disabled },
                }),
              ]
            : []),
      ),
      wasSofInfoObtained: new FormControl({
        value: ChangeLog.getToggleInitVal(
          'wasSofInfoObtained',
          action?.wasSofInfoObtained,
          editType === 'BULK_SAVE',
        ),
        disabled,
      }),
      sourceOfFunds: new FormArray(
        action?.sourceOfFunds?.map((source) =>
          this.createSourceOfFundsGroup({
            source,
            options: { disabled },
          }),
        ) ||
          (createEmptyArrays
            ? [
                this.createSourceOfFundsGroup({
                  options: { disabled },
                }),
              ]
            : []),
      ),
      wasCondInfoObtained: new FormControl(
        {
          value: ChangeLog.getToggleInitVal(
            'wasCondInfoObtained',
            action?.wasCondInfoObtained,
            editType === 'BULK_SAVE',
          ),
          disabled,
        },
        [conductorValidator()],
      ),
      conductors: new FormArray(
        action?.conductors?.map((conductor) =>
          this.createConductorGroup({
            conductor,
            options: { editType, disabled },
          }),
        ) ||
          (createEmptyArrays
            ? [
                this.createConductorGroup({
                  options: { editType, disabled },
                }),
              ]
            : []),
      ),
    }) satisfies FormGroup<
      TypedForm<RecursiveOmit<StartingAction, keyof ConductorNpdData>>
    >;

    if (disabled) {
      saGroup.controls.accountHolders.disable();
      saGroup.controls.sourceOfFunds.disable();
      saGroup.controls.conductors.disable();
    }

    return saGroup;
  }

  createCompletingActionGroup({
    action,
    options,
  }: {
    action?: CompletingAction;
    options: { editType: EditType; disabled: boolean };
  }) {
    const { editType, disabled } = options;
    const createEmptyArrays = editType === 'BULK_SAVE';

    const cAction = action;
    if (cAction?.accountHolders)
      cAction.hasAccountHolders = cAction.accountHolders.length > 0;

    const caGroup = new FormGroup({
      _id: new FormControl({
        value: action?._id ?? getFormGroupId(),
        // enabled to allow nth starting action bulk edit
        disabled: false,
      }),
      detailsOfDispo: new FormControl(
        {
          value: action?.detailsOfDispo ?? SET_AS_EMPTY,
          disabled,
        },
        [Validators.required],
        this.detailsOfDispositionValidator(),
      ),
      detailsOfDispoOther: new FormControl(
        { value: action?.detailsOfDispoOther ?? SET_AS_EMPTY, disabled },
        [dependentPropValidator('detailsOfDispo')],
      ),
      amount: new FormControl(
        { value: action?.amount ?? null, disabled },
        Validators.required,
      ),
      currency: new FormControl(
        { value: action?.currency ?? SET_AS_EMPTY, disabled },
        [],
        this.amountCurrencyValidator(),
      ),
      exchangeRate: new FormControl({
        value: action?.exchangeRate ?? null,
        disabled,
      }),
      valueInCad: new FormControl({
        value: action?.valueInCad ?? null,
        disabled,
      }),
      fiuNo: new FormControl(
        { value: action?.fiuNo ?? SET_AS_EMPTY, disabled },
        [accountInfoValidator(), fiuValidator()],
      ),
      branch: new FormControl(
        { value: action?.branch ?? SET_AS_EMPTY, disabled },
        [Validators.minLength(5), Validators.maxLength(5)],
      ),
      account: new FormControl({
        value: action?.account ?? SET_AS_EMPTY,
        disabled,
      }),
      accountType: new FormControl(
        {
          value: action?.accountType ?? SET_AS_EMPTY,
          disabled,
        },
        [],
        this.accountTypeValidator(),
      ),
      accountTypeOther: new FormControl(
        { value: action?.accountTypeOther ?? SET_AS_EMPTY, disabled },
        [dependentPropValidator('accountType')],
      ),
      accountCurrency: new FormControl(
        {
          value: action?.accountCurrency ?? SET_AS_EMPTY,
          disabled,
        },
        [],
        this.accountCurrencyValidator(),
      ),
      accountOpen: new FormControl({
        value: action?.accountOpen ?? SET_AS_EMPTY,
        disabled,
      }),
      accountClose: new FormControl(
        {
          value: action?.accountClose ?? SET_AS_EMPTY,
          disabled,
        },
        [accountCloseDateValidator()],
      ),
      accountStatus: new FormControl(
        {
          value: action?.accountStatus ?? SET_AS_EMPTY,
          disabled,
        },
        [],
        this.accountStatusValidator(),
      ),
      hasAccountHolders: new FormControl({
        value: action?.hasAccountHolders ?? null,
        disabled,
      }),
      accountHolders: new FormArray(
        action?.accountHolders?.map((holder) =>
          this.createAccountHolderGroup({
            holder,
            options: { disabled },
          }),
        ) ||
          (createEmptyArrays
            ? [
                this.createAccountHolderGroup({
                  options: { disabled },
                }),
              ]
            : []),
      ),
      wasAnyOtherSubInvolved: new FormControl({
        value: ChangeLog.getToggleInitVal(
          'wasAnyOtherSubInvolved',
          action?.wasAnyOtherSubInvolved,
          editType === 'BULK_SAVE',
        ),
        disabled,
      }),
      involvedIn: new FormArray(
        action?.involvedIn?.map((involved) =>
          this.createInvolvedInGroup({
            involved,
            options: { disabled },
          }),
        ) ||
          (createEmptyArrays
            ? [
                this.createInvolvedInGroup({
                  options: { disabled },
                }),
              ]
            : []),
      ),
      wasBenInfoObtained: new FormControl({
        value: ChangeLog.getToggleInitVal(
          'wasBenInfoObtained',
          action?.wasBenInfoObtained,
          editType === 'BULK_SAVE',
        ),
        disabled,
      }),
      beneficiaries: new FormArray(
        action?.beneficiaries?.map((beneficiary) =>
          this.createBeneficiaryGroup({
            beneficiary,
            options: { disabled },
          }),
        ) ||
          (createEmptyArrays
            ? [
                this.createBeneficiaryGroup({
                  options: { disabled },
                }),
              ]
            : []),
      ),
    }) satisfies FormGroup<TypedForm<CompletingAction>>;

    if (disabled) {
      caGroup.controls.accountHolders.disable();
      caGroup.controls.involvedIn.disable();
      caGroup.controls.beneficiaries.disable();
    }

    return caGroup;
  }

  private createAccountHolderGroup({
    holder,
    options,
  }: {
    holder?: AccountHolder;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({
        value: holder?._id ?? getFormGroupId(),
        disabled: false,
      }),
      linkToSub: new FormControl({
        value: holder?.linkToSub ?? null,
        disabled,
      }),
      _hiddenPartyKey: new FormControl({
        value: holder?._hiddenPartyKey ?? null,
        disabled,
      }),
      _hiddenGivenName: new FormControl(
        { value: holder?._hiddenGivenName ?? null, disabled },
        [personOrEntityValidator()],
      ),
      _hiddenOtherOrInitial: new FormControl(
        {
          value: holder?._hiddenOtherOrInitial ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenSurname: new FormControl(
        { value: holder?._hiddenSurname ?? null, disabled },

        [personOrEntityValidator()],
      ),
      _hiddenNameOfEntity: new FormControl(
        {
          value: holder?._hiddenNameOfEntity ?? null,
          disabled,
        },

        [personOrEntityValidator()],
      ),
    }) satisfies FormGroup<TypedForm<AccountHolder>>;
  }

  private createSourceOfFundsGroup({
    source,
    options,
  }: {
    source?: SourceOfFunds;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({
        value: source?._id ?? getFormGroupId(),
        disabled: false,
      }),
      linkToSub: new FormControl({
        value: source?.linkToSub ?? null,
        disabled,
      }),
      _hiddenPartyKey: new FormControl({
        value: source?._hiddenPartyKey ?? null,
        disabled,
      }),
      _hiddenGivenName: new FormControl(
        {
          value: source?._hiddenGivenName ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenOtherOrInitial: new FormControl(
        {
          value: source?._hiddenOtherOrInitial ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenSurname: new FormControl(
        {
          value: source?._hiddenSurname ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenNameOfEntity: new FormControl(
        {
          value: source?._hiddenNameOfEntity ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      accountNumber: new FormControl({
        value: source?.accountNumber ?? null,
        disabled,
      }),
      identifyingNumber: new FormControl({
        value: source?.identifyingNumber ?? null,
        disabled,
      }),
    }) satisfies FormGroup<TypedForm<SourceOfFunds>>;
  }

  private createConductorGroup({
    conductor,
    options,
  }: {
    conductor?: Conductor;
    options: { editType: EditType; disabled: boolean };
  }) {
    const { editType, disabled } = options;

    const condGroup = new FormGroup({
      _id: new FormControl({
        value: conductor?._id ?? getFormGroupId(),
        disabled: false,
      }),
      linkToSub: new FormControl({
        value: conductor?.linkToSub ?? null,
        disabled,
      }),
      _hiddenPartyKey: new FormControl({
        value: conductor?._hiddenPartyKey ?? null,
        disabled,
      }),
      _hiddenGivenName: new FormControl(
        {
          value: conductor?._hiddenGivenName ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenOtherOrInitial: new FormControl(
        {
          value: conductor?._hiddenOtherOrInitial ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenSurname: new FormControl(
        {
          value: conductor?._hiddenSurname ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenNameOfEntity: new FormControl(
        {
          value: conductor?._hiddenNameOfEntity ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      wasConductedOnBehalf: new FormControl({
        value: conductor?.wasConductedOnBehalf ?? false,
        disabled,
      }),
      // note do not create empty arrays as this toggle is not tied to a appToggleEditField (bulk edit)
      onBehalfOf: new FormArray(
        conductor?.onBehalfOf?.map((behalf) =>
          this.createOnBehalfOfGroup({
            behalf,
            options: { disabled },
          }),
        ) || [],
      ),
    }) satisfies FormGroup<
      TypedForm<RecursiveOmit<Conductor, keyof ConductorNpdData>>
    >;

    if (disabled) {
      condGroup.controls.onBehalfOf.disable();
    }

    return condGroup;
  }

  private createOnBehalfOfGroup({
    behalf,
    options,
  }: {
    behalf?: OnBehalfOf;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl({
        value: behalf?._id ?? getFormGroupId(),
        disabled: false,
      }),
      linkToSub: new FormControl({
        value: behalf?.linkToSub ?? null,
        disabled,
      }),
      _hiddenPartyKey: new FormControl({
        value: behalf?._hiddenPartyKey ?? null,
        disabled,
      }),
      _hiddenGivenName: new FormControl(
        {
          value: behalf?._hiddenGivenName ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenOtherOrInitial: new FormControl(
        {
          value: behalf?._hiddenOtherOrInitial ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenSurname: new FormControl(
        {
          value: behalf?._hiddenSurname ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenNameOfEntity: new FormControl(
        {
          value: behalf?._hiddenNameOfEntity ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
    }) satisfies FormGroup<TypedForm<OnBehalfOf>>;
  }

  private createInvolvedInGroup({
    involved,
    options,
  }: {
    involved?: InvolvedIn;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;
    return new FormGroup({
      _id: new FormControl({
        value: involved?._id ?? getFormGroupId(),
        disabled: false,
      }),
      linkToSub: new FormControl({
        value: involved?.linkToSub ?? null,
        disabled,
      }),
      _hiddenPartyKey: new FormControl({
        value: involved?._hiddenPartyKey ?? null,
        disabled,
      }),
      _hiddenGivenName: new FormControl(
        {
          value: involved?._hiddenGivenName ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenOtherOrInitial: new FormControl(
        {
          value: involved?._hiddenOtherOrInitial ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenSurname: new FormControl(
        {
          value: involved?._hiddenSurname ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenNameOfEntity: new FormControl(
        {
          value: involved?._hiddenNameOfEntity ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      accountNumber: new FormControl({
        value: involved?.accountNumber ?? null,
        disabled,
      }),
      identifyingNumber: new FormControl({
        value: involved?.identifyingNumber ?? null,
        disabled,
      }),
    }) satisfies FormGroup<TypedForm<InvolvedIn>>;
  }

  private createBeneficiaryGroup({
    beneficiary,
    options,
  }: {
    beneficiary?: Beneficiary;
    options: { disabled: boolean };
  }) {
    const { disabled } = options;

    return new FormGroup({
      _id: new FormControl({
        value: beneficiary?._id ?? getFormGroupId(),
        disabled: false,
      }),
      linkToSub: new FormControl({
        value: beneficiary?.linkToSub ?? null,
        disabled,
      }),
      _hiddenPartyKey: new FormControl({
        value: beneficiary?._hiddenPartyKey ?? null,
        disabled,
      }),
      _hiddenGivenName: new FormControl(
        {
          value: beneficiary?._hiddenGivenName ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenOtherOrInitial: new FormControl(
        {
          value: beneficiary?._hiddenOtherOrInitial ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenSurname: new FormControl(
        {
          value: beneficiary?._hiddenSurname ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
      _hiddenNameOfEntity: new FormControl(
        {
          value: beneficiary?._hiddenNameOfEntity ?? null,
          disabled,
        },
        [personOrEntityValidator()],
      ),
    }) satisfies FormGroup<TypedForm<Beneficiary>>;
  }

  // ----------------------
  // Array Management
  // ----------------------
  // Starting Actions
  protected addStartingAction(): void {
    if (this.editForm!.controls.startingActions.disabled) return;
    if (this.isAudit) return;

    const newSaGroup = this.createStartingActionGroup({
      options: { editType: this.editType().type, disabled: this.isBulkEdit },
    });

    this.editForm!.controls.startingActions.push(newSaGroup);
  }

  protected removeStartingAction(index: number): void {
    const hasMoreThanOneSA =
      this.editForm!.controls.startingActions.controls.length > 1;

    if (this.editForm!.controls.startingActions.disabled) return;
    if (!hasMoreThanOneSA) return;
    if (this.isAudit) return;

    this.editForm!.controls.startingActions.removeAt(index);
  }

  // Completing Actions
  protected addCompletingAction(): void {
    if (this.editForm!.controls.completingActions.disabled) return;

    if (this.isAudit) return;

    if (this.editForm!.controls.completingActions.value.length === 1) return;

    const newCaGroup = this.createCompletingActionGroup({
      options: { editType: this.editType().type, disabled: this.isBulkEdit },
    });
    this.editForm!.controls.completingActions.push(newCaGroup);
  }

  protected removeCompletingAction(index: number): void {
    const hasMoreThanOneCA =
      this.editForm!.controls.completingActions.controls.length > 1;

    if (this.editForm!.controls.completingActions.disabled) return;
    if (!hasMoreThanOneCA) return;
    if (this.isAudit) return;

    this.editForm!.controls.completingActions.removeAt(index);
  }

  // Account Hodlers SA/CA
  protected addAccountHolder(
    actionControlName: keyof StrTransaction,
    actionIndex: number,
  ): void {
    const action = (
      this.editForm!.get(actionControlName) as unknown as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders!.disabled) return;
    if (!action.controls.hasAccountHolders.value) return;
    if (this.isAudit) return;

    const newAccountHolderGroup = this.createAccountHolderGroup({
      options: { disabled: false },
    });
    action.controls.accountHolders!.push(newAccountHolderGroup);
  }

  protected removeAccountHolder(
    actionControlName: keyof StrTransaction,
    actionIndex: number,
    index: number,
  ): void {
    const action = (
      this.editForm!.get(actionControlName) as unknown as
        | FormArray<FormGroup<TypedForm<StartingAction>>>
        | FormArray<FormGroup<TypedForm<CompletingAction>>>
    ).at(actionIndex);

    if (action.controls.accountHolders.value.length === 1) return;
    if (action.controls.accountHolders!.disabled) return;
    if (this.isAudit) return;

    action.controls.accountHolders!.removeAt(index);
  }

  // Source of Funds
  protected addSourceOfFunds(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.disabled) return;
    if (!startingAction.controls.wasSofInfoObtained.value) return;
    if (this.isAudit) return;

    const newSourceOfFundsGroup = this.createSourceOfFundsGroup({
      options: { disabled: false },
    });
    startingAction.controls.sourceOfFunds.push(newSourceOfFundsGroup);
  }

  protected removeSourceOfFunds(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.sourceOfFunds.value.length === 1) return;
    if (startingAction.controls.sourceOfFunds.disabled) return;
    if (this.isAudit) return;

    startingAction.controls.sourceOfFunds.removeAt(index);
  }

  // Conductors
  protected addConductor(saIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.conductors.disabled) return;
    if (!startingAction.controls.wasCondInfoObtained.value) return;
    if (this.isAudit) return;

    const newSAConductorGroup = this.createConductorGroup({
      options: { editType: this.editType().type, disabled: false },
    });
    startingAction.controls.conductors.push(newSAConductorGroup);
  }

  protected removeConductor(saIndex: number, index: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (startingAction.controls.conductors.value.length === 1) return;
    if (startingAction.controls.conductors.disabled) return;
    if (this.isAudit) return;

    startingAction.controls.conductors.removeAt(index);
  }

  // On Behalf Of
  protected addOnBehalfOf(saIndex: number, conductorIndex: number): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (
      startingAction.controls.conductors.at(conductorIndex).controls.onBehalfOf
        .disabled
    )
      return;
    if (
      !startingAction.controls.conductors.at(conductorIndex).controls
        .wasConductedOnBehalf.value
    )
      return;
    if (this.isAudit) return;

    const newBehalfOfGroup = this.createOnBehalfOfGroup({
      options: { disabled: false },
    });
    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.push(newBehalfOfGroup);
  }

  protected removeOnBehalfOf(
    saIndex: number,
    conductorIndex: number,
    index: number,
  ): void {
    const startingAction = this.editForm!.controls.startingActions.at(saIndex);

    if (
      startingAction.controls.conductors.at(conductorIndex).controls.onBehalfOf
        .value.length === 1
    )
      return;
    if (
      startingAction.controls.conductors.at(conductorIndex).controls.onBehalfOf
        .disabled
    )
      return;
    if (this.isAudit) return;

    startingAction.controls.conductors
      .at(conductorIndex)
      .controls.onBehalfOf.removeAt(index);
  }

  // Involved In (Completing Action)
  protected addInvolvedIn(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn!.disabled) return;
    if (!completingAction.controls.wasAnyOtherSubInvolved.value) return;
    if (this.isAudit) return;

    const newInvolvedInGroup = this.createInvolvedInGroup({
      options: { disabled: false },
    });
    completingAction.controls.involvedIn!.push(newInvolvedInGroup);
  }

  protected removeInvolvedIn(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.involvedIn.value.length === 1) return;
    if (completingAction.controls.involvedIn!.disabled) return;
    if (this.isAudit) return;

    completingAction.controls.involvedIn!.removeAt(index);
  }

  // Beneficiaries
  protected addBeneficiary(caIndex: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries!.disabled) return;
    if (!completingAction.controls.wasBenInfoObtained.value) return;
    if (this.isAudit) return;

    const newBeneficiaryGroup = this.createBeneficiaryGroup({
      options: { disabled: false },
    });
    completingAction.controls.beneficiaries!.push(newBeneficiaryGroup);
  }

  protected removeBeneficiary(caIndex: number, index: number): void {
    const completingAction =
      this.editForm!.controls.completingActions.at(caIndex);

    if (completingAction.controls.beneficiaries.value.length === 1) return;
    if (completingAction.controls.beneficiaries!.disabled) return;
    if (this.isAudit) return;

    completingAction.controls.beneficiaries!.removeAt(index);
  }

  isFormOptionsLoading = true;
  formOptions$ = this.formOptionsService.formOptions$.pipe(
    finalize(() => {
      this.isFormOptionsLoading = false;
    }),
  );

  /**
   * Async validator for methodOfTxn field
   */
  methodOfTxnValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'methodOfTxn',
          );
        }),
      );
    };
  }

  /**
   * Async validator for typeOfFunds field
   */
  typeOfFundsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'typeOfFunds',
          );
        }),
      );
    };
  }

  /**
   * Async validator for amountCurrency field
   */
  amountCurrencyValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'amountCurrency',
          );
        }),
      );
    };
  }

  /**
   * Async validator for accountType field
   */
  accountTypeValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'accountType',
          );
        }),
      );
    };
  }

  /**
   * Async validator for accountCurrency field
   */
  accountCurrencyValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'accountCurrency',
          );
        }),
      );
    };
  }

  /**
   * Async validator for accountStatus field
   */
  accountStatusValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'accountStatus',
          );
        }),
      );
    };
  }

  /**
   * Async validator for directionOfSA field
   */
  directionOfSAValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'directionOfSA',
          );
        }),
      );
    };
  }

  /**
   * Async validator for detailsOfDisposition field
   */
  detailsOfDispositionValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      return this.formOptionsService.formOptions$.pipe(
        map((formOptions) => {
          return EditFormComponent.validateFormOptions(
            control.value,
            formOptions,
            'detailsOfDisposition',
          );
        }),
      );
    };
  }

  /**
   * Generic validation method for form options fields
   */
  static validateFormOptions(
    value: string,
    formOptions: FormOptions,
    optionsKey: keyof FormOptions,
  ): InvalidFormOptionsErrors | null {
    const validValues = Object.keys(formOptions[optionsKey]);

    if (!validValues.includes(value)) {
      return {
        [`invalid${optionsKey.charAt(0).toUpperCase()}${optionsKey.slice(1)}` as InvalidFormOptionsErrorKeys]:
          {
            value: value,
            validValues,
          },
      } as InvalidFormOptionsErrors;
    }

    return null;
  }

  // template helpers
  protected get isSingleEdit() {
    return this.editType().type === 'SINGLE_SAVE';
  }
  protected get isBulkEdit() {
    return this.editType().type === 'BULK_SAVE';
  }
  protected get isAudit() {
    return this.editType().type === 'AUDIT_REQUEST';
  }
  protected get showTransactionDetailsErrorIcon() {
    if (this.isBulkEdit) return !this.editForm!.valid && this.editForm!.dirty;
    return !this.editForm!.disabled && !this.editForm!.valid;
  }
  protected get showStartingActionsErrorIcon() {
    if (this.isBulkEdit)
      return (
        !this.editForm!.controls.startingActions.valid &&
        this.editForm!.controls.startingActions.dirty
      );
    return (
      !this.editForm!.controls.startingActions.disabled &&
      !this.editForm!.controls.startingActions.valid
    );
  }
  protected get showCompletingActionsErrorIcon() {
    if (this.isBulkEdit)
      return (
        !this.editForm!.controls.completingActions.valid &&
        this.editForm!.controls.completingActions.dirty
      );
    return (
      !this.editForm!.controls.completingActions.disabled &&
      !this.editForm!.controls.completingActions.valid
    );
  }

  protected get selectedTransactionsForBulkEditLength() {
    const editType = this.editType();
    if (editType.type !== 'BULK_SAVE') {
      return -1;
    }
    return editType.payload.length;
  }
  protected get selectedTransactionsForBulkEditDisplayText() {
    return `${this.selectedTransactionsForBulkEditLength} transaction${
      this.selectedTransactionsForBulkEditLength !== 1 ? 's' : ''
    } selected`;
  }
  readonly maxDate = new Date();
}

function dateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const { value } = control;

    if (!control.value) return null;

    if (!isValidDate(value)) return { invalidDate: true };

    return null;
  };
}

export function isValidDate(value: string) {
  const parsedDate = TransactionDateDirective.parse(value);
  if (!isValid(parsedDate)) {
    return false;
  }
  return true;
}

function accountInfoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actionControl = control.parent as FormGroup<
      TypedForm<
        RecursiveOmit<StartingAction, keyof ConductorNpdData> | CompletingAction
      >
    > | null;

    if (!actionControl) return null;

    console.assert(
      isFormGroup(actionControl),
      'Assert parent control is group control',
    );

    if (hasMissingAccountInfo(actionControl.getRawValue())) {
      return { missingAccountInfo: 'Missing account info' };
    }
    return null;
  };
}

function conductorValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const saControl = control.parent as FormGroup<
      TypedForm<RecursiveOmit<StartingAction, keyof ConductorNpdData>>
    >;

    if (!saControl) return null;

    console.assert(isFormGroup(saControl));

    const value = saControl.value as RecursiveOmit<
      StartingAction,
      keyof ConductorNpdData
    >;

    setError(
      saControl.controls.wasCondInfoObtained,
      {
        missingConductorInfo: true,
      },
      () => hasMissingConductorInfo(value),
    );

    return null;
  };
}

function chequeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const saControl = control.parent as FormGroup<
      TypedForm<RecursiveOmit<StartingAction, keyof ConductorNpdData>>
    > | null;

    if (!saControl?.value) return null;

    console.assert(
      isFormGroup(saControl),
      'Assert parent control is group control',
    );

    if (hasMissingCheque(saControl.value as StartingAction))
      return {
        missingCheque: 'Missing cheque info',
      };

    return null;
  };
}

function accountCloseDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actionControl = control.parent as FormGroup<
      TypedForm<
        RecursiveOmit<StartingAction, keyof ConductorNpdData> & CompletingAction
      >
    > | null;

    if (!actionControl) return null;

    console.assert(
      isFormGroup(actionControl),
      'Assert parent control is group control',
    );

    const value = actionControl.value as RecursiveOmit<
      StartingAction,
      keyof ConductorNpdData
    >;

    if (!value) return null;

    if (
      actionControl.controls.accountStatus.value === 'Closed' &&
      !actionControl.controls.accountClose.value
    ) {
      return { required: true };
    }

    return null;
  };
}

function personOrEntityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const subjectGroupCtrl = control.parent as FormGroup<
      TypedForm<AccountHolder>
    > | null;

    if (!subjectGroupCtrl) return null;

    console.assert(
      isFormGroup(subjectGroupCtrl),
      'Assert parent control is subject group',
    );

    if (!subjectGroupCtrl.value) return null;

    if (
      !hasPersonName(subjectGroupCtrl.value as AccountHolder) &&
      !hasEntityName(subjectGroupCtrl.value as AccountHolder)
    ) {
      return { required: true };
    }

    return null;
  };
}

function fiuValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actionCtrl = control.parent as FormGroup<
      TypedForm<
        RecursiveOmit<StartingAction, keyof ConductorNpdData> | CompletingAction
      >
    > | null;

    if (!actionCtrl) return null;

    const value = actionCtrl.value;

    if (hasInvalidFiu(value)) {
      return { invalidFiu: 'Invalid FIU' };
    }

    return null;
  };
}

function dependentPropValidator(
  toggleControlName: ChangeLog.ToggleType,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }

    const toggleControl = control.parent.get(toggleControlName);

    if (!toggleControl) {
      return null;
    }

    const toggleValue = toggleControl.value;
    let isRequired = false;

    // Determine if field is required based on toggle type
    if (ChangeLog.isBoolToggle(toggleControlName)) {
      isRequired = toggleValue === true;
    } else if (ChangeLog.isOtherToggle(toggleControlName)) {
      isRequired = toggleValue === 'Other';
    }

    if (!isRequired) {
      return null;
    }

    const value = control.value;
    const isEmpty =
      !value || (typeof value === 'string' && value.trim().length === 0);

    return isEmpty ? { required: true } : null;
  };
}

function basicInfoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    const value = control.getRawValue() as FormGroup<
      TypedForm<WithETag<StrTxnEditForm>>
    >['value'];

    if (hasMissingBasicInfo(value as StrTransactionWithChangeLogs))
      return { missingBasicInfo: true };

    return null;
  };
}

function beneficiaryValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    const value = control.getRawValue() as FormGroup<
      TypedForm<WithETag<StrTxnEditForm>>
    >['value'];

    if (hasMissingBeneficiary(value as StrTransactionWithChangeLogs))
      return { missingBeneficiary: true };

    return null;
  };
}

function getFormGroupId() {
  return crypto.randomUUID();
}
