import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { delay, filter, map } from 'rxjs';
import { ScrollPositionService } from './scroll-position.service';

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
        map(() => this.getscrollableEles()),
        filter((scrollableEles) => {
          return (
            scrollableEles.length > 0 &&
            scrollableEles.every((ele) => ele.isConnected)
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((scrollableEles) => {
        this.saveScrollPositions(scrollableEles);
      });

    // Listen for when navigating TO this route (handles cached route reattachment)
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        filter(() => this.router.routerState.snapshot.url === this.routeKey),
        map(() => this.getscrollableEles()),
        filter((scrollableEles) => {
          return (
            scrollableEles.length > 0 &&
            scrollableEles.every((ele) => ele.isConnected)
          );
        }),
        // Wait for the browser to attach the view and paint
        delay(0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((scrollableEles) => {
        this.restoreScrollPositions(scrollableEles);
      });
  }

  ngOnDestroy(): void {
    // Fallback for non-cached routes
    const scrollEles = this.getscrollableEles();
    this.saveScrollPositions(scrollEles);
  }

  private saveScrollPositions(scrollableEles: HTMLElement[]): void {
    const positions: Record<string, [number, number]> = {};

    scrollableEles.forEach((element, index) => {
      console.assert(element.isConnected);
      positions[index] = [element.scrollTop, element.scrollLeft];
    });

    if (Object.keys(positions).length > 0) {
      this.scrollService.saveScrollPositions(this.routeKey, positions);
    }
  }

  private restoreScrollPositions(scrollableEles: HTMLElement[]): void {
    const positions = this.scrollService.getScrollPositions(this.routeKey);
    if (!positions) return;

    scrollableEles.forEach((element, index) => {
      console.assert(element.isConnected);
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

  private getscrollableEles(): HTMLElement[] {
    const container = this.elementRef.nativeElement as HTMLElement;
    const elements = container.querySelectorAll(
      `.${ScrollPositionPreserveDirective.SCROLLABLE_ELE}`,
    );
    return Array.from(elements) as HTMLElement[];
  }
}
