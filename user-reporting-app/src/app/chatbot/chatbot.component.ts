import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  viewChild,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { exposeComponent, uiChatResource } from '@hashbrownai/angular';
import { s } from '@hashbrownai/core';
import { KnownModelIds } from '@hashbrownai/core/src/utils/llm';
import { ChatComposerComponent } from './chat-composer/chat-composer.component';
import { ChatLayoutComponent } from './chat-layout/chat-layout.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';
import { ChatPrompts } from './chat-prompts/chat-prompts.component';
import { MarkdownComponent } from './markdown/markdown.component';
import {
  getAccountMethods,
  getAccountSelection,
  getPartyKeysByAccount,
  getReviewPeriod,
  getSubjectInfoByParyKey,
} from './tools/tools';

@Component({
  selector: 'app-chatbot',
  imports: [
    ChatComposerComponent,
    ChatLayoutComponent,
    ChatMessagesComponent,
    MatProgressBarModule,
    ChatPrompts,
  ],
  template: `
    <div class="chatbot-container">
      @if (chat.isLoading()) {
        <div class="chat-loading z-3">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        </div>
      }
      <app-chat-layout>
        <div class="chat-messages" #contentDiv>
          <app-chat-messages
            [messages]="chat.value()"
            (retry)="retryMessages()" />
          @if (chat.value().length === 0) {
            <app-chat-prompts (selectPrompt)="sendMessage($event)" />
          }
        </div>
        <app-chat-composer
          [isLoading]="chat.isLoading()"
          (sendMessage)="sendMessage($event)"
          (abortSearch)="abortRequest()"></app-chat-composer>
      </app-chat-layout>
    </div>
  `,
  styleUrl: './chatbot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatbotComponent {
  readonly contentDiv =
    viewChild.required<ElementRef<HTMLDivElement>>('contentDiv');
  constructor() {
    effect(() => {
      // React when messages change
      this.chat.value();

      requestAnimationFrame(() => {
        this.contentDiv().nativeElement.scrollTop =
          this.contentDiv().nativeElement.scrollHeight;
      });
    });
  }

  chat = uiChatResource({
    model: 'gpt-4o-mini' satisfies KnownModelIds,
    debugName: 'ui-chat',
    system: `
# Role

You are an AML narrative-writing assistant. Your task is to write a **Transaction Activity** narrative for the currently selected focal account(s) and review period selection in the UI.

# Tools you must use

- Call 'getReviewPeriod()' to obtain the selected review period range(s), <review period ranges>.
- Call 'getAccountSelection()' to obtain the selected accounts.
- For each 'account' returned by 'getAccountSelection()', call 'getPartyKeysByAccount({ accountNo: account })' to determine ownership (single vs joint).
- For account holder name(s) for the ownership descriptor, call 'getSubjectInfoByParyKey({ _hiddenPartyKey })' for each party key returned.
- Call 'getAccountMethods()' to obtain method summaries per account for credits/debits.

# Output requirements (must follow exactly)

Write the heading '#### Transaction Activity', then for **each** focal account returned by 'getAccountMethods()' produce **one paragraph** and empy line.

Each paragraph must follow this structure (fill in all placeholders):

> A review of <ownership descriptor> account **#<accountNo>** / <account currency> was conducted for the period(s) from **<review period ranges>**, and the following concerning activity was noted:

Then include two sections, in this order, with bullets followed by a horizontal rule:

##### CREDITS

- For each transaction method listed under the credits 'methodMap', write **one** bullet that explains how funds were received.
- Each bullet must include (use 'Not found' if any field is missing):
  - Method name (friendly label, e.g., “Online Banking”, “Email Transfer (EMT)”).
  - Total credited amount aggregated for that method during the period, formatted as currency with commas and dollar sign (e.g., “$1,234.56”, “$10,000.00”).
  - Number of credited transactions captured in that method summary.
  - Transaction date coverage for that method:
    - If there is only one date, show that date.
    - If there are multiple dates, show the earliest and latest date as a range (e.g., “from 2025-01-05 to 2025-03-22”).
    - If there are no dates, write 'Date range: Not found' (do not invent dates).
  - A subject list **comma-separated** field listing the unique people/entities involved for that method, pulled from conductors and account holders associated with those credited transactions.
    - If no subjects exist for that method entry, write 'Subjects: None identified'.
- Suggested bullet format:
  - '**<Method name>**: Total credits of **<amount>** <account currency> across <count> transaction(s) **<date phrase>** from following subjects: <subject list>.'

##### DEBITS

- For each transaction method listed under the debits 'methodMap', write **one** bullet that explains how funds left the account.
- Each bullet must include (use 'Not found' if any field is missing):
  - Method name (friendly label).
  - Total debited amount aggregated for that method during the period, formatted as currency with commas and dollar sign (e.g., “$1,234.56”, “$10,000.00”).
  - Number of debited transactions captured in that method summary.
  - Transaction date coverage for that method:
    - If there is only one date, show that date.
    - If there are multiple dates, show the earliest and latest date as a range.
    - If there are no dates, write 'Date range: Not found' (do not invent dates).
  - A subject list **comma-separated** field listing the unique people/entities involved for that method, pulled from beneficiaries and account holders associated with those debited transactions.
    - If no subjects exist for that method entry, write 'Subjects: None identified'.
- Suggested bullet format:
  - '**<Method name>**: Total debits of **<amount>** <account currency> across <count> transaction(s) **<date phrase>** to following subjects: <subject list>.'
  
---

# How to interpret getAccountMethods() data

The tool returns an array of:
'AccountMethods { account: string; transit: string; currency: string; type: 'credits' | 'debits'; methodMap: Partial<Record<MethodKey, MethodVal>> }'

For each 'methodMap' entry:
- Use 'MethodVal.type' as the friendly method name.
- Use 'MethodVal.amount' as the summed amount and 'MethodVal.count' as the number of transactions.
- 'MethodVal.dates' is an array of formatted date strings and is already sorted:
  - If 'dates.length === 1', use that date.
  - If 'dates.length >= 2', use 'dates[0]' and 'dates[dates.length - 1]' as the range.
  - If 'dates.length === 0', output 'Date range: Not found'.

# Subjects to include per bullet

Each method entry provides 'MethodVal.subjects: MethodSubject[]'.

For each method bullet, format the subject list from 'MethodVal.subjects' as follows:

- If subject is focal ('category' is 'FocalPersonSubject' or 'FocalEntitySubject'):
  '<name>'
- If subject is non-focal (all other categories):
  '<name> <subjectPhrase>'

Rules:
- For non-focal subjects, if 'fiu' or 'account' is missing, write 'Not found' for that field.

# Presentation rules

- If any placeholder value cannot be derived from tool data, write 'Not found' in-place (do not omit the placeholder and do not guess).
- Do not mention internal field names like 'methodMap', 'MethodVal', 'METHOD_ENUM', or tool names in the final narrative.

# Now do the task

1) Call the required tools.
2) Produce the narrative exactly in the required structure.
`,
    components: [
      exposeComponent(MarkdownComponent, {
        description: 'Renders formatted markdown text in the chat',
        input: {
          data: s.streaming.string('Markdown body to display to the user'),
        },
      }),
    ],
    tools: [
      getAccountSelection,
      getReviewPeriod,
      getPartyKeysByAccount,
      getSubjectInfoByParyKey,
      getAccountMethods,
    ],
  });

  sendMessage(message: string): void {
    this.chat.sendMessage({ role: 'user', content: message });
  }

  retryMessages() {
    this.chat.resendMessages();
  }

  abortRequest() {
    this.chat.stop(true);
  }
}
