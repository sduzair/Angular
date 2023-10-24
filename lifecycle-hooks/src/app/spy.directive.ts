import { Directive, OnInit, OnDestroy } from '@angular/core';

import { LoggerService } from './logger.service';

// Spy on any element to which it is applied.
// Usage: <div appSpy>...</div>
@Directive({
    selector: '[appSpy]',
    standalone: true
})
export class SpyDirective implements OnInit, OnDestroy {
  private static nextId = 1;
  private id = SpyDirective.nextId++;

  constructor(private logger: LoggerService) { }

  ngOnInit() {
    this.logger.log(`Spy #${this.id} onInit`);
    // console.log(`Spy #${this.id} onInit`);
  }

  ngOnDestroy() {
    this.logger.log(`Spy #${this.id} onDestroy`);
    // console.log(`Spy #${this.id} onDestroy`);
  }
}
