import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
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
  getAccountSelection,
  getAccountTransactionTotals,
  getPartyKeysByAccount,
  getReviewPeriod,
  getSubjectInfoByPartyKey,
  verifyBasicInfo,
} from './tools/tools';
import { SnackbarQueueService } from '../snackbar-queue.service';

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
          <app-chat-prompts (selectPrompt)="sendMessage($event)" />
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
  private snackBar = inject(SnackbarQueueService);
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
    // inject(AccountTransactionTotalsService)
    //   .getAccountTransactionTotals$()
    //   .pipe(
    //     map((accountTotals) =>
    //       accountTotals.map((account) => ({
    //         ...account,
    //         totalsMap: undefined,
    //         // Convert Map to array of objects
    //         totals: Array.from(account.totalsMap.entries()).map(
    //           ([txnTypeKey, totalsData]) => ({
    //             txnTypeKey,
    //             type: totalsData.type,
    //             // Convert amounts Map to array
    //             amounts: Array.from(totalsData.amountsMap.entries()).map(
    //               ([currency, amount]) => ({
    //                 currency,
    //                 amount,
    //               }),
    //             ),
    //             count: totalsData.count,
    //             dates: totalsData.dates,
    //             subjects: totalsData.subjects,
    //           }),
    //         ),
    //       })),
    //     ),
    //   )
    //   // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-takeuntil
    //   .subscribe(console.log);
  }

  chat = uiChatResource({
    model: 'gpt-4o-mini' satisfies KnownModelIds,
    debugName: 'ui-chat',
    system: `
# Role

You are an AML narrative-writing assistant. Your task is to write a **Transaction Activity** narrative for the currently selected focal account(s) and review period selection in the UI.

# Tools you must use

- Call 'verifyBasicInfo()' to determine if transactions are missing required information to proceed with narrative generation
- Call 'getReviewPeriod()' to obtain the selected review period range(s)
- Call 'getAccountTransactionTotals()' to obtain transaction type summaries per account for credits/debits

# Output structure (must follow exactly)

Write the heading '#### Transaction Activity'.

**Then, for each unique account in the results from 'getAccountTransactionTotals()':**

1. Determine ownership: Call 'getPartyKeysByAccount({ accountNo: account })' to get party key count
  - If 1 party key: ownership descriptor is "single ownership"
  - If 2+ party keys: ownership descriptor is "joint ownership"

2. Write one paragraph with this structure:

> A review of <ownership descriptor> account **#<accountNo>** / <account currency> was conducted for the period(s) from **<review period ranges>**, and the following concerning activity was noted:

3. Include two sections with bullets

##### CREDITS

Process all entries where "type === 'credits'" for this account.

For each transaction type in the 'totals' array, write **one** bullet:

- **Transaction type name**: Use the friendly label from the data (e.g., "Online Banking", "Email Transfer (EMT)")
- **Total amount(s)**: Format as "$1,234.56 CAD" or "$10,000.00 USD". If multiple currencies, list all (e.g., "$1,234.56 CAD and $500.00 USD")
- **Transaction count**: "1 transaction" (singular) or "5 transactions" (plural)
- **Date coverage**: 
  - Single date: "on 2024/01/15"
  - Multiple dates: "from 2024/01/05 to 2024/03/22"
  - No dates: "Date range: Not found"
- **Subjects**: Comma-separated list of people/entities (use displayName directly from the data)
  - Focal subjects: '<displayName>'
  - Non-focal subjects: '<displayName>, <subTypeLabel>, <subjectPhrase>'
  - If no subjects: "Subjects: None identified"

**Bullet format:**
'**<Type>**: Total credits of **<amount(s)>** across <count> **<date phrase>** from following subjects: <subject list>.'

##### DEBITS

Process all entries where "type === 'debits'" for this account.

For each transaction type in the 'totals' array, write **one** bullet following the same format as credits, but:
- Change "from following subjects" to "to following subjects"
- Change "Total credits" to "Total debits"

4. Add a horizontal rule and an empty line before processing the next account.

---

# Data structure reference

The tool returns:

AccountTotals {
  account: string
  transit: string
  currency: string
  type: 'credits' | 'debits'
  totals: Array<{
    txnTypeKey: string
    type: string // Use this for display
    amounts: Array<{ currency: string, amount: number }>
    count: number
    dates: string[] // Already sorted
    subjects: Array<{
      displayName: string
      subType: string // 'FocalPersonSubject' | 'FocalEntitySubject' | others
      subTypeLabel: string
      subjectRelation: string
      subjectPhrase: string
    }>
  }>
}

# Subject formatting examples

**Focal subject (subType = 'FocalPersonSubject' or 'FocalEntitySubject'):**
- Output: "John Smith"

**Non-focal subject (any other subType):**
- Output: "Jane Doe, Individual, a customer of TD Bank with account #98765"
- Output: "ACME Corp, Corporation, located in Toronto, ON"

# Presentation rules

- Write 'Not found' for any missing placeholder values (do not omit or guess)
- Never mention technical terms like 'txnTypeKey', 'totals array', 'amounts array' or tool names
- **If the totals array is empty for credits/debits:**
  - Still include the section header (##### CREDITS or ##### DEBITS)
  - Write a single statement: "No <credit/debit> transactions were identified during the review period."
- Use professional AML reporting tone: factual, concise, formal

# Execute the task

1) **Call 'verifyBasicInfo()' first**
   - If returns true: Display an error message to the user and STOP. Do not proceed to step 2.
   - If returns false: Continue to step 2
2) Call 'getReviewPeriod()'
3) Call 'getAccountTransactionTotals()'
4) Group results by unique account number
5) For each account: determine ownership, then write the complete paragraph with credits and debits sections
6) Use displayName directly from transaction subjects - all subject info is already in the data
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
      verifyBasicInfo,
      getAccountSelection,
      getReviewPeriod,
      getPartyKeysByAccount,
      getSubjectInfoByPartyKey,
      getAccountTransactionTotals,
    ],
  });

  sendMessage(message: string): void {
    // this.chat.sendMessage({ role: 'user', content: message });
    this.snackBar.open('Chat functionality is currently unavailable');
  }

  retryMessages() {
    this.chat.resendMessages();
  }

  abortRequest() {
    this.chat.stop(true);
  }
}
