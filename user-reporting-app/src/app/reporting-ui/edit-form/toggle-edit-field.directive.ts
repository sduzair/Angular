import {
  AfterViewChecked,
  Directive,
  ElementRef,
  HostListener,
  Input,
  Optional,
  Renderer2,
} from "@angular/core";
import { ControlContainer, FormArray } from "@angular/forms";
import { MatFormField } from "@angular/material/form-field";

@Directive({
  selector: "[appToggleEditField]",
})
export class ToggleEditFieldDirective implements AfterViewChecked {
  @Input({ required: false }) appToggleEditField?: string;
  get control() {
    if (!this.formField && this.controlContainer.control instanceof FormArray) {
      return this.controlContainer.control!;
    }
    if (!this.formField) {
      return this.controlContainer.control!.get(this.appToggleEditField!)!;
    }
    return this.formField!._control?.ngControl?.control!;
  }
  get iconElement() {
    return this.el.nativeElement.querySelector("mat-icon");
  }

  get isCheckboxControl() {
    return Boolean(this.appToggleEditField);
  }

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private controlContainer: ControlContainer,
    @Optional() private formField?: MatFormField,
  ) {}

  ngAfterViewChecked() {
    this.updateIcon();
  }

  @HostListener("click", ["$event"])
  onClick($event: Event): void {
    $event.stopPropagation();

    if (this.control.disabled && this.isCheckboxControl) {
      this.control.enable({ emitEvent: false });
      this.control.setValue(true);
    } else if (this.control.disabled) {
      this.control.enable();
    } else {
      this.control.disable({ emitEvent: false });
      this.control.reset();
    }

    this.updateIcon();
  }

  private updateIcon() {
    if (!this.iconElement) return;

    const iconName = this.control?.disabled ? "edit" : "cancel";

    // Update the icon text content
    this.renderer.setProperty(this.iconElement, "textContent", iconName);
  }
}
