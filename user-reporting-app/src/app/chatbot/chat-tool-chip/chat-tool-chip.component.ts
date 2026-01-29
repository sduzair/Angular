import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chat } from '@hashbrownai/core';

@Component({
  selector: 'app-chat-tool-chip',
  imports: [MatProgressSpinnerModule, MatIconModule, MatChipsModule],
  template: `
    @if (toolCall().status === 'pending') {
      <mat-chip class="pending border-0 py-1">
        <mat-spinner diameter="16" class="flex-shrink-0"></mat-spinner>
        <span class="text-nowrap">{{ pending() }}</span>
      </mat-chip>
    } @else if (toolCall().status === 'done') {
      <mat-chip class="done border-0 py-1">
        <mat-icon
          inline="true"
          class="flex-shrink-0"
          fontIcon="check"></mat-icon>
        <span class="text-nowrap">{{ done() }}</span>
      </mat-chip>
    }
  `,
  styleUrl: './chat-tool-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatToolChipComponent {
  toolCall = input.required<Chat.AnyToolCall>();
  pending = input.required<string>();
  done = input.required<string>();
}
