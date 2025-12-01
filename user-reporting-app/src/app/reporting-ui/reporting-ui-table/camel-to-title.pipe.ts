import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "camelToTitle",
  standalone: true,
})
export class CamelToTitlePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return "";

    return (
      value
        // Insert space before uppercase letters
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        // Handle sequences of uppercase letters (e.g., XMLHttp -> XML Http)
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        // Capitalize first letter of each word
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );
  }
}
