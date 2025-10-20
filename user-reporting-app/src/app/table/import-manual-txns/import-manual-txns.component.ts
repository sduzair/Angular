import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { v4 as uuidv4 } from "uuid";
import { EditFormTemplateComponent } from "../../edit-form/edit-form-template/edit-form-template.component";
import { StrTxnWithHiddenProps } from "../../reporting-ui/reporting-ui.component";

@Component({
  selector: "app-import-manual-txns",
  imports: [MatInputModule, MatIconModule, MatButtonModule],
  template: `
    <input
      #file
      type="file"
      accept=".xlsx, .csv"
      (change)="onFileImport($event)"
      hidden
    />
    <button
      mat-raised-button
      color="primary"
      (click)="file.click()"
      type="button"
    >
      <mat-icon>upload</mat-icon>
      Import
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportManualTxnsComponent {
  // data: StrTxn[] = [];
  headers: string[] = [];
  onFileImport($event: Event) {
    // const target: DataTransfer = $event.target as any as DataTransfer;
    // if (target.files.length !== 1)
    //   throw new Error("Cannot upload multiple files");
    // from(target.files[0].arrayBuffer())
    //   .pipe(
    //     map((arrayBuffer) => {
    //       const wb = read(arrayBuffer);
    //       // Read the first sheet
    //       const ws: WorkSheet = wb.Sheets[wb.SheetNames[0]];
    //       // Convert to JSON
    //       const strTxns = utils
    //         .sheet_to_json<Record<ColumnHeaderLabels, string>>(ws, {
    //           defval: null,
    //           raw: false,
    //         })
    //         .map(convertSheetJsonToStrTxn);
    //       console.log(
    //         "🚀 ~ ImportManualTxnsComponent ~ onFileImport ~ strTxns:",
    //         strTxns,
    //       );
    //       // todo initialize form and utilize validation info
    //       return strTxns;
    //     }),
    //   )
    //   .subscribe();
  }
}

type AddPrefixAndCapitalizeToObject<T, P extends string> = {
  [K in keyof T as K extends string ? `${P}${Capitalize<K>}` : never]: T[K];
};

function convertSheetJsonToStrTxn(
  // value: Record<ColumnHeaderLabels, string>,
  value: Record<string, string>,
): DeepPartial<StrTxnWithHiddenProps> {
  const isKnownDirectionOfSAOption = (dir: string) =>
    Object.values(EditFormTemplateComponent.directionOfSAOptions)
      .filter((val) => val.length > 0)
      .includes(dir);

  const isKnownMethodOfTxnOption = (mOfTxn: string) =>
    Object.values(EditFormTemplateComponent.methodOfTxnOptions)
      .filter((val) => val !== "Other")
      .includes(mOfTxn);

  const isKnownTypeOfFundsOption = (tOfFunds: string) =>
    Object.values(EditFormTemplateComponent.typeOfFundsOptions)
      .filter((val) => val !== "Other")
      .includes(tOfFunds);

  const isKnownAccountCurrencyOption = (acntCurr: string) =>
    Object.values(EditFormTemplateComponent.accountCurrencyOptions)
      .filter((val) => val.length > 0)
      .includes(acntCurr);

  const isKnownAmountCurrencyOption = (amtCurr: string) =>
    Object.values(EditFormTemplateComponent.amountCurrencyOptions)
      .filter((val) => val.length > 0)
      .includes(amtCurr);

  const isKnownDetailsOfDispositionOption = (dispo: string) =>
    Object.values(EditFormTemplateComponent.detailsOfDispositionOptions)
      .filter((val) => val !== "Other")
      .includes(dispo);

  const mapWasTxnAttempted = (val: string) => {
    if (["yes", "true"].includes(val.trim().toLowerCase())) return true;
    if (["no", "false"].includes(val.trim().toLowerCase())) return false;
    return null;
  };

  const mapWasSofInfoObtained = (val: string) => {
    if (["yes", "true"].includes(val.trim().toLowerCase())) return true;
    if (["no", "false"].includes(val.trim().toLowerCase())) return false;
    return null;
  };
  const mapWasCondInfoObtained = (val: string) => {
    if (["yes", "true"].includes(val.trim().toLowerCase())) return true;
    if (["no", "false"].includes(val.trim().toLowerCase())) return false;
    return null;
  };

  const mapWasConductedOnBehalf = (val: string) => {
    if (["yes", "true"].includes(val.trim().toLowerCase())) return true;
    if (["no", "false"].includes(val.trim().toLowerCase())) return false;
    return null;
  };

  const parseNumber = (value: string | undefined) =>
    value && !Number.isNaN(Number(value)) ? Number(value) : null;

  // Map flat keys to StrTxn properties
  return {
    wasTxnAttempted: mapWasTxnAttempted(
      value["Was the transaction attempted?"],
    ),
    wasTxnAttemptedReason: mapWasTxnAttempted(
      value["Was the transaction attempted?"],
    )
      ? value["Reason transaction was not completed"]
      : null,
    methodOfTxn: isKnownMethodOfTxnOption(value["Method of Txn"])
      ? value["Method of Txn"]
      : "Other",
    purposeOfTxn: value["Purpose of Txn"],
    methodOfTxnOther: !isKnownMethodOfTxnOption(value["Method of Txn"])
      ? value["Method of Txn"]
      : null,
    reportingEntityLocationNo: value["Reporting Entity"],

    // startingActions array: map from prefixed keys
    startingActions: [
      {
        _id: uuidv4(),
        directionOfSA: isKnownDirectionOfSAOption(value["Direction"])
          ? value["Direction"]
          : null,
        typeOfFunds: isKnownTypeOfFundsOption(value["Type of Funds"])
          ? value["Type of Funds"]
          : "Other",
        typeOfFundsOther: !isKnownTypeOfFundsOption(value["Type of Funds"])
          ? value["Type of Funds"]
          : null,
        amount: parseNumber(value["Debit"]),
        currency: isKnownAmountCurrencyOption(value["Debit Currency"])
          ? value["Debit Currency"]
          : null,
        fiuNo: value["Debit FIU"],
        branch: value["Debit Branch"],
        account: value["Debit Account"],
        accountCurrency: isKnownAccountCurrencyOption(
          value["Debit Account Currency"],
        )
          ? value["Debit Account Currency"]
          : null,
        howFundsObtained: value["How were the funds obtained?"],
        wasSofInfoObtained: mapWasSofInfoObtained(
          value[
            "Was information about the source of funds or virtual currency obtained?"
          ],
        ),
        wasCondInfoObtained: mapWasCondInfoObtained(
          value["Have you obtained any related conductor info?"],
        ),
        conductors: [
          {
            wasConductedOnBehalf: mapWasConductedOnBehalf(
              value[
                "Was this transaction conducted or attempted on behalf of another person or entity?"
              ],
            ),
          },
        ],
        // hasAccountHolders: false,
        // accountHolders: [],
        // sourceOfFunds: [],
        // conductors: [],
      },
    ],

    // completingActions array: map from prefixed keys
    completingActions: [
      {
        _id: uuidv4(),
        detailsOfDispo: isKnownDetailsOfDispositionOption(
          value["Details of Disposition"],
        )
          ? value["Details of Disposition"]
          : "Other",
        detailsOfDispoOther: !isKnownDetailsOfDispositionOption(
          value["Details of Disposition"],
        )
          ? value["Details of Disposition"]
          : null,

        amount: parseNumber(value["Credit Amount"]),
        currency: isKnownAmountCurrencyOption(value["Credit Currency"])
          ? value["Credit Currency"]
          : null,
        fiuNo: value["Credit FIU"],
        branch: value["Credit Branch"],
        account: value["Credit Account"],
        // hasAccountHolders: false,
        // accountHolders: [],
        // wasAnyOtherSubInvolved: false,
        // involvedIn: [],
        // wasBenInfoObtained: false,
        // beneficiaries: [],
      },
    ],
  };
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> | null : T[P] | null;
};
