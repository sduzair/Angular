import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-chat-layout',
  template: '<ng-content/>',
  styleUrl: './chat-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatLayoutComponent {}
