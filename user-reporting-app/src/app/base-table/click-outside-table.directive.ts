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
  private documentClickListener!: (ev: Event) => void;
  @Output() appClickOutsideTable = new EventEmitter<void>();

  constructor(private el: ElementRef) {}

  private allowedElements = ["color-pallette", "table-paginator"];
  private notAllowedElements = ["mat-column-actions"];

  ngOnInit() {
    this.documentClickListener = this.onClick.bind(this);
    // emission must happen in capture phase in case of table row
    document.addEventListener("click", this.documentClickListener, {
      capture: true,
    });
  }

  ngOnDestroy() {
    document.removeEventListener("click", this.documentClickListener, {
      capture: true,
    });
    this.appClickOutsideTable.complete();
  }

  private onClick(ev: Event) {
    const targetEle = ev.target as HTMLElement;
    if (!this.el.nativeElement.isConnected || !targetEle.isConnected) {
      return;
    }

    const clickedInside = this.el.nativeElement.contains(targetEle);
    const clickedInsideAllowed = this.allowedElements.some((allowedElement) =>
      this.hasParentWithClass(targetEle, allowedElement),
    );

    const clickedInsideNotAllowed = this.notAllowedElements.some(
      (notAllowedElement) =>
        this.hasParentWithClass(targetEle, notAllowedElement),
    );

    if (clickedInsideNotAllowed) {
      this.appClickOutsideTable.emit();
    }

    if (clickedInside || clickedInsideAllowed) return;

    this.appClickOutsideTable.emit();
  }

  @HostListener("document:keydown.escape", ["$event"])
  public onEscapeKey(event: Event) {
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
