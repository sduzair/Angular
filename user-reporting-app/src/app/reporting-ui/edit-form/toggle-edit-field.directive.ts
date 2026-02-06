import {
  AfterViewChecked,
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  inject,
} from '@angular/core';
import { ControlContainer, FormArray } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { SET_AS_EMPTY } from './mark-as-cleared.directive';

@Directive({
  selector: '[appToggleEditField]',
})
export class ToggleEditFieldDirective implements AfterViewChecked {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private controlContainer = inject(ControlContainer);
  private formField = inject(MatFormField, { optional: true });

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
    return this.el.nativeElement.querySelector('mat-icon');
  }

  get isCheckboxControl() {
    return Boolean(this.appToggleEditField);
  }

  ngAfterViewChecked() {
    this.updateIcon();
  }

  @HostListener('click', ['$event'])
  onClick($event: Event): void {
    $event.stopPropagation();

    if (this.control.disabled && this.isCheckboxControl) {
      this.control.enable({ emitEvent: false });
      this.control.setValue(true);
      this.updateIcon();
      return;
    }
    if (this.control.disabled && !this.isCheckboxControl) {
      this.control.enable();
      this.updateIcon();
      return;
    }

    if (this.control.enabled && this.isCheckboxControl) {
      this.control.disable({ emitEvent: false });
      this.control.reset();
      this.updateIcon();
      return;
    }

    if (this.control.enabled && !this.isCheckboxControl) {
      this.control.disable({ emitEvent: false });
      this.control.reset(SET_AS_EMPTY);
      this.updateIcon();
      return;
    }
  }

  private updateIcon() {
    if (!this.iconElement) return;

    const iconName = this.control?.disabled ? 'edit' : 'cancel';

    // Update the icon text content
    this.renderer.setProperty(this.iconElement, 'textContent', iconName);
  }
}
