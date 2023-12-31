import { AfterContentChecked, AfterContentInit, Component, ContentChild } from '@angular/core';

import { ChildComponent } from './child.component';
import { LoggerService } from './logger.service';
import { NgIf } from '@angular/common';

@Component({
    selector: 'after-content',
    template: `
    <div>projected content begins</div>
      <ng-content></ng-content>
    <div>projected content ends</div>
  `
        + `
    <p *ngIf="comment" class="comment">
      {{comment}}
    </p>
  `,
    standalone: true,
    imports: [NgIf]
})
export class AfterContentComponent implements AfterContentChecked, AfterContentInit {
  private prevHero = '';
  comment = '';

  // Query for a CONTENT child of type `ChildComponent`
  @ContentChild(ChildComponent) contentChild!: ChildComponent;

  constructor(private logger: LoggerService) {
    this.logIt('AfterContent constructor');
  }

  ngOnInit() {
    this.logIt('AfterContent ngOnInit');
  }

  ngAfterContentInit() {
    // contentChild is set after the content has been initialized
    this.logIt('AfterContentInit');
    this.doSomething();
  }

  ngAfterContentChecked() {
    // contentChild is updated after the content has been checked
    if (this.prevHero === this.contentChild.hero) {
      this.logIt('AfterContentChecked (no change)');
    } else {
      this.prevHero = this.contentChild.hero;
      this.logIt('AfterContentChecked');
      this.doSomething();
    }
  }

  ngAfterViewInit() {
    // viewChild is set after the view has been initialized
    this.logIt('AfterViewInit');
  }

  ngAfterViewChecked() {
    // viewChild is updated after the view has been checked
    if (this.prevHero === this.contentChild.hero) {
      this.logIt('AfterViewChecked (no change)');
    } else {
      this.prevHero = this.contentChild.hero;
      this.logIt('AfterViewChecked');
      this.doSomething();
    }
  }

  // This surrogate for real business logic sets the `comment`
  private doSomething() {
    this.comment = this.contentChild.hero.length > 10 ? "That's a long name" : '';
  }

  private logIt(method: string) {
    const child = this.contentChild;
    const message = `${method}: ${child ? child.hero : 'no'} child content`;
    this.logger.log(message);
    // console.log(message);
  }
  // ...
}
