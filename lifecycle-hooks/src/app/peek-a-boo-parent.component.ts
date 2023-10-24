import { Component } from '@angular/core';

import { LoggerService } from './logger.service';
import { PeekABooComponent } from './peek-a-boo.component';
import { NgFor, NgIf } from '@angular/common';

@Component({
    selector: 'peek-a-boo-parent',
    template: `
  <hr />
  <div class="parent">
    <h2>Peek-A-Boo</h2>

    <button type="button" (click)="toggleChild()">
      {{hasChild ? 'Destroy' : 'Create'}} PeekABooComponent
    </button>
    <button type="button" (click)="updateHero()" [hidden]="!hasChild">Update Hero</button>

    <div class="info">
      <h3>Lifecycle Hook Log - From Parent Before Peek-a-boo Instance</h3>
      <div *ngFor="let msg of hookLog" class="log">{{msg}}</div>

      <peek-a-boo *ngIf="hasChild" [name]="heroName"></peek-a-boo>

      <h3>Lifecycle Hook Log - From Parent After Peek-a-boo Instance</h3>
      <div *ngFor="let msg of hookLog" class="log">{{msg}}</div>
    </div>
  </div>
  `,
    providers: [LoggerService],
    standalone: true,
    imports: [NgFor, NgIf, PeekABooComponent]
})
export class PeekABooParentComponent {

  hasChild = false;
  hookLog: string[] = [];

  heroName = 'Windstorm';
  private logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
    this.hookLog = logger.logs;
  }

  toggleChild() {
    this.hasChild = !this.hasChild;
    if (this.hasChild) {
      this.heroName = 'Windstorm';
      this.logger.clear(); // clear log on create
    }
    // The template get's rendered before any hook is called, so we see only constructor log in peek-a-boo.component.ts without tick() method
    // Bad because it invokes change detection twice
    // this.logger.tick();
  }

  updateHero() {
    this.heroName += '!';
    // this.logger.tick();
  }
}
