import { Pipe, PipeTransform } from "@angular/core";

@Pipe({ name: "appCamelCaseToSpaces" })
export class CamelCaseToSpacesPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return "";
    const result = value.replace(/([a-z])([A-Z])/g, "$1 $2");
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}
