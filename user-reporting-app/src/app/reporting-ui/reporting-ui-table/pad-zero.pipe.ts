import { Pipe, type PipeTransform } from "@angular/core";
import { TransactionTimeDirective } from "../edit-form/transaction-time.directive";

@Pipe({
  name: "appTxnTime",
})
export class TxnTimePipe implements PipeTransform {
  transform(value: string | number): string {
    if (value == null) return "";
    return TransactionTimeDirective.parseAndFormatTime(value)!;
  }
}
