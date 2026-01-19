import { METHOD_FRIENDLY_NAME, NODE_ENUM } from '../account-methods.service';
import {
  formatCurrencyLocal,
  getNodeName,
  GraphNode,
  MethodAmount,
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
  if (node.nodeType === 'account' && node.category == NODE_ENUM.Account) {
    const data: NodeDisplayData = {
      title: `Account: ${node.account}`,
      // description:
      //   'This is a specific account owned by an external subject who transacted with the focal client.',
      category: node.category as number,
      categoryName: getNodeName(node.category as number),
      transit: node.transit,
      account: node.account,
      sections: [],
      methodBreakdown: [],
    };
    return data;
  }
  if (node.nodeType === 'account' && node.category == NODE_ENUM.FocalAccount) {
    const data: NodeDisplayData = {
      title: `Account: ${node.account}`,
      // description:
      //   'This account belongs to the focal client (the primary entity under investigation). ',
      category: node.category as number,
      categoryName: getNodeName(node.category as number),
      transit: node.transit,
      account: node.account,
      sections: [],
      // Add method breakdown includes only cash
      methodBreakdown: extractMethodBreakdownData(
        node.creditsByMethod,
        node.debitsByMethod,
      ),
    };
    return data;
  }

  if (node.nodeType === 'subject') {
    const data: NodeDisplayData = {
      title: node.subjectName,
      // description:
      //   'This is the focal subject - the primary person or entity under investigation. ',
      category: node.category as number,
      categoryName: getNodeName(node.category as number),
      transit: node.relatedTransit,
      account: node.relatedAccount,
      sections: [
        {
          header: 'Summary',
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
      ],
      // Add method breakdown
      methodBreakdown: extractMethodBreakdownData(
        node.creditsByMethod,
        node.debitsByMethod,
      ),
    };
    return data;
  }

  throw new Error('Unkonwn node type');
}

/**
 * Extract method breakdown data
 */
function extractMethodBreakdownData(
  creditsByMethod: MethodAmount,
  debitsByMethod: MethodAmount,
): MethodBreakDown[] {
  const creditKeys = Object.keys(creditsByMethod).map(Number);
  const debitKeys = Object.keys(debitsByMethod).map(Number);
  const allMethods = new Set([...creditKeys, ...debitKeys]);

  if (allMethods.size === 0) return [];

  // Sort by total amount
  const methodsWithTotals = Array.from(allMethods)
    .map((method) => {
      const received = creditsByMethod[method]?.amount ?? 0;
      const sent = debitsByMethod[method]?.amount ?? 0;
      return {
        method,
        received,
        sent,
        total: received + sent,
        receivedCount: creditsByMethod[method]?.count,
        sentCount: debitsByMethod[method]?.count,
      };
    })
    .sort((a, b) => b.total - a.total);

  return methodsWithTotals
    .filter(({ received, sent }) => received > 0 || sent > 0)
    .map(({ method, received, sent, receivedCount, sentCount }) => ({
      method:
        METHOD_FRIENDLY_NAME[method as keyof typeof METHOD_FRIENDLY_NAME] ??
        'Unknown',
      received: received > 0 ? formatCurrencyLocal(received) : undefined,
      sent: sent > 0 ? formatCurrencyLocal(sent) : undefined,
      receivedCount,
      sentCount,
    }));
}

/**
 * Format display data as HTML
 */
export function formatNodeDataAsHtml(data: NodeDisplayData): string {
  let html = `<strong>${data.title}</strong><br/>`;
  html += `Type: ${data.categoryName}<br/>`;
  html += data.transit ? `Transit: ${data.transit}<br/>` : '';
  html += data.account ? `Account: ${data.account}<br/>` : '';

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
        if (methodData.receivedCount) {
          html += ` (${methodData.receivedCount} tx)`;
        }
        html += `</span><br/>`;
      }

      if (methodData.sent) {
        html += `<span style="font-size: 12px; color: #f5222d;">`;
        html += `  → Sent: ${methodData.sent}`;
        if (methodData.sentCount) {
          html += ` (${methodData.sentCount} tx)`;
        }
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
function formatNodeDataAsText(data: NodeDisplayData | undefined): string {
  if (!data) return '';
  let text = `${data.title}\n`;
  text += `Type: ${data.categoryName}\n`;
  text += data.transit ? `Transit: ${data.transit}\n` : '';
  text += data.account ? `Account: ${data.account}\n` : '';

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
        text += `  Received: ${methodData.received}`;
        if (methodData.receivedCount) {
          text += ` (${methodData.receivedCount} tx)`;
        }
        text += '\n';
      }

      if (methodData.sent) {
        text += `  Sent: ${methodData.sent}`;
        if (methodData.sentCount) {
          text += ` (${methodData.sentCount} tx)`;
        }
        text += '\n';
      }
    });
  }

  return text.trim();
}

// Define the data structure
export interface NodeDisplayData {
  title: string;
  // description: string;
  category: number;
  categoryName: string;
  transit?: string | null;
  account?: string | null;
  sections?: {
    header?: string;
    items: {
      label: string;
      value: string;
      color?: string;
      icon?: string;
    }[];
  }[];
  methodBreakdown?: MethodBreakDown[];
}

interface MethodBreakDown {
  method: string;
  received?: string;
  sent?: string;
  receivedCount?: number;
  sentCount?: number;
}
