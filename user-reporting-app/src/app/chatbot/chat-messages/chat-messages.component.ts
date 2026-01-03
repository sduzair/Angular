import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  RenderMessageComponent,
  UiAssistantMessage,
  UiChatMessage,
} from '@hashbrownai/angular';
import { ChatToolChipComponent } from '../chat-tool-chip/chat-tool-chip.component';

@Component({
  selector: 'app-chat-messages',
  imports: [
    ChatToolChipComponent,
    RenderMessageComponent,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    @for (message of collapsedMessages(); track $index) {
      @switch (message.role) {
        @case ('user') {
          <div class="d-flex justify-content-end mb-3">
            <div
              class="chat-message user rounded-3 py-2 px-3 shadow-sm"
              style="max-width: 75%">
              <p class="mb-0">{{ message.content }}</p>
            </div>
          </div>
        }
        @case ('assistant') {
          <div
            class="d-flex gap-2 mb-3"
            [class.flex-column]="message.toolCalls.length > 0">
            @if (message.toolCalls.length > 0) {
              <div class="flex-shrink-0 position-absolute">
                <div
                  class="assistant-avatar rounded-circle overflow-hidden"
                  style="width: 40px; height: 40px">
                  <mat-icon class="w-100 h-100">auto_awesome</mat-icon>
                </div>
              </div>
              <div
                class="d-flex flex-row flex-wrap gap-2 mb-2 ms-5 overflow-auto"
                style="max-height: 400px; scrollbar-width: thin;">
                @for (toolCall of message.toolCalls; track $index) {
                  <app-chat-tool-chip
                    [toolCall]="toolCall"
                    [pending]="'Running ' + toolCall.name"
                    [done]="'Ran ' + toolCall.name" />
                }
              </div>
            }
            @if (message.content) {
              <div
                class="chat-message assistant rounded-3 py-2 px-3 shadow-sm"
                style="max-width: 75%">
                <hb-render-message [message]="message" />
              </div>
            }
          </div>
        }
        @case ('error') {
          <div
            class="d-flex align-items-center gap-2 mb-3 p-3 bg-opacity-10 
                    border border-danger border-opacity-25 rounded-3">
            <mat-icon color="error" class="flex-shrink-0">error</mat-icon>
            <span class="flex-grow-1">{{ message.content }}</span>
            @if ($last) {
              <button
                type="button"
                mat-button
                color="warn"
                class="flex-shrink-0">
                Retry
              </button>
            }
          </div>
        }
      }
    }
  `,
  styleUrl: './chat-messages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessagesComponent {
  readonly retry = output<void>();
  messages = input.required<UiChatMessage[]>();
  collapsedMessages = computed(() => {
    const messages = this.messages();
    const collapsedMessages = [];
    let assistantMessageStack: UiAssistantMessage[] = [];

    for (const message of messages) {
      if (message.role === 'assistant' && message.toolCalls.length > 0) {
        assistantMessageStack.push(message);
      } else if (
        message.role === 'assistant' &&
        message.toolCalls.length === 0
      ) {
        assistantMessageStack.push(message);

        collapsedMessages.push(
          this.collapseAssistantMessageStack(assistantMessageStack),
        );
        assistantMessageStack = [];
      } else {
        collapsedMessages.push(message);
      }
    }

    if (assistantMessageStack.length > 0) {
      collapsedMessages.push(
        this.collapseAssistantMessageStack(assistantMessageStack),
      );
    }

    return collapsedMessages;
  });

  collapseAssistantMessageStack(assistantMessageStack: UiAssistantMessage[]) {
    const [firstMessage, ...rest] = assistantMessageStack;
    return rest.reduce((acc: UiAssistantMessage, message) => {
      return {
        ...acc,
        ...message,
        toolCalls: [...acc.toolCalls, ...message.toolCalls],
      };
    }, firstMessage);
  }
}
