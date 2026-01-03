import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { MarkdownComponent as NgxMarkdownComponent } from 'ngx-markdown';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-markdown',
  imports: [NgxMarkdownComponent, ClipboardModule, MatIconModule],
  template: `
    <div class="markdown-container">
      <button
        type="button"
        [cdkCopyToClipboard]="data()"
        (cdkCopyToClipboardCopied)="onCopied()"
        class="copy-btn"
        [class.copied]="copied()"
        [attr.aria-label]="copied() ? 'Copied' : 'Copy to clipboard'">
        <mat-icon>{{ copied() ? 'check_circle' : 'content_copy' }}</mat-icon>
      </button>
      <markdown class="app-markdown" [data]="data()"></markdown>
    </div>
  `,
  styleUrl: './markdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownComponent {
  readonly data = input.required<string>();
  readonly copied = signal(false);

  private destroyRef = inject(DestroyRef);
  private timeoutId?: number;

  onCopied(): void {
    this.copied.set(true);

    // Clear existing timeout if user copies again quickly
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Reset after 2 seconds
    this.timeoutId = window.setTimeout(() => {
      this.copied.set(false);
      this.timeoutId = undefined;
    }, 2000);
  }

  constructor() {
    // Cleanup timeout on component destroy
    this.destroyRef.onDestroy(() => {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
    });
  }
}
