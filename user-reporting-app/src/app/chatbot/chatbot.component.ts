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
  checkDataIntegrity,
  getAccountTransactionTotals,
  getPartyKeysByAccount,
  getReviewPeriod,
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
        <div class="chat-messages overflow-y-scroll" #contentDiv>
          <app-chat-messages
            [messages]="chat.value()"
            (retry)="retryMessages()" />
          <app-chat-prompts (selectPrompt)="sendMessage($event)" />
        </div>
        <!-- <app-chat-composer
          [isLoading]="chat.isLoading()"
          (sendMessage)="sendMessage($event)"
          (abortSearch)="abortRequest()"></app-chat-composer> -->
        <app-chat-composer
          [isLoading]="chat.isLoading()"
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

# Output structure (must follow exactly)

> **Template conventions**
> - **[ ]** denotes an optional segment — evaluate the inline condition to determine inclusion; omit entirely (including surrounding whitespace) if the condition is false

1. Write the heading '#### Transaction Activity'.

**Then, for each unique account in the results from '${getAccountTransactionTotals.name}()':**

2. Write one paragraph with this structure:

**ACCOUNT NARRATIVE OPENER template**:

> A review of <ownership descriptor> account **#<accountNo>** / <account currency> was conducted for the period(s) **<review period ranges>**, and the following concerning activity was noted:


**ACCOUNT NARRATIVE OPENER placeholder definitions**:

- **<ownership descriptor>**: Call '${getPartyKeysByAccount.name}()' with <accountNo> to get party key count:
  - If 1 party key: ownership descriptor is "single ownership"
  - If 2+ party keys: ownership descriptor is "joint ownership"
- **<review period ranges>**: Format each range as "YYYY/MM/DD to YYYY/MM/DD"; if multiple ranges, join with ", and"

3. Include CREDITS and DEBITS sections containing a bullet point for each transaction type

##### CREDITS

Process the entry where "totalsType === 'credits'" for this account.

For each transaction type in the 'totalsList' array, write **one** transaction totals bullet.

**TRANSACTION TOTALS BULLET**:

'- <transaction_type>: Total credits of <amount(s)> across <count> <date_phrase>[subjects.length > 0: from <sub_types_phrase>: <subject_list>].'

**TRANSACTION TOTALS BULLET placeholder definitions**:

- **<transaction_type>**: Use the friendly label from the data (e.g., "Online Banking", "Email Transfer (EMT)")
- **<credit_or_debit>**:
  - If this section is CREDITS output: "credits"
  - Else if this section is DEBITS output: "debits"
- **<amount(s)>**: Format as "$1,234.56 CAD" or "$10,000.00 USD". If multiple currencies, list all (e.g., "$1,234.56 CAD and $500.00 USD")
- **<count>**: "1 transaction" (singular) or "5 transactions" (plural)
- **<date_phrase>**:
  - If the transaction type is **Cheque**:
    - Single date: "on 2024/01/15"
    - Multiple dates: list **every** date individually, comma-separated
      - Example: "on 2024/01/05, 2024/01/10, 2024/03/22"
  - All other transaction types:
    - Single date: "on 2024/01/15"
    - Multiple dates: "from 2024/01/05 to 2024/03/22"
- **<sub_types_phrase>**:
  - If Subject types are merchants only output: "the following merchant(s)"
  - Else output: "the following subject(s)"
- **<subject_list>**: Comma-separated list formatted based on subType:
  - **Merchant**: "<displayName>" only
    - Example: "Tim Hortons"
  - **PersonSubject**: "<displayName>, <subTypeLabel>, <subjectPhrase>"
    - Example: "Jane Doe, an individual, a customer of TD Bank with account #98765"
  - **EntitySubject**: "<displayName>, <subTypeLabel>, <subjectPhrase>"
    - Example: "ACME Corp, a business/entity, located in Toronto, ON"
  - **Other subTypes**: "<displayName>, <subTypeLabel>, <subjectPhrase>"

##### DEBITS

Process the entry where "totalsType === 'debits'" for this account.

For each transaction type in the 'totalsList' array, write **one** transaction totals bullet.

**TRANSACTION TOTALS BULLET**:

'<transaction_type>: Total debits of <amount(s)> across <count> <date_phrase>[subjects.length > 0: to <sub_types_phrase>: <subject_list>].'

> These placeholder definitions: <transaction_type>, <amount(s)>, <count>, <date_phrase>, <sub_types_phrase>, <subject_list> follow the same rules as defined under CREDITS above.

4. Add a horizontal rule and an empty line before processing the next account.

---

# Data structure reference

The '${getAccountTransactionTotals.name}()' tool returns:

Array<{
  account: string
  transit: string
  currency: string
  totalsType: 'credits' | 'debits'
  totalsList: Array<{
    txnTypeKey: string
    transactionType: string // Use this for display
    amountsList: Array<{ currency: string, amount: number }>
    count: number
    dates: string[] // Already sorted
    subjects: Array<{
      displayName: string
      subType: string // PersonSubject, EntitySubject, Merchant, others
      subTypeLabel: string
      subjectRelation: string
      subjectPhrase: string
    }>
  }>
}>

# Presentation rules

- Write 'Not found' for any missing placeholder values (do not omit or guess)
- Never mention technical terms like 'txnTypeKey', 'totalsList array', 'amountLists array' or tool names
- **Only invoke tools where explicitly instructed within the placeholder definitions in '# Output structure'.**
- If the totalsList array is empty for credits/debits:
  - Still include the section header (##### CREDITS or ##### DEBITS)
  - Use this bullet format instead: "No <credit_or_debit> transactions were identified during the review period."
- Use professional AML reporting tone: factual, concise, formal

# Execute the task

1) **Call '${checkDataIntegrity.name}()' first**
   - If returns false: Under suitable header of size #### display a failed integrity check message to the user and STOP. Do not proceed to step 2.
   - If returns true: Continue to step 2
2) Follow '# Output structure' to produce the narrative.
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
      checkDataIntegrity,
      getReviewPeriod,
      getPartyKeysByAccount,
      getAccountTransactionTotals,
    ],
  });

  sendMessage(message: string): void {
    this.chat.sendMessage({ role: 'user', content: message });
    // this.totalsService
    //   .getAccountTransactionTotals$()
    //   .pipe(tap((val) => console.log(val)))
    //   // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe, rxjs-angular-x/prefer-takeuntil
    //   .subscribe();
  }

  retryMessages() {
    this.chat.resendMessages();
  }

  abortRequest() {
    this.chat.stop(true);
  }
}
