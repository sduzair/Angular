import { METHOD_FRIENDLY_NAME } from '../txn-method-breakdown/txn-method-breakdown.component';
import {
  CATEGORY_ENUM,
  formatCurrencyLocal,
  getCategory,
  GraphNode,
} from './circular.component';

/**
 * Copy node data to clipboard
 */
export function getNodeDataTextToCopy(node: GraphNode) {
  const displayData = extractNodeDisplayData(node);
  const text = formatNodeDataAsText(displayData);
  return text;
}

/**
 * Extract display data from node - single source of truth
 */
export function extractNodeDisplayData(node: GraphNode): NodeDisplayData {
  const data: NodeDisplayData = {
    title: '',
    description: '',
    type: getCategory(node.category as number),
    sections: [],
    methodBreakdown: [],
  };

  if (node.nodeType === 'account' && node.category == CATEGORY_ENUM.Account) {
    data.title = `Account: ${node.account}`;
    data.description =
      'This is a specific account owned by an external subject who transacted with the focal client.';
  }
  if (
    node.nodeType === 'account' &&
    node.category == CATEGORY_ENUM.FocalAccount
  ) {
    data.title = `Account: ${node.account}`;
    data.description =
      'This account belongs to the focal client (the primary entity under investigation). ' +
      'Deposits represent incoming cash flows that increased the account balance. ' +
      'Withdrawals represent outgoing cash flows that decreased the account balance. ' +
      'Net shows the overall change in account balance (positive means more money came in than went out).';

    data.sections = [
      {
        header: 'Cash',
        items: [
          {
            label: 'Deposits',
            value: formatCurrencyLocal(node.rawCredit),
            color: '#52c41a',
            icon: '←',
          },
          {
            label: 'Withdrawals',
            value: formatCurrencyLocal(node.rawDebit),
            color: '#f5222d',
            icon: '→',
          },
          {
            label: 'Net',
            value: formatCurrencyLocal(node.rawCredit - node.rawDebit),
            color: '#999',
            icon: '',
          },
        ],
      },
    ];
  }

  if (
    node.nodeType === 'subject' &&
    (node.category === CATEGORY_ENUM.FocalEntitySubject ||
      node.category === CATEGORY_ENUM.FocalPersonSubject)
  ) {
    data.title = node.name;
    data.description =
      'This is the focal subject - the primary person or entity under investigation. ' +
      'The amounts shown represent the aggregate financial activity of this focal subject with all external parties. ' +
      'Received: Total amount the focal subject received FROM all external subjects and entities across all transactions. ' +
      'Sent: Total amount the focal subject sent TO all external subjects and entities across all transactions. ' +
      'Net: The overall financial position (positive means the focal subject received more than they sent out, negative means they sent out more than received). ' +
      'Transaction Method Breakdown shows how these total amounts are distributed across different payment methods.';

    data.sections = [
      {
        header: 'Focal Client',
        items: [
          {
            label: 'Received',
            value: formatCurrencyLocal(node.rawCredit),
            color: '#52c41a',
            icon: '←',
          },
          {
            label: 'Sent',
            value: formatCurrencyLocal(node.rawDebit),
            color: '#f5222d',
            icon: '→',
          },
          {
            label: 'Net',
            value: formatCurrencyLocal(node.rawCredit - node.rawDebit),
            color: '#999',
            icon: '',
          },
        ],
      },
    ];

    // Add method breakdown
    data.methodBreakdown = extractMethodBreakdownData(
      node.creditsByMethod,
      node.debitsByMethod,
    );
  }

  if (
    node.nodeType === 'subject' &&
    node.category !== CATEGORY_ENUM.FocalEntitySubject &&
    node.category !== CATEGORY_ENUM.FocalPersonSubject
  ) {
    data.title = node.name;
    data.description =
      'This is an external subject (third-party person or entity) that transacted with the focal client. ' +
      'The amounts represent the total financial relationship between the focal client and this external party. ' +
      'Received: Total amount the focal client received FROM this external subject across all transaction methods. ' +
      'Sent: Total amount the focal client sent TO this external subject across all transaction methods. ' +
      'Net: The net position (positive indicates focal client received more, negative indicates focal client sent more). ' +
      'Transaction Method Breakdown shows how these amounts were split across different payment methods (wire, check, cash, etc.).';

    data.sections = [
      {
        header: 'Focal Client',
        items: [
          {
            label: 'Received',
            value: formatCurrencyLocal(node.rawCredit),
            color: '#52c41a',
            icon: '←',
          },
          {
            label: 'Sent',
            value: formatCurrencyLocal(node.rawDebit),
            color: '#f5222d',
            icon: '→',
          },
          {
            label: 'Net',
            value: formatCurrencyLocal(node.rawCredit - node.rawDebit),
            color: '#999',
            icon: '',
          },
        ],
      },
    ];

    // Add method breakdown
    data.methodBreakdown = extractMethodBreakdownData(
      node.creditsByMethod,
      node.debitsByMethod,
    );
  }

  return data;
}

/**
 * Extract method breakdown data
 */
function extractMethodBreakdownData(
  creditsByMethod: Record<number, number>,
  debitsByMethod: Record<number, number>,
): { method: string; received?: string; sent?: string }[] {
  const creditKeys = Object.keys(creditsByMethod).map(Number);
  const debitKeys = Object.keys(debitsByMethod).map(Number);
  const allMethods = new Set([...creditKeys, ...debitKeys]);

  if (allMethods.size === 0) return [];

  // Sort by total amount
  const methodsWithTotals = Array.from(allMethods)
    .map((method) => {
      const received = creditsByMethod[method] ?? 0;
      const sent = debitsByMethod[method] ?? 0;
      return { method, received, sent, total: received + sent };
    })
    .sort((a, b) => b.total - a.total);

  return methodsWithTotals
    .filter(({ received, sent }) => received > 0 || sent > 0)
    .map(({ method, received, sent }) => ({
      method: METHOD_FRIENDLY_NAME[method] ?? 'Unknown',
      received: received > 0 ? formatCurrencyLocal(received) : undefined,
      sent: sent > 0 ? formatCurrencyLocal(sent) : undefined,
    }));
}

/**
 * Format display data as HTML
 */
export function formatNodeDataAsHtml(data: NodeDisplayData): string {
  let html = `<strong>${data.title}</strong><br/>`;
  html += `Type: ${data.type}<br/>`;

  if (data.sections && data.sections.length > 0) {
    data.sections.forEach((section) => {
      html += `<hr style="margin: 4px 0"/>`;

      if (section.header) {
        html += `<strong>${section.header}:</strong><br/>`;
      }

      section.items.forEach((item) => {
        html += `<span style="font-size: 12px; color: ${item.color || '#333'};">`;
        if (item.icon) {
          html += `  ${item.icon} `;
        }
        html += `${item.label}: ${item.value}`;
        html += `</span><br/>`;
      });
    });
  }

  if (data.methodBreakdown && data.methodBreakdown.length > 0) {
    html += `<hr style="margin: 6px 0; border-color: #ddd"/>`;
    html += `<strong>Transaction Method Breakdown:</strong><br/>`;

    data.methodBreakdown.forEach((methodData) => {
      html += `<div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid #e8e8e8;">`;
      html += `<strong style="font-size: 12px; color: #333;">${methodData.method}</strong><br/>`;

      if (methodData.received) {
        html += `<span style="font-size: 12px; color: #52c41a;">`;
        html += `  ← Received: ${methodData.received}`;
        html += `</span><br/>`;
      }

      if (methodData.sent) {
        html += `<span style="font-size: 12px; color: #f5222d;">`;
        html += `  → Sent: ${methodData.sent}`;
        html += `</span><br/>`;
      }

      html += `</div>`;
    });
  }

  return html;
}

/**
 * Format display data as plain text
 */
function formatNodeDataAsText(data: NodeDisplayData): string {
  let text = `${data.title}\n`;
  text += `Type: ${data.type}\n`;

  if (data.sections && data.sections.length > 0) {
    data.sections.forEach((section) => {
      if (section.header) {
        text += `\n${section.header}:\n`;
      }

      section.items.forEach((item) => {
        if (item.icon) {
          text += `  ${item.icon} `;
        }
        text += `${item.label}: ${item.value}\n`;
      });
    });
  }

  if (data.methodBreakdown && data.methodBreakdown.length > 0) {
    text += `\nTransaction Method Breakdown:\n`;

    data.methodBreakdown.forEach((methodData) => {
      text += `\n${methodData.method}:\n`;

      if (methodData.received) {
        text += `  Received: ${methodData.received}\n`;
      }

      if (methodData.sent) {
        text += `  Sent: ${methodData.sent}\n`;
      }
    });
  }

  return text.trim();
}

// Define the data structure
interface NodeDisplayData {
  title: string;
  description: string;
  type: string;
  sections?: {
    header?: string;
    items: {
      label: string;
      value: string;
      color?: string;
      icon?: string;
    }[];
  }[];
  methodBreakdown?: {
    method: string;
    received?: string;
    sent?: string;
  }[];
}
