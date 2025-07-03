import { Pipe, type PipeTransform } from "@angular/core";

@Pipe({
  name: "appPadZero",
})
export class PadZeroPipe implements PipeTransform {
  transform(value: string | number, length = 3): string {
    if (value == null) return "";
    return value.toString().padStart(length, "0");
  }
}
