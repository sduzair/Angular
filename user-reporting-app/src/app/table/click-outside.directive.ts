import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from "@angular/core";

@Directive({
  selector: "[appClickOutside]",
})
export class ClickOutsideDirective {
  @Output() appClickOutside = new EventEmitter<void>();

  constructor(private el: ElementRef) {}

  private allowedClass = "color-pallette";

  @HostListener("document:click", ["$event.target"])
  public onClick(targetElement: HTMLElement) {
    const clickedInside = this.el.nativeElement.contains(targetElement);
    const clickedInsideAllowed = this.hasParentWithClass(
      targetElement,
      this.allowedClass,
    );

    if (!clickedInside && !clickedInsideAllowed) {
      this.appClickOutside.emit();
    }
  }

  private hasParentWithClass(element: HTMLElement, className: string): boolean {
    while (element) {
      if (element.classList?.contains(className)) {
        return true;
      }
      element = element.parentElement as HTMLElement;
    }
    return false;
  }
}
