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
    type: getCategory(node.category as number),
    sections: [],
    methodBreakdown: [],
  };

  if (node.nodeType === 'account') {
    data.title = `Account: ${node.account}`;

    if (node.category !== CATEGORY_ENUM.Account) {
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
  }

  if (node.nodeType === 'subject') {
    data.title = node.name;

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
