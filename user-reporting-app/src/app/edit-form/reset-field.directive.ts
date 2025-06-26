import { Directive, HostListener, inject } from "@angular/core";
import { NgControl } from "@angular/forms";
import { MatFormField } from "@angular/material/form-field";

@Directive({
  selector: "[appResetField]",
})
export class ResetFieldDirective {
  private formField = inject(MatFormField);

  get valueAccessor() {
    return (this.formField._control.ngControl as NgControl).valueAccessor;
  }

  get control() {
    return this.formField._control?.ngControl?.control!;
  }

  @HostListener("click", ["$event"])
  onClick($event: Event): void {
    $event.stopPropagation();

    this.control.reset();
  }
}
