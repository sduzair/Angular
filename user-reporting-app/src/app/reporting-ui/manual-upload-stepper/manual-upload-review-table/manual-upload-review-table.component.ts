import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TrackByFunction,
} from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { BaseTableComponent } from '../../../base-table/base-table.component';
import { CamelToTitlePipe } from '../../reporting-ui-table/camel-to-title.pipe';
import {
  ReportingUiTableComponent,
  StrTransaction,
  StrTransactionData,
  StrTransactionDataColumnKey,
  _hiddenValidationType,
} from '../../reporting-ui-table/reporting-ui-table.component';

@Component({
  selector: 'app-manual-upload-review-table',
  imports: [
    BaseTableComponent,
    MatTableModule,
    MatChipsModule,
    CamelToTitlePipe,
  ],
  template: `
    <app-base-table
      #baseTable
      [data]="manualStrTransactionData"
      [dataColumnsValues]="dataColumnsValues"
      [dataColumnsIgnoreValues]="dataColumnsIgnoreValues"
      [dataColumnsProjected]="dataColumnsProjected"
      [displayedColumns]="displayedColumns"
      [displayedColumnsColumnHeaderMap]="displayedColumnsColumnHeaderMap"
      [stickyColumns]="stickyColumns"
      [selectFiltersValues]="selectFiltersValues"
      [dateFiltersValues]="dateFiltersValues"
      [dateFiltersValuesIgnore]="dateFiltersValuesIgnore"
      [displayedColumnsTime]="displayedColumnsTime"
      [dataSourceTrackBy]="dataSourceTrackBy"
      [sortingAccessorDateTimeTuples]="sortingAccessorDateTimeTuples"
      [sortedBy]="'dateOfTxn'"
      [showToolbar]="false"
      class="manual-upload-review-table">
      <!-- Validation Info column -->
      <ng-container matColumnDef="_hiddenValidation">
        <th
          mat-header-cell
          *matHeaderCellDef
          mat-sort-header="_hiddenValidation"
          [class.sticky-cell]="baseTable.isStickyColumn('_hiddenValidation')">
          <div></div>
        </th>
        <td
          mat-cell
          *matCellDef="let row"
          [class.sticky-cell]="baseTable.isStickyColumn('_hiddenValidation')">
          <mat-chip-set>
            @for (ch of row._hiddenValidation; track ch) {
              <mat-chip
                [style.--mdc-chip-elevated-container-color]="
                  getColorForValidationChip(ch)
                "
                [style.--mdc-chip-label-text-color]="
                  getFontColorForValidationChip(ch)
                ">
                {{ ch | camelToTitle }}
              </mat-chip>
            }
          </mat-chip-set>
        </td>
      </ng-container>
    </app-base-table>
  `,
  styleUrl: './manual-upload-review-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualUploadReviewTableComponent {
  @Input({ required: true })
  manualStrTransactionData = [] as StrTransaction[];
  dataSourceTrackBy: TrackByFunction<StrTransactionData> = (_, txn) => {
    return txn.flowOfFundsAmlTransactionId;
  };
  dataColumnsValues: StrTransactionDataColumnKey[] = [
    'highlightColor',
    '_hiddenValidation',
    'dateOfTxn',
    'timeOfTxn',
    'dateOfPosting',
    'timeOfPosting',
    '_hiddenTxnType',
    'methodOfTxn',
    'methodOfTxnOther',

    'reportingEntityLocationNo',

    'startingActions.0.directionOfSA',
    'startingActions.0.typeOfFunds',
    'startingActions.0.typeOfFundsOther',
    'startingActions.0.amount',
    'startingActions.0.currency',

    'startingActions.0.fiuNo',
    'startingActions.0.branch',
    'startingActions.0.account',
    'startingActions.0.accountType',
    'startingActions.0.accountTypeOther',
    'startingActions.0.accountCurrency',
    'startingActions.0.accountStatus',
    'startingActions.0.accountOpen',
    'startingActions.0.accountClose',

    'startingActions.0.conductors.0.partyKey',
    'startingActions.0.conductors.0.givenName',
    'startingActions.0.conductors.0.surname',
    'startingActions.0.conductors.0.otherOrInitial',
    'startingActions.0.conductors.0.nameOfEntity',

    'completingActions.0.detailsOfDispo',
    'completingActions.0.detailsOfDispoOther',
    'completingActions.0.amount',
    'completingActions.0.currency',

    'completingActions.0.fiuNo',
    'completingActions.0.branch',
    'completingActions.0.account',
    'completingActions.0.accountType',
    'completingActions.0.accountTypeOther',
    'completingActions.0.accountCurrency',
    'completingActions.0.accountStatus',
    'completingActions.0.accountOpen',
    'completingActions.0.accountClose',

    'completingActions.0.beneficiaries.0.partyKey',
    'completingActions.0.beneficiaries.0.givenName',
    'completingActions.0.beneficiaries.0.surname',
    'completingActions.0.beneficiaries.0.otherOrInitial',
    'completingActions.0.beneficiaries.0.nameOfEntity',
    '_hiddenAmlId',
    'reportingEntityTxnRefNo',
  ];

  dataColumnsIgnoreValues = ['highlightColor'];
  dataColumnsProjected = ['_hiddenValidation'];

  displayedColumns: ('select' | 'actions' | StrTransactionDataColumnKey)[] = [];

  displayedColumnsColumnHeaderMap: Partial<
    Record<'fullTextFilterKey' | StrTransactionDataColumnKey, string>
  > = ReportingUiTableComponent.displayedColumnsColumnHeaderMap;

  stickyColumns: (StrTransactionDataColumnKey | 'actions' | 'select')[] = [
    // "actions",
    // "select",
    '_mongoid',
    '_hiddenValidation',
  ];

  selectFiltersValues: StrTransactionDataColumnKey[] = [];

  dateFiltersValues: StrTransactionDataColumnKey[] = [];

  dateFiltersValuesIgnore: StrTransactionDataColumnKey[] = [];

  displayedColumnsTime: StrTransactionDataColumnKey[] = [
    'timeOfTxn',
    'timeOfPosting',
  ];

  sortingAccessorDateTimeTuples: StrTransactionDataColumnKey[][] = [
    ['dateOfTxn', 'timeOfTxn'],
    ['dateOfPosting', 'timeOfPosting'],
  ];

  protected getColorForValidationChip(error: _hiddenValidationType): string {
    return ReportingUiTableComponent.getColorForValidationChip(error);
  }

  protected getFontColorForValidationChip(error: _hiddenValidationType) {
    return ReportingUiTableComponent.getFontColorForValidationChip(error);
  }
}

export const MANUAL_TRANSACTIONS_DEV_OR_TEST_ONLY_FIXTURE: StrTransaction[] = [
  {
    wasTxnAttempted: false,
    wasTxnAttemptedReason: null,
    dateOfTxn: '2024/09/25',
    timeOfTxn: '8:46:12',
    hasPostingDate: null,
    dateOfPosting: null,
    timeOfPosting: null,
    methodOfTxn: 'In-Person',
    methodOfTxnOther: null,
    reportingEntityTxnRefNo: 'MTXN-01K4WANX6DRN6KCN05PMG7WJHA',
    purposeOfTxn: null,
    reportingEntityLocationNo: '84255',
    _hiddenFullName: 'Suki Clampe',
    startingActions: [
      {
        _id: 'afe7448f-fd0d-4079-adb9-34eb5983479b',
        directionOfSA: 'In',
        typeOfFunds: 'Cash',
        typeOfFundsOther: null,
        amount: 7270,
        currency: 'CAD',
        fiuNo: null,
        branch: null,
        account: null,
        accountType: null,
        accountTypeOther: null,
        accountOpen: null,
        accountClose: null,
        accountStatus: null,
        accountCurrency: null,
        howFundsObtained: null,
        hasAccountHolders: false,
        accountHolders: [],
        wasSofInfoObtained: false,
        sourceOfFunds: [],
        wasCondInfoObtained: true,
        conductors: [
          {
            _id: '9855168e-8452-4338-b644-ca73a8b846d2',
            partyKey: '3415674561',
            surname: 'Carter',
            givenName: 'James',
            otherOrInitial: 'L',
            nameOfEntity: '',
            npdTypeOfDevice: null,
            npdTypeOfDeviceOther: null,
            npdDeviceIdNo: null,
            npdUsername: null,
            npdIp: null,
            npdDateTimeSession: null,
            npdTimeZone: null,
            wasConductedOnBehalf: false,
            onBehalfOf: null,
          },
        ],
      },
    ],
    _hiddenSaAmount: 7270,
    completingActions: [
      {
        _id: '182b9eba-a6ae-4c57-be24-4e14ef4488cb',
        detailsOfDispo: 'Deposit to account',
        detailsOfDispoOther: null,
        amount: 7270,
        currency: 'CAD',
        exchangeRate: null,
        valueInCad: null,
        fiuNo: '010',
        branch: '84255',
        account: '5582195',
        accountType: 'Personal',
        accountTypeOther: '',
        accountCurrency: 'CAD',
        accountOpen: '2003/08/24',
        accountClose: '',
        accountStatus: 'Active',
        hasAccountHolders: true,
        accountHolders: [
          {
            _id: '26fad9e3-7a4e-46e6-84d0-f75a2f76468c',
            partyKey: '3415674561',
            surname: 'Carter',
            givenName: 'James',
            otherOrInitial: 'L',
            nameOfEntity: '',
          },
          {
            _id: '67f65447-30ed-420d-870e-30c2567a51f8',
            partyKey: '1846597320',
            surname: 'Nguyen',
            givenName: 'Laura',
            otherOrInitial: 'M',
            nameOfEntity: '',
          },
        ],
        wasAnyOtherSubInvolved: false,
        involvedIn: [],
        wasBenInfoObtained: true,
        beneficiaries: [
          {
            _id: '84413b8a-31c8-4763-acd5-f9a8c3b3b02a',
            partyKey: '3415674561',
            surname: 'Carter',
            givenName: 'James',
            otherOrInitial: 'L',
            nameOfEntity: '',
          },
          {
            _id: '3e1463cb-687e-4846-89ba-5eff6d3639a2',
            partyKey: '1846597320',
            surname: 'Nguyen',
            givenName: 'Laura',
            otherOrInitial: 'M',
            nameOfEntity: '',
          },
        ],
      },
    ],
    flowOfFundsAccountCurrency: null,
    flowOfFundsAmlId: 99999999,
    flowOfFundsAmlTransactionId: 'MTXN-01K4WANX6DRN6KCN05PMG7WJHA',
    flowOfFundsCasePartyKey: null,
    flowOfFundsConductorPartyKey: null,
    flowOfFundsCreditAmount: null,
    flowOfFundsCreditedAccount: null,
    flowOfFundsCreditedTransit: null,
    flowOfFundsDebitAmount: null,
    flowOfFundsDebitedAccount: null,
    flowOfFundsDebitedTransit: null,
    flowOfFundsPostingDate: null,
    flowOfFundsSource: 'Manual',
    flowOfFundsSourceTransactionId: null,
    flowOfFundsTransactionCurrency: null,
    flowOfFundsTransactionCurrencyAmount: null,
    flowOfFundsTransactionDate: null,
    flowOfFundsTransactionDesc: 'Deposit @ 7 Old Gate Pass, Sagae, ON',
    flowOfFundsTransactionTime: null,
  },
  {
    wasTxnAttempted: false,
    wasTxnAttemptedReason: null,
    dateOfTxn: '2025/01/18',
    timeOfTxn: '17:37:22',
    hasPostingDate: null,
    dateOfPosting: null,
    timeOfPosting: null,
    methodOfTxn: 'In-Person',
    methodOfTxnOther: null,
    reportingEntityTxnRefNo: 'MTXN-01K4WAP108HW0N72FDZT40HYTN',
    purposeOfTxn: null,
    reportingEntityLocationNo: '84255',
    _hiddenFullName: 'Nolan Licciardo',
    startingActions: [
      {
        _id: 'eceac8c9-a4e2-4c0d-93de-92e746dc2a9b',
        directionOfSA: 'In',
        typeOfFunds: 'Cash',
        typeOfFundsOther: null,
        amount: 16920,
        currency: 'CAD',
        fiuNo: null,
        branch: null,
        account: null,
        accountType: null,
        accountTypeOther: null,
        accountOpen: null,
        accountClose: null,
        accountStatus: null,
        accountCurrency: null,
        howFundsObtained: 'Salary',
        hasAccountHolders: false,
        accountHolders: [],
        wasSofInfoObtained: false,
        sourceOfFunds: [],
        wasCondInfoObtained: true,
        conductors: [
          {
            _id: 'a6795d28-98d3-4856-841f-7a871a324aba',
            partyKey: '1846597320',
            surname: 'Nguyen',
            givenName: 'Laura',
            otherOrInitial: 'M',
            nameOfEntity: '',
            npdTypeOfDevice: null,
            npdTypeOfDeviceOther: null,
            npdDeviceIdNo: null,
            npdUsername: null,
            npdIp: null,
            npdDateTimeSession: null,
            npdTimeZone: null,
            wasConductedOnBehalf: false,
            onBehalfOf: null,
          },
        ],
      },
    ],
    _hiddenSaAmount: 16920,
    completingActions: [
      {
        _id: '51d40c6b-d938-4508-afec-85caaa96dc12',
        detailsOfDispo: 'Deposit to account',
        detailsOfDispoOther: null,
        amount: 16920,
        currency: 'CAD',
        exchangeRate: null,
        valueInCad: null,
        fiuNo: '010',
        branch: '84255',
        account: '5582195',
        accountType: 'Personal',
        accountTypeOther: '',
        accountCurrency: 'CAD',
        accountOpen: '2003/08/24',
        accountClose: '',
        accountStatus: 'Active',
        hasAccountHolders: true,
        accountHolders: [
          {
            _id: 'e5204394-88a5-416e-83a5-435aa47e3d9f',
            partyKey: '3415674561',
            surname: 'Carter',
            givenName: 'James',
            otherOrInitial: 'L',
            nameOfEntity: '',
          },
          {
            _id: '8a6bb847-b965-4fc2-92b7-99aaa83791e2',
            partyKey: '1846597320',
            surname: 'Nguyen',
            givenName: 'Laura',
            otherOrInitial: 'M',
            nameOfEntity: '',
          },
        ],
        wasAnyOtherSubInvolved: false,
        involvedIn: [],
        wasBenInfoObtained: true,
        beneficiaries: [
          {
            _id: 'ad2b242b-1615-4031-a48a-b180cfe12067',
            partyKey: '3415674561',
            surname: 'Carter',
            givenName: 'James',
            otherOrInitial: 'L',
            nameOfEntity: '',
          },
          {
            _id: 'e8395c76-16ea-47fa-990b-576c29d8daec',
            partyKey: '1846597320',
            surname: 'Nguyen',
            givenName: 'Laura',
            otherOrInitial: 'M',
            nameOfEntity: '',
          },
        ],
      },
    ],
    flowOfFundsAccountCurrency: null,
    flowOfFundsAmlId: 99999999,
    flowOfFundsAmlTransactionId: 'MTXN-01K4WAP108HW0N72FDZT40HYTN',
    flowOfFundsCasePartyKey: null,
    flowOfFundsConductorPartyKey: null,
    flowOfFundsCreditAmount: null,
    flowOfFundsCreditedAccount: null,
    flowOfFundsCreditedTransit: null,
    flowOfFundsDebitAmount: null,
    flowOfFundsDebitedAccount: null,
    flowOfFundsDebitedTransit: null,
    flowOfFundsPostingDate: null,
    flowOfFundsSource: 'Manual',
    flowOfFundsSourceTransactionId: null,
    flowOfFundsTransactionCurrency: null,
    flowOfFundsTransactionCurrencyAmount: null,
    flowOfFundsTransactionDate: null,
    flowOfFundsTransactionDesc: 'Deposit @ 5 Hazelcrest Alley, Dongling, ON',
    flowOfFundsTransactionTime: null,
  },
];

export const MANUAL_TRANSACTIONS_WITH_CHANGELOGS_DEV_OR_TEST_ONLY_FIXTURE =
  MANUAL_TRANSACTIONS_DEV_OR_TEST_ONLY_FIXTURE.map((txn) => ({
    ...txn,
    _hiddenTxnType: txn.flowOfFundsSource,
    _hiddenAmlId: '999999',
    _hiddenStrTxnId: txn.flowOfFundsAmlTransactionId,
    _version: 0,
    changeLogs: [],
  }));
