import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { delay, filter } from 'rxjs';
import { ScrollPositionService } from './scroll-position.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[appScrollPositionPreserve]',
})
export class ScrollPositionPreserveDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private scrollService = inject(ScrollPositionService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private routeKey = '';

  ngOnInit(): void {
    // Generate unique route key
    this.routeKey = this.router.routerState.snapshot.url || 'default-route';

    // Listen for navigation events to save scroll before leaving
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        filter(() => this.router.routerState.snapshot.url === this.routeKey),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.saveScrollPositions();
      });

    // Listen for when navigating TO this route (handles cached route reattachment)
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        filter(() => this.router.routerState.snapshot.url === this.routeKey),
        // Wait for the browser to attach the view and paint
        delay(0),
        takeUntilDestroyed(this.destroyRef),
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
    const positions: Record<string, [number, number]> = {};

    const scrollableElements = this.getScrollableElements();

    console.assert(scrollableElements.every((ele) => ele.isConnected));

    scrollableElements.forEach((element, index) => {
      console.assert(element.isConnected);
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

    console.assert(scrollableElements.every((ele) => ele.isConnected));

    scrollableElements.forEach((element, index) => {
      if (positions[index] !== undefined) {
        // eslint-disable-next-line no-param-reassign
        element.scrollTop = positions[index][0];
        // eslint-disable-next-line no-param-reassign
        element.scrollLeft = positions[index][1];
      }
      return element;
    });
  }

  static SCROLLABLE_ELE = 'scroll-position-preserve' as const;

  private getScrollableElements(): HTMLElement[] {
    const container = this.elementRef.nativeElement as HTMLElement;
    const elements = container.querySelectorAll(
      `.${ScrollPositionPreserveDirective.SCROLLABLE_ELE}`,
    );
    return Array.from(elements) as HTMLElement[];
  }
}
