import {
  PartyAccount,
  PartyAddress,
  PartyContact,
  PartyIdentifiers,
  PartyName,
  PartySourceSystem,
} from '../../transaction-view/transform-to-str-transaction/party-gen.service';
import {
  NODE_ENUM,
  TRANSACTION_TYPE_FRIENDLY_NAME,
} from '../account-methods.service';
import {
  formatCurrencyLocal,
  getNodeName,
  GraphNode,
  TxnTypeAmount,
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
      category: node.category as number,
      categoryName: getNodeName(node.category as number),
      transit: node.transit,
      account: node.account,
    };
    return data;
  }
  if (node.nodeType === 'account' && node.category == NODE_ENUM.FocalAccount) {
    const data: NodeDisplayData = {
      title: `Account: ${node.account}`,
      category: node.category as number,
      categoryName: getNodeName(node.category as number),
      transit: node.transit,
      account: node.account,
    };
    return data;
  }

  if (node.nodeType === 'subject') {
    const {
      partyIdentifier,
      sourceSystem,
      identifiers,
      account,
      partyName,
      contact,
      address,
    } = node.partyInfo;

    const data: NodeDisplayData = {
      title: node.displayName,
      category: node.category as number,
      categoryName: getNodeName(node.category as number),

      partyInfo: {
        partyIdentifier,
        sourceSystem,
        identifiers,
        account,
        partyName,
        contact,
        address,
      },

      currencyTotals: {
        ...aggregateCurrencyTotals({
          creditsByTxnType: node.creditsByTxnType,
          debitsByTxnType: node.debitsByTxnType,
        }),
      },
      currencyTotalsByTxnType: aggregateCurrencyTotalsByTxnType({
        creditsByTxnType: node.creditsByTxnType,
        debitsByTxnType: node.debitsByTxnType,
      }),
    };
    return data;
  }

  throw new Error('Unknown node type');
}

/**
 * Aggregate all currencies by transaction type
 */
function aggregateCurrencyTotalsByTxnType({
  creditsByTxnType,
  debitsByTxnType,
}: {
  creditsByTxnType: TxnTypeAmount;
  debitsByTxnType: TxnTypeAmount;
}): TxnTypeCurrencyTotals[] {
  const creditKeys = Object.keys(creditsByTxnType).map(Number);
  const debitKeys = Object.keys(debitsByTxnType).map(Number);
  const allMethods = new Set([...creditKeys, ...debitKeys]);

  if (allMethods.size === 0) return [];

  return Array.from(allMethods)
    .map((method) => {
      // Group credits by currency
      const receivedMapByCurr = new Map<
        string,
        { amount: number; count: number }
      >();
      (creditsByTxnType[method] ?? []).forEach((item) => {
        const existing = receivedMapByCurr.get(item.currency) ?? {
          amount: 0,
          count: 0,
        };
        existing.amount += item.amount;
        existing.count += 1;
        receivedMapByCurr.set(item.currency, existing);
      });

      // Group debits by currency
      const sentMapByCurr = new Map<
        string,
        { amount: number; count: number }
      >();
      (debitsByTxnType[method] ?? []).forEach((item) => {
        const existing = sentMapByCurr.get(item.currency) ?? {
          amount: 0,
          count: 0,
        };
        existing.amount += item.amount;
        existing.count += 1;
        sentMapByCurr.set(item.currency, existing);
      });

      // Calculate total for sorting
      const _totalReceived = Array.from(receivedMapByCurr.values()).reduce(
        (sum, curr) => sum + curr.amount,
        0,
      );
      const _totalSent = Array.from(sentMapByCurr.values()).reduce(
        (sum, curr) => sum + curr.amount,
        0,
      );

      return {
        txnType:
          TRANSACTION_TYPE_FRIENDLY_NAME[
            method as keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME
          ] ?? 'Unknown',
        receivedByCurrency: Array.from(receivedMapByCurr.entries()).map(
          ([currency, data]) => ({
            currency,
            amount: formatCurrencyLocal(data.amount),
            count: data.count,
          }),
        ),
        sentByCurrency: Array.from(sentMapByCurr.entries()).map(
          ([currency, data]) => ({
            currency,
            amount: formatCurrencyLocal(data.amount),
            count: data.count,
          }),
        ),
        _total: _totalReceived + _totalSent,
      } satisfies TxnTypeCurrencyTotals;
    })
    .sort((a, b) => b._total - a._total)
    .filter(
      ({ receivedByCurrency, sentByCurrency }) =>
        receivedByCurrency.length > 0 || sentByCurrency.length > 0,
    );
}

/**
 * Aggregate all currencies across all transaction types
 */
function aggregateCurrencyTotals({
  creditsByTxnType,
  debitsByTxnType,
}: {
  creditsByTxnType: TxnTypeAmount;
  debitsByTxnType: TxnTypeAmount;
}): {
  receivedByCurrency: { currency: string; amount: string; count: number }[];
  sentByCurrency: { currency: string; amount: string; count: number }[];
} {
  // Aggregate all credits by currency across all transaction types
  const receivedMap = new Map<string, { amount: number; count: number }>();
  Object.values(creditsByTxnType).forEach((items) => {
    (items ?? []).forEach((item) => {
      const existing = receivedMap.get(item.currency) ?? {
        amount: 0,
        count: 0,
      };
      existing.amount += item.amount;
      existing.count += 1;
      receivedMap.set(item.currency, existing);
    });
  });

  // Aggregate all debits by currency across all transaction types
  const sentMap = new Map<string, { amount: number; count: number }>();
  Object.values(debitsByTxnType).forEach((items) => {
    (items ?? []).forEach((item) => {
      const existing = sentMap.get(item.currency) ?? { amount: 0, count: 0 };
      existing.amount += item.amount;
      existing.count += 1;
      sentMap.set(item.currency, existing);
    });
  });

  return {
    receivedByCurrency: Array.from(receivedMap.entries())
      .map(([currency, data]) => ({
        currency,
        amount: formatCurrencyLocal(data.amount),
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count), // Sort by transaction count
    sentByCurrency: Array.from(sentMap.entries())
      .map(([currency, data]) => ({
        currency,
        amount: formatCurrencyLocal(data.amount),
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Format display data as HTML
 */
export function formatNodeDataAsHtml(data: NodeDisplayData): string {
  let html = `<strong>${data.title}</strong><br/>`;
  html += `<span style="font-size: 13px;">Type: ${data.categoryName}</span><br/>`;
  if (data.transit)
    html += `<span style="font-size: 13px;">Transit: ${data.transit}</span><br/>`;
  if (data.account)
    html += `<span style="font-size: 13px;">Account: ${data.account}</span><br/>`;

  // Party Info Section (subjects only)
  if (data.partyInfo) {
    const { account, identifiers, contact, address } = data.partyInfo;
    // Party Name - title

    // Party Account
    if (account) {
      if (account.accountNumber) {
        html += `<span style="font-size: 13px;">Acct #: ${account.accountNumber}`;
        if (account.transitNumber)
          html += ` (Transit: ${account.transitNumber})`;
        if (account.currency) html += ` [${account.currency}]`;
        html += `</span><br/>`;
      }
      if (account.fiNumber)
        html += `<span style="font-size: 13px;">FI: ${account.fiNumber}</span><br/>`;
      if (account.accountName)
        html += `<span style="font-size: 13px;">Acct Name: ${account.accountName}</span><br/>`;
    }

    // Party Identifiers
    if (identifiers) {
      if (identifiers.partyKey)
        html += `<span style="font-size: 13px;">Party Key: ${identifiers.partyKey}</span><br/>`;
      if (identifiers.certapayAccount)
        html += `<span style="font-size: 13px;">Certapay: ${identifiers.certapayAccount}</span><br/>`;
      // if (identifiers.msgTag50)
      //   html += `<span style="font-size: 13px;">Tag 50: ${identifiers.msgTag50}</span><br/>`;
      // if (identifiers.msgTag59)
      //   html += `<span style="font-size: 13px;">Tag 59: ${identifiers.msgTag59}</span><br/>`;
      if (identifiers.cardNumber)
        html += `<span style="font-size: 13px;">Card: ${identifiers.cardNumber}</span><br/>`;
    }

    // Party Contact
    if (contact) {
      if (contact.email)
        html += `<span style="font-size: 13px;">Email: ${contact.email}</span><br/>`;
      if (contact.phone)
        html += `<span style="font-size: 13px;">Phone: ${contact.phone}</span><br/>`;
      if (contact.mobile)
        html += `<span style="font-size: 13px;">Mobile: ${contact.mobile}</span><br/>`;
      if (contact.handleUsed)
        html += `<span style="font-size: 13px;">Handle: ${contact.handleUsed}</span><br/>`;
    }

    // Party Address
    if (address) {
      if (address.rawAddress) {
        html += `<span style="font-size: 13px;">Address: ${address.rawAddress}</span><br/>`;
      } else {
        const addressParts = [
          address.street,
          address.city,
          address.provinceState,
          address.postalCode,
          address.country,
        ].filter(Boolean);
        if (addressParts.length > 0)
          html += `<span style="font-size: 13px;">Address: ${addressParts.join(', ')}</span><br/>`;
      }
    }
  }

  if (data.currencyTotals) {
    const { receivedByCurrency, sentByCurrency } = data.currencyTotals;

    html += `<hr style="margin: 4px 0"/>`;

    if (receivedByCurrency.length > 0 || sentByCurrency.length > 0)
      html += `<strong>Summary:</strong><br/>`;

    // Display received currency totals
    if (receivedByCurrency.length > 0) {
      receivedByCurrency.forEach((currencyData) => {
        html += `<span style="font-size: 13px; color: #52c41a;">`;
        html += `  ← Received: ${currencyData.amount} ${currencyData.currency}`;
        html += ` (${currencyData.count} tx)`;
        html += `</span><br/>`;
      });
    }

    // Display sent currency totals
    if (sentByCurrency.length > 0) {
      sentByCurrency.forEach((currencyData) => {
        html += `<span style="font-size: 13px; color: #f5222d;">`;
        html += `  → Sent: ${currencyData.amount} ${currencyData.currency}`;
        html += ` (${currencyData.count} tx)`;
        html += `</span><br/>`;
      });
    }
  }

  if (data.currencyTotalsByTxnType && data.currencyTotalsByTxnType.length > 0) {
    html += `<hr style="margin: 6px 0; border-color: #ddd"/>`;
    html += `<strong>Transaction Method Breakdown:</strong><br/>`;

    data.currencyTotalsByTxnType.forEach((methodData) => {
      html += `<div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid #e8e8e8;">`;
      html += `<strong style="font-size: 13px; color: #333;">${methodData.txnType}</strong><br/>`;

      if (methodData.receivedByCurrency.length > 0) {
        methodData.receivedByCurrency.forEach((currencyData) => {
          html += `<span style="font-size: 13px; color: #52c41a;">`;
          html += `  ← Received: ${currencyData.amount} ${currencyData.currency}`;
          html += ` (${currencyData.count} tx)`;
          html += `</span><br/>`;
        });
      }

      if (methodData.sentByCurrency.length > 0) {
        methodData.sentByCurrency.forEach((currencyData) => {
          html += `<span style="font-size: 13px; color: #f5222d;">`;
          html += `  → Sent: ${currencyData.amount} ${currencyData.currency}`;
          html += ` (${currencyData.count} tx)`;
          html += `</span><br/>`;
        });
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
  if (data.transit) text += `Transit: ${data.transit}\n`;
  if (data.account) text += `Account: ${data.account}\n`;

  // Party Info Section (subjects only)
  if (data.partyInfo) {
    const { account, identifiers, contact, address } = data.partyInfo;
    // Party Name - title

    // Party Account
    if (account) {
      if (account.accountNumber) {
        text += `Acct #: ${account.accountNumber}`;
        if (account.transitNumber)
          text += ` (Transit: ${account.transitNumber})`;
        if (account.currency) text += ` [${account.currency}]`;
        text += `\n`;
      }
      if (account.fiNumber) text += `FI: ${account.fiNumber}\n`;
      if (account.accountName) text += `Acct Name: ${account.accountName}\n`;
    }

    // Party Identifiers
    if (identifiers) {
      if (identifiers.partyKey) text += `Party Key: ${identifiers.partyKey}\n`;
      if (identifiers.certapayAccount)
        text += `Certapay: ${identifiers.certapayAccount}\n`;
      // if (identifiers.msgTag50) text += `Tag 50: ${identifiers.msgTag50}\n`;
      // if (identifiers.msgTag59) text += `Tag 59: ${identifiers.msgTag59}\n`;
      if (identifiers.cardNumber) text += `Card: ${identifiers.cardNumber}\n`;
    }

    // Party Contact
    if (contact) {
      if (contact.email) text += `Email: ${contact.email}\n`;
      if (contact.phone) text += `Phone: ${contact.phone}\n`;
      if (contact.mobile) text += `Mobile: ${contact.mobile}\n`;
      if (contact.handleUsed) text += `Handle: ${contact.handleUsed}\n`;
    }

    // Party Address
    if (address) {
      if (address.rawAddress) {
        text += `Address: ${address.rawAddress}\n`;
      } else {
        const addressParts = [
          address.street,
          address.city,
          address.provinceState,
          address.postalCode,
          address.country,
        ].filter(Boolean);
        if (addressParts.length > 0) {
          text += `Address: ${addressParts.join(', ')}\n`;
        }
      }
    }
  }

  if (data.currencyTotals) {
    const { receivedByCurrency, sentByCurrency } = data.currencyTotals;

    if (receivedByCurrency.length > 0 || sentByCurrency.length > 0) {
      text += `\nSummary:\n`;
    }

    receivedByCurrency.forEach((currencyData) => {
      text += `  ← Received: ${currencyData.amount} ${currencyData.currency} (${currencyData.count} tx)\n`;
    });

    sentByCurrency.forEach((currencyData) => {
      text += `  → Sent: ${currencyData.amount} ${currencyData.currency} (${currencyData.count} tx)\n`;
    });
  }

  if (data.currencyTotalsByTxnType && data.currencyTotalsByTxnType.length > 0) {
    text += `\nTransaction Method Breakdown:\n`;

    data.currencyTotalsByTxnType.forEach((methodData) => {
      text += `\n${methodData.txnType}:\n`;

      methodData.receivedByCurrency.forEach((currencyData) => {
        text += `  ← Received: ${currencyData.amount} ${currencyData.currency} (${currencyData.count} tx)\n`;
      });

      methodData.sentByCurrency.forEach((currencyData) => {
        text += `  → Sent: ${currencyData.amount} ${currencyData.currency} (${currencyData.count} tx)\n`;
      });
    });
  }

  return text.trim();
}

// Node display can be subject or account
export interface NodeDisplayData {
  title: string;
  // description: string;
  category: number;
  categoryName: string;
  transit?: string | null;
  account?: string | null;
  // Party info (subjects only)
  partyInfo?: {
    partyIdentifier?: string;
    sourceSystem?: PartySourceSystem;
    identifiers?: PartyIdentifiers;
    account?: PartyAccount;
    partyName?: PartyName;
    contact?: PartyContact;
    address?: PartyAddress;
  };

  currencyTotals?: {
    receivedByCurrency: { currency: string; amount: string; count: number }[];
    sentByCurrency: { currency: string; amount: string; count: number }[];
  };
  currencyTotalsByTxnType?: TxnTypeCurrencyTotals[];
}

interface TxnTypeCurrencyTotals {
  txnType: string;
  receivedByCurrency: {
    currency: string;
    amount: string;
    count: number;
  }[];
  sentByCurrency: { currency: string; amount: string; count: number }[];
  /**
   * **For sorting ONLY**
   */
  _total: number;
}
