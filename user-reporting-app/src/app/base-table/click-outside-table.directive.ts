import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
} from "@angular/core";

@Directive({
  selector: "[appClickOutsideTable]",
})
export class ClickOutsideTableDirective implements OnDestroy {
  @Output() appClickOutsideTable = new EventEmitter<void>();

  constructor(private el: ElementRef) {}
  ngOnDestroy(): void {
    this.appClickOutsideTable.complete();
  }

  private allowedClass = "color-pallette";

  @HostListener("document:click", ["$event.target"])
  public onClick(targetElement: HTMLElement) {
    if (!this.el.nativeElement.isConnected || !targetElement.isConnected) {
      return;
    }

    const clickedInside = this.el.nativeElement.contains(targetElement);
    const clickedInsideAllowed = this.hasParentWithClass(
      targetElement,
      this.allowedClass,
    );

    if (clickedInside || clickedInsideAllowed) return;

    this.appClickOutsideTable.emit();
  }

  @HostListener("document:keydown.escape", ["$event"])
  public onEscapeKey(event: KeyboardEvent) {
    this.appClickOutsideTable.emit();
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
