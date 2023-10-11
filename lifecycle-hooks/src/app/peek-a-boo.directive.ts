import { Directive, OnInit } from '@angular/core';

import { LoggerService } from './logger.service';

let nextId = 0;

@Directive({ selector: '[appPeekABoo]' })
export class PeekABooDirective implements OnInit {
  childLogs: string[];
  constructor(private logger: LoggerService) {
    this.childLogs = logger.logs;
  }

  // implement OnInit's `ngOnInit` method
  ngOnInit() {
    this.logIt('OnInit');
  }

  logIt(msg: string) {
    this.logger.log(`#${++nextId} ${msg}`);
    // console.log(`#${nextId} ${msg}`);
  }
}
