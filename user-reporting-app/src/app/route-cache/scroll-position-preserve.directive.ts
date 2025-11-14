import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { Router, NavigationStart, NavigationEnd } from "@angular/router";
import { filter } from "rxjs";
import { ScrollPositionService } from "./scroll-position.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Directive({
  selector: "[appScrollPositionPreserve]",
})
export class ScrollPositionPreserveDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private scrollService = inject(ScrollPositionService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private routeKey = "";

  ngOnInit(): void {
    // Generate unique route key
    this.routeKey = this.router.url || "default-route";

    // Listen for navigation events to save scroll before leaving
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((event) => event instanceof NavigationStart),
        filter(() => this.router.url.includes(this.routeKey)),
      )
      .subscribe(() => {
        this.saveScrollPositions();
      });

    // Listen for when navigating TO this route (handles cached route reattachment)
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((event) => event instanceof NavigationEnd),
        filter(() => this.router.url.includes(this.routeKey)),
      )
      .subscribe(() => {
        this.restoreScrollPositions();
      });
  }

  ngOnDestroy(): void {
    // Fallback for non-cached routes
    this.saveScrollPositions();
  }

  private saveScrollPositions(): void {
    const positions: { [key: string]: [number, number] } = {};

    this.getScrollableElements().forEach((element, index) => {
      positions[index] = [element.scrollTop, element.scrollLeft];
    });

    if (Object.keys(positions).length > 0) {
      this.scrollService.saveScrollPositions(this.routeKey, positions);
    }
  }

  private restoreScrollPositions(): void {
    const positions = this.scrollService.getScrollPositions(this.routeKey);
    if (!positions) return;

    const scrollableElements = this.getScrollableElements();
    scrollableElements.forEach((element, index) => {
      if (positions[index] !== undefined) {
        element.scrollTop = positions[index][0];
        element.scrollLeft = positions[index][1];
      }
    });
  }

  static SCROLLABLE_ELE = "scroll-position-preserve" as const;

  private getScrollableElements(): HTMLElement[] {
    const container = this.elementRef.nativeElement as HTMLElement;
    const elements = container.querySelectorAll(
      `.${ScrollPositionPreserveDirective.SCROLLABLE_ELE}`,
    );
    return Array.from(elements) as HTMLElement[];
  }
}
