import { EntityType } from '../../aml/case-record.store';
import { formatCurrencyLocal } from '../../reporting-ui/edit-form/common-validation';
import {
  NODE_ENUM,
  TRANSACTION_TYPE_FRIENDLY_NAME,
} from '../account-transaction-totals.service';
import { getNodeName, GraphNode, TxnTypeAmount } from './circular.component';

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
    const { entityIdentifier } = node.entityInfo ?? {};

    const data: NodeDisplayData = {
      title: node.displayName,
      category: node.category as number,
      categoryName: getNodeName(node.category as number),

      entityInfo: {
        entityIdentifier: entityIdentifier!,
        ...node.entityInfo,
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
  const allTypes = new Set([...creditKeys, ...debitKeys]);

  if (allTypes.size === 0) return [];

  return Array.from(allTypes)
    .map((type) => {
      // Group credits by currency
      const receivedMapByCurr = new Map<
        string,
        { amount: number; count: number }
      >();
      (creditsByTxnType[type] ?? []).forEach((item) => {
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
      (debitsByTxnType[type] ?? []).forEach((item) => {
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
            type as keyof typeof TRANSACTION_TYPE_FRIENDLY_NAME
          ] ?? 'Unknown',
        receivedByCurrency: Array.from(receivedMapByCurr.entries()).map(
          ([currency, data]) => ({
            currency,
            amount: formatCurrencyLocal({
              value: data.amount,
              currencyCode: currency,
            }),
            count: data.count,
          }),
        ),
        sentByCurrency: Array.from(sentMapByCurr.entries()).map(
          ([currency, data]) => ({
            currency,
            amount: formatCurrencyLocal({
              value: data.amount,
              currencyCode: currency,
            }),
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
        amount: formatCurrencyLocal({
          value: data.amount,
          currencyCode: currency,
        }),
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count), // Sort by transaction count
    sentByCurrency: Array.from(sentMap.entries())
      .map(([currency, data]) => ({
        currency,
        amount: formatCurrencyLocal({
          value: data.amount,
          currencyCode: currency,
        }),
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

  // Entity Info Section (subjects only)
  if (data.entityInfo) {
    // Entity Name - title

    // Entity Account
    const { accountNumber, transitNumber, currency, fiNumber, accountName } =
      data.entityInfo ?? {};
    if (accountNumber) {
      html += `<span style="font-size: 13px;">Acct #: ${accountNumber}`;
      if (transitNumber) html += ` (Transit: ${transitNumber})`;
      if (currency) html += ` [${currency}]`;
      html += `</span><br/>`;
    }
    if (fiNumber)
      html += `<span style="font-size: 13px;">FI: ${fiNumber}</span><br/>`;
    if (accountName)
      html += `<span style="font-size: 13px;">Acct Name: ${accountName}</span><br/>`;

    // Entity Identifiers
    const { partyKey, certapayAccount, cardNumber } = data.entityInfo ?? {};
    if (partyKey)
      html += `<span style="font-size: 13px;">Entity Key: ${partyKey}</span><br/>`;
    if (certapayAccount)
      html += `<span style="font-size: 13px;">Certapay: ${certapayAccount}</span><br/>`;
    // if (msgTag50)
    //   html += `<span style="font-size: 13px;">Tag 50: ${msgTag50}</span><br/>`;
    // if (msgTag59)
    //   html += `<span style="font-size: 13px;">Tag 59: ${msgTag59}</span><br/>`;
    if (cardNumber)
      html += `<span style="font-size: 13px;">Card: ${cardNumber}</span><br/>`;

    // Entity Contact
    const { email, phone, mobile, handleUsed } = data.entityInfo ?? {};
    if (email)
      html += `<span style="font-size: 13px;">Email: ${email}</span><br/>`;
    if (phone)
      html += `<span style="font-size: 13px;">Phone: ${phone}</span><br/>`;
    if (mobile)
      html += `<span style="font-size: 13px;">Mobile: ${mobile}</span><br/>`;
    if (handleUsed)
      html += `<span style="font-size: 13px;">Handle: ${handleUsed}</span><br/>`;

    // Entity Address
    const { rawAddress, street, city, provinceState, postalCode, country } =
      data.entityInfo ?? {};

    if (rawAddress) {
      html += `<span style="font-size: 13px;">Address: ${rawAddress}</span><br/>`;
    } else {
      const addressParts = [
        street,
        city,
        provinceState,
        postalCode,
        country,
      ].filter(Boolean);
      if (addressParts.length > 0)
        html += `<span style="font-size: 13px;">Address: ${addressParts.join(', ')}</span><br/>`;
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
        html += `  ← Received: ${currencyData.amount}`;
        html += ` (${currencyData.count} tx)`;
        html += `</span><br/>`;
      });
    }

    // Display sent currency totals
    if (sentByCurrency.length > 0) {
      sentByCurrency.forEach((currencyData) => {
        html += `<span style="font-size: 13px; color: #f5222d;">`;
        html += `  → Sent: ${currencyData.amount}`;
        html += ` (${currencyData.count} tx)`;
        html += `</span><br/>`;
      });
    }
  }

  if (data.currencyTotalsByTxnType && data.currencyTotalsByTxnType.length > 0) {
    html += `<hr style="margin: 6px 0; border-color: #ddd"/>`;
    html += `<strong>Transaction Type Breakdown:</strong><br/>`;

    data.currencyTotalsByTxnType.forEach((typeData) => {
      html += `<div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid #e8e8e8;">`;
      html += `<strong style="font-size: 13px; color: #333;">${typeData.txnType}</strong><br/>`;

      if (typeData.receivedByCurrency.length > 0) {
        typeData.receivedByCurrency.forEach((currencyData) => {
          html += `<span style="font-size: 13px; color: #52c41a;">`;
          html += `  ← Received: ${currencyData.amount}`;
          html += ` (${currencyData.count} tx)`;
          html += `</span><br/>`;
        });
      }

      if (typeData.sentByCurrency.length > 0) {
        typeData.sentByCurrency.forEach((currencyData) => {
          html += `<span style="font-size: 13px; color: #f5222d;">`;
          html += `  → Sent: ${currencyData.amount}`;
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

  // Entity Info Section (subjects only)
  if (data.entityInfo) {
    // Entity Name - title

    // Entity Account
    const { accountNumber, transitNumber, currency, fiNumber, accountName } =
      data.entityInfo;
    if (accountNumber) {
      text += `Acct #: ${accountNumber}`;
      if (transitNumber) text += ` (Transit: ${transitNumber})`;
      if (currency) text += ` [${currency}]`;
      text += `\n`;
    }
    if (fiNumber) text += `FI: ${fiNumber}\n`;
    if (accountName) text += `Acct Name: ${accountName}\n`;

    // Entity Identifiers
    const { partyKey, certapayAccount, cardNumber } = data.entityInfo;
    if (partyKey) text += `Party Key: ${partyKey}\n`;
    if (certapayAccount) text += `Certapay: ${certapayAccount}\n`;
    // if (msgTag50) text += `Tag 50: ${msgTag50}\n`;
    // if (msgTag59) text += `Tag 59: ${msgTag59}\n`;
    if (cardNumber) text += `Card: ${cardNumber}\n`;

    // Entity Contact
    const { email, phone, mobile, handleUsed } = data.entityInfo;
    if (email) text += `Email: ${email}\n`;
    if (phone) text += `Phone: ${phone}\n`;
    if (mobile) text += `Mobile: ${mobile}\n`;
    if (handleUsed) text += `Handle: ${handleUsed}\n`;

    // Entity Address
    const { rawAddress, street, city, provinceState, postalCode, country } =
      data.entityInfo;
    if (rawAddress) {
      text += `Address: ${rawAddress}\n`;
    } else {
      const addressParts = [
        street,
        city,
        provinceState,
        postalCode,
        country,
      ].filter(Boolean);
      if (addressParts.length > 0) {
        text += `Address: ${addressParts.join(', ')}\n`;
      }
    }
  }

  if (data.currencyTotals) {
    const { receivedByCurrency, sentByCurrency } = data.currencyTotals;

    if (receivedByCurrency.length > 0 || sentByCurrency.length > 0) {
      text += `\nSummary:\n`;
    }

    receivedByCurrency.forEach((currencyData) => {
      text += `  ← Received: ${currencyData.amount} (${currencyData.count} tx)\n`;
    });

    sentByCurrency.forEach((currencyData) => {
      text += `  → Sent: ${currencyData.amount} (${currencyData.count} tx)\n`;
    });
  }

  if (data.currencyTotalsByTxnType && data.currencyTotalsByTxnType.length > 0) {
    text += `\nTransaction Type Breakdown:\n`;

    data.currencyTotalsByTxnType.forEach((typeData) => {
      text += `\n${typeData.txnType}:\n`;

      typeData.receivedByCurrency.forEach((currencyData) => {
        text += `  ← Received: ${currencyData.amount} (${currencyData.count} tx)\n`;
      });

      typeData.sentByCurrency.forEach((currencyData) => {
        text += `  → Sent: ${currencyData.amount} (${currencyData.count} tx)\n`;
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
  // Entity info (when node is a entity)
  entityInfo?: EntityType;

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
