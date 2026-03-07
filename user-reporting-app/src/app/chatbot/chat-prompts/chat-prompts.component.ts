import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-prompts',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @for (prompt of prompts; track prompt) {
      <button
        class="shadow-sm"
        type="button"
        mat-stroked-button
        (click)="selectPrompt.emit(prompt.text)">
        <mat-icon>{{ prompt.icon }}</mat-icon>
        {{ prompt.text }}
      </button>
    }
  `,
  styleUrl: './chat-prompts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPrompts {
  readonly selectPrompt = output<string>();
  readonly prompts = [
    {
      text: 'Summarize all transaction activity',
      icon: 'format_list_bulleted',
    },
  ];
}
