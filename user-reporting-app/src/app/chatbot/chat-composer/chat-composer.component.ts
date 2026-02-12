import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-composer',
  imports: [MatIconModule, MatButtonModule, TextFieldModule],
  template: `
    <div class="composer-container d-flex align-items-center rounded-5">
      <div class="textareaWrapper d-flex flex-grow-1">
        <textarea
          name="Message"
          #textarea
          matInput
          cdkTextareaAutosize
          cdkAutosizeMinRows="1"
          cdkAutosizeMaxRows="5"
          class="chat-composer"
          placeholder="Ask"
          (keydown.enter)="onHitEnter(textarea, $event)"></textarea>
      </div>

      @if (isLoading()) {
        <button
          type="button"
          mat-icon-button
          (click)="abortSearch.emit()"
          class="send-button me-2"
          aria-label="Stop generating">
          <mat-icon>stop_circle</mat-icon>
        </button>
      } @else {
        <button
          type="button"
          mat-icon-button
          class="send-button me-2"
          aria-label="Send"
          (click)="onSendMessage(textarea)"
          aria-label="Send message">
          <mat-icon>send</mat-icon>
        </button>
      }
    </div>
  `,
  styleUrl: './chat-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposerComponent {
  readonly sendMessage = output<string>();

  autosize = viewChild.required(CdkTextareaAutosize);
  readonly isLoading = input<boolean>(false);
  readonly abortSearch = output<void>();

  onHitEnter(textarea: HTMLTextAreaElement, $event: Event) {
    $event.preventDefault();

    if (($event as KeyboardEvent).shiftKey) {
      // eslint-disable-next-line no-param-reassign
      textarea.value += '\n';
    } else {
      this.onSendMessage(textarea);
    }
  }

  onSendMessage(textarea: HTMLTextAreaElement) {
    this.sendMessage.emit(textarea.value);

    // eslint-disable-next-line no-param-reassign
    textarea.value = '';
    this.autosize().reset();
  }
}
