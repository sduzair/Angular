import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-chat-prompts',
  imports: [],
  template: `
    @for (prompt of prompts; track prompt) {
      <button type="button" (click)="selectPrompt.emit(prompt)">
        "{{ prompt }}"
      </button>
    }
  `,
  styleUrl: './chat-prompts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPrompts {
  readonly selectPrompt = output<string>();
  readonly prompts = [
    'Show me all transaction activity',
    'Show external subjects',
  ];
}
