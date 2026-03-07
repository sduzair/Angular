import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { GraphChart, GraphSeriesOption } from 'echarts/charts';
import {
  LegendComponent,
  LegendComponentOption,
  TitleComponent,
  TitleComponentOption,
  TooltipComponent,
  TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { EntityType } from '../../aml/case-record.store';
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../../reporting-ui/edit-form/form-options.service';
import { StrTransaction } from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { SnackbarQueueService } from '../../snackbar-queue.service';
import { AccountNumberData } from '../../transaction-search/account-number-selectable-table/account-number-selectable-table.component';
import { PartyGenType } from '../../transaction-view/transform-to-str-transaction/party-gen.service';
import {
  getSubjectDisplayNameAndCategory,
  getTxnType,
  NODE_ENUM,
  TRANSACTION_TYPE_ENUM,
} from '../account-transaction-totals.service';
import {
  extractNodeDisplayData,
  formatNodeDataAsHtml,
  getNodeDataTextToCopy,
} from './clipboardHelper';

// Register only what you need
echarts.use([
  GraphChart,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
  TitleComponent,
]);

// Combine an Option type with only required components and charts via ComposeOption
type ECOption = echarts.ComposeOption<
  | GraphSeriesOption
  | LegendComponentOption
  | TooltipComponentOption
  | TitleComponentOption
>;

@Component({
  selector: 'app-circular',
  imports: [],
  template: `
    <div
      style="height: 700px;"
      class="w-100 position-relative border rounded shadow-sm overflow-hidden">
      <div #chartContainer class="w-100 h-100"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CircularComponent implements OnInit, OnChanges, OnDestroy {
  private snackbarQ = inject(SnackbarQueueService);
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  @Input({ required: true }) transactions!: StrTransaction[];

  @Input({ required: true })
  partyKeysSelection: string[] = [];

  @Input({ required: true })
  accountNumbersSelection: AccountNumberData[] = [];

  @Input({ required: true })
  entities: EntityType[] = [];

  private myChart: echarts.ECharts | undefined;
  private resizeObserver: ResizeObserver | undefined;

  ngOnInit(): void {
    const focalSubjects = new Set(this.partyKeysSelection);
    const focalAccounts = new Set(
      this.accountNumbersSelection.map(({ account }) => account),
    );
    this.initChart(focalSubjects, focalAccounts);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['transactions'] || changes['transactions'].firstChange) return;

    const focalSubjects = new Set(this.partyKeysSelection);
    const focalAccounts = new Set(
      this.accountNumbersSelection.map(({ account }) => account),
    );
    this.updateChart(focalSubjects, focalAccounts);
  }

  ngOnDestroy(): void {
    this.myChart?.dispose();
    this.resizeObserver?.disconnect();
    this.myChart?.off('click');
  }

  private initChart(
    focalSubjects: Set<string>,
    focalAccounts: Set<string>,
  ): void {
    if (!this.chartContainer) return;

    this.myChart = echarts.init(this.chartContainer.nativeElement);

    // Auto-resize handler
    this.resizeObserver = new ResizeObserver(() => {
      this.myChart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);

    if (this.transactions.length > 0) {
      this.updateChart(focalSubjects, focalAccounts);
    }

    // Set up click event for copying
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.myChart.on('click', (params: any) => {
      if (params.dataType === 'node') {
        const copyText = getNodeDataTextToCopy(params.data as GraphNode);
        navigator.clipboard.writeText(copyText).then(
          () => {
            this.snackbarQ.open({
              message: 'Copied to clipboard!',
              action: 'OK',
              config: {
                duration: 1000,
              },
            });
          },
          (err) => {
            console.error('Failed to copy:', err);
          },
        );
      }
    });
  }

  private updateChart(
    focalSubjects: Set<string>,
    focalAccounts: Set<string>,
  ): void {
    if (!this.myChart) return;

    const nodesMap = new Map<string, GraphNode>();
    const linksMap = new Map<string, Link>();

    this.transactions.forEach((txn) => {
      buildNodesAndAccountHolderLinks({
        transaction: txn,
        nodesMap,
        linksMap,
        focalSubjects,
        focalAccounts,
        entities: this.entities,
      });
    });

    this.transactions.forEach((txn) => {
      buildTransactionLinks({
        transaction: txn,
        linksMap,
        nodesMap,
        focalSubjects,
        entities: this.entities,
      });
    });

    const { nodes, links } = normalize(nodesMap, linksMap);

    const option: ECOption = {
      title: {
        text: 'Funds Flow Network Graph',
        subtext:
          'Interactive directional funds flow with account ownership/relationships',
        left: 'left',
        top: 6,
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
        },
        subtextStyle: {
          fontSize: 11,
        },
      },
      tooltip: {
        trigger: 'item',
        padding: [6, 10],
        textStyle: { fontSize: 12 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const node = params.data as GraphNode;
            const displayData = extractNodeDisplayData(node);
            return displayData ? formatNodeDataAsHtml(displayData) : '';
          } else {
            const link = params.data as Link;

            if (link.linkType === 'In') {
              return '';
            }

            if (link.linkType === 'Out') {
              return '';
            }

            if (link.linkType === 'accountHolder') {
              return `<strong>Account Holder</strong><br/>`;
            }
          }
          return '';
        },
      },
      legend: [
        {
          data: NODES.map((c) => c.name),
          orient: 'vertical',
          left: 'left',
          top: 'middle',
          itemGap: 10,
          itemWidth: 22,
          itemHeight: 12,
          textStyle: { fontSize: 10 },
          formatter: (name: string) => {
            const categoryIndex = NODES.findIndex((c) => c.name === name);
            const count = nodes.filter(
              (node) => node.category === categoryIndex,
            ).length;
            return `${name} (${count})`;
          },

          // selectors for show/hide all
          selector: [
            { type: 'all', title: 'Select All' },
            { type: 'inverse', title: 'Invert' },
          ],
          selectorPosition: 'start',
          selected: {
            [NODES[NODE_ENUM.Account].name]: false,
            [NODES[NODE_ENUM.FocalAccount].name]: false,
          },

          selectorLabel: {
            show: true,
            color: '#333',
            fontSize: 10,
            fontWeight: 500,
            borderRadius: 3,
            padding: [2, 5],
            backgroundColor: '#f0f0f0',
            borderColor: '#d0d0d0',
            borderWidth: 1,
          },

          emphasis: {
            selectorLabel: {
              color: '#fff',
              backgroundColor: '#5470c6',
              borderColor: '#5470c6',
            },
          },
        },
      ],
      series: [
        {
          name: 'Transactions',
          type: 'graph',
          layout: 'circular',
          data: nodes,
          links,
          categories: NODES,
          roam: true,
          label: {
            show: true,
            position: 'right',
            fontSize: 11,
            formatter: (({ data }) => {
              const node = data as GraphNode;

              if (node.category === NODE_ENUM.Account) return node.name;

              if (node.category === NODE_ENUM.FocalAccount)
                return `#${node.name}`;

              if (node.nodeType === 'subject') return node.displayName;

              return node.name;
            }) as LabelFormatter,
            distance: 3,
          },
          edgeSymbolSize: 15,
          lineStyle: {
            color: '#3c3c3c',
            opacity: LINK_OPACITY,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 8,
            },
          },
          scaleLimit: {
            min: 0.4,
          },
          animationDurationUpdate: 1500,
          animationEasingUpdate: 'quinticInOut',
        },
      ],
    };

    this.myChart.setOption(option);
  }
}

/**
 * Creates nodes and links for accounts and account holders
 */
export function buildNodesAndAccountHolderLinks({
  transaction,
  nodesMap,
  linksMap,
  focalSubjects,
  focalAccounts,
  entities,
}: {
  transaction: StrTransaction;
  nodesMap: Map<string | null, GraphNode>;
  linksMap: Map<string, Link>;
  focalSubjects: Set<string>;
  focalAccounts: Set<string>;
  entities: EntityType[];
}) {
  // SA account and subjects, nodes and links
  for (const {
    branch: saTransit,
    account: saAccount,
    accountHolders = [],
  } of transaction.startingActions) {
    let accountCategory: number = NODE_ENUM.Account;

    if (saAccount && focalAccounts.has(saAccount)) {
      accountCategory = NODE_ENUM.FocalAccount;
    }

    if (saAccount && !nodesMap.has(saAccount)) {
      nodesMap.set(saAccount, {
        id: saAccount,
        category: accountCategory,
        nodeType: 'account',
        transit: saTransit,
        account: saAccount,
        name: saAccount,
      });
    }

    // Related Subjects - Account holders
    for (const accHolder of accountHolders) {
      const { linkToSub } = accHolder;

      if (!nodesMap.has(linkToSub)) {
        const { nodeCategory: category, displayName } =
          getSubjectDisplayNameAndCategory(
            entities.find((p) => p.entityIdentifier === linkToSub),
            focalSubjects,
          );

        nodesMap.set(linkToSub, {
          id: linkToSub,
          category,
          nodeType: 'subject',
          displayName,
          creditsByTxnType: {},
          debitsByTxnType: {},
          entityInfo: entities.find((p) => p.entityIdentifier === linkToSub)!,
        });
      }
    }

    if (!saAccount) continue;

    for (const accHolderId of accountHolders.map(
      ({ linkToSub }) => linkToSub,
    )) {
      const source = saAccount;
      const target = accHolderId;
      const linkId = getLinkId(source, target);

      if (linksMap.has(linkId)) continue;

      linksMap.set(linkId, {
        source,
        target,
        linkId,
        linkType: 'accountHolder',
        _amount: 0,
        symbol: 'none',
      });
    }
  }

  // CA account and subjects, nodes and links
  for (const {
    branch: caTransit,
    account: caAccount,
    accountHolders = [],
  } of transaction.completingActions) {
    let accountCategory: number = NODE_ENUM.Account;

    if (caAccount && focalAccounts.has(caAccount)) {
      accountCategory = NODE_ENUM.FocalAccount;
    }

    if (caAccount && !nodesMap.has(caAccount)) {
      nodesMap.set(caAccount, {
        id: caAccount ?? '',
        category: accountCategory,
        nodeType: 'account',
        transit: caTransit,
        account: caAccount ?? '',
        name: caAccount ?? '',
      });
    }

    // Related Subjects - Account holders

    for (const accHolder of accountHolders) {
      const { linkToSub } = accHolder;

      if (!nodesMap.has(linkToSub)) {
        const { nodeCategory: category, displayName } =
          getSubjectDisplayNameAndCategory(
            entities.find((p) => p.entityIdentifier === linkToSub),
            focalSubjects,
          );

        nodesMap.set(linkToSub, {
          id: linkToSub,
          category,
          nodeType: 'subject',
          displayName,
          creditsByTxnType: {},
          debitsByTxnType: {},
          entityInfo: entities.find((p) => p.entityIdentifier === linkToSub)!,
        });
      }
    }

    if (!caAccount) return;

    for (const accHolderId of accountHolders.map(
      ({ linkToSub }) => linkToSub,
    )) {
      const source = caAccount;
      const target = accHolderId;
      const linkId = getLinkId(source, target);

      if (linksMap.has(linkId)) continue;

      linksMap.set(linkId, {
        source,
        target,
        linkId,
        linkType: 'accountHolder',
        _amount: 0,
        symbol: 'none',
      });
    }
  }
}

/**
 * Creates links for sent/received transactions
 */
export function buildTransactionLinks({
  transaction,
  nodesMap,
  linksMap,
  entities,
  focalSubjects,
}: {
  transaction: StrTransaction;
  nodesMap: Map<string, GraphNode>;
  linksMap: Map<string, Link>;
  entities: EntityType[];
  focalSubjects: Set<string>;
}) {
  const { methodOfTxn, wasTxnAttempted } = transaction;

  if (wasTxnAttempted) return;

  for (const {
    directionOfSA,
    conductors = [],
    typeOfFunds,
    amount: saAmount,
    currency: saAmountCurr,
  } of transaction.startingActions) {
    console.assert(conductors.length === 1);
    for (const { linkToSub: condId } of conductors) {
      for (const {
        beneficiaries = [],
        detailsOfDispo,
        detailsOfDispoOther,
      } of transaction.completingActions) {
        const txnTypeKey = getTxnType({
          typeOfFunds: typeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS,
          detailsOfDispo: detailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION,
          detailsOfDispoOther,
        });

        const isConductorABeneficiary = (conductorId: string) =>
          beneficiaries.some(({ linkToSub: benId }) => benId === conductorId);

        if (!isConductorABeneficiary(condId)) {
          if (!nodesMap.has(condId)) {
            const { nodeCategory: category, displayName } =
              getSubjectDisplayNameAndCategory(
                entities.find((p) => p.entityIdentifier === condId),
                focalSubjects,
              );

            nodesMap.set(condId, {
              id: condId,
              category,
              nodeType: 'subject',
              displayName,
              creditsByTxnType: {},
              debitsByTxnType: {},
              entityInfo: entities.find((p) => p.entityIdentifier === condId)!,
            });
          }

          const nodeCon = nodesMap.get(condId) as Extract<
            GraphNode,
            { nodeType: 'subject' }
          >;

          (nodeCon.debitsByTxnType[txnTypeKey] ??= []).push({
            amount: saAmount ?? 0,
            currency: saAmountCurr!,
          });
        }

        for (const { linkToSub: benId } of beneficiaries) {
          if (benId !== condId) {
            createOrUpdateBidirectionalLink({
              linksMap,
              sourceId: condId,
              targetId: benId,
              direction: directionOfSA as DIRECTION_OF_SA,
              _amount: saAmount ?? 0,
            });
          }

          if (!nodesMap.has(benId)) {
            const { nodeCategory: category, displayName } =
              getSubjectDisplayNameAndCategory(
                entities.find((p) => p.entityIdentifier === benId),
                focalSubjects,
              );

            nodesMap.set(benId, {
              id: benId,
              category,
              nodeType: 'subject',
              displayName,
              creditsByTxnType: {},
              debitsByTxnType: {},
              entityInfo: entities.find((p) => p.entityIdentifier === benId)!,
            });
          }

          const nodeBen = nodesMap.get(benId) as Extract<
            GraphNode,
            { nodeType: 'subject' }
          >;

          (nodeBen.creditsByTxnType[txnTypeKey] ??= []).push({
            amount: saAmount ?? 0,
            currency: saAmountCurr!,
          });
        }
      }
    }
  }
}

function isFocalClient(node: GraphNode) {
  return (
    node.category == NODE_ENUM.FocalPersonSubject ||
    node.category == NODE_ENUM.FocalEntitySubject
  );
}

function getLinkId(source: string, target: string) {
  return source + '$' + target;
}

function createOrUpdateBidirectionalLink({
  linksMap,
  sourceId,
  targetId,
  direction,
  _amount,
}: {
  linksMap: Map<string, Link>;
  sourceId: string;
  targetId: string;
  direction: DIRECTION_OF_SA;
  _amount: number;
}) {
  const forwardLinkId = getLinkId(sourceId, targetId);
  const reverseLinkId = getLinkId(targetId, sourceId);

  // Same direction
  if (linksMap.has(forwardLinkId)) {
    const link = linksMap.get(forwardLinkId)!;
    linksMap.set(forwardLinkId, {
      ...link,
      _amount: link._amount + _amount,
    });
    return;
  }

  // Opposite direction
  if (linksMap.has(reverseLinkId)) {
    const link = linksMap.get(reverseLinkId)!;
    const _newAmount = link._amount - _amount;

    // If amount becomes negative flip it
    if (_newAmount < 0) {
      linksMap.delete(reverseLinkId);
      linksMap.set(forwardLinkId, {
        source: sourceId,
        target: targetId,
        linkId: forwardLinkId,
        linkType: direction,
        _amount: Math.abs(_newAmount),
        symbol: ['none', 'arrow'],
      });
    } else {
      // Positive net flow, keep reverse link with reduced amount
      linksMap.set(reverseLinkId, {
        ...link,
        _amount: _newAmount,
      });
    }
    return;
  }

  // No link exists
  linksMap.set(forwardLinkId, {
    source: sourceId,
    target: targetId,
    linkId: forwardLinkId,
    linkType: direction,
    _amount: _amount,
    symbol: ['none', 'arrow'],
  });
}

function normalize(
  nodesMap: Map<string | null, GraphNode>,
  linksMap: Map<string, Link>,
) {
  // Calculate Extents (Min/Max) for Normalization
  let minNodeCredit = Infinity;
  let maxNodeCredit = 0;

  const isSubjectNode = (
    node: GraphNode,
  ): node is Extract<GraphNode, { nodeType: 'subject' }> =>
    node.nodeType === 'subject';

  /**
   * Calculate total credits for each subject node. **For normalizing ONLY**
   */
  const _nodeTotals = new Map<GraphNode, number>();

  for (const node of [...nodesMap.values()].filter(isSubjectNode)) {
    // note: **For normalizing ONLY**
    const _totalCredit = Object.values(node.creditsByTxnType).reduce(
      (total, items) => {
        const itemsTotal = (items ?? []).reduce(
          (sum, item) => sum + item.amount,
          0,
        );
        return total + itemsTotal;
      },
      0,
    );

    _nodeTotals.set(node, _totalCredit);

    if (_totalCredit > 0) {
      if (_totalCredit < minNodeCredit) minNodeCredit = _totalCredit;
      if (_totalCredit > maxNodeCredit) maxNodeCredit = _totalCredit;
    }
  }

  // Fallback for nodes
  if (minNodeCredit === Infinity) minNodeCredit = 1;
  if (maxNodeCredit === 0) maxNodeCredit = 1;

  let minLinkAmount = Infinity;
  let maxLinkAmount = 0;

  for (const link of linksMap.values()) {
    if (link._amount > 0) {
      if (link._amount < minLinkAmount) minLinkAmount = link._amount;
      if (link._amount > maxLinkAmount) maxLinkAmount = link._amount;
    }
  }

  // Fallback for links
  if (minLinkAmount === Infinity) minLinkAmount = 1;
  if (maxLinkAmount === 0) maxLinkAmount = 1;

  // Normalize Node Properties (Symbol Size)
  const nodes = Array.from(nodesMap.values()).map((node) => {
    let size = SYMBOL_MIN_SIZE;
    let value = 0;

    if (node.nodeType === 'subject') {
      const _totalCredit = _nodeTotals.get(node) ?? 0;
      value = _totalCredit;

      if (_totalCredit > 0) {
        const minLog = Math.log(minNodeCredit);
        const maxLog = Math.log(maxNodeCredit);
        const valLog = Math.log(_totalCredit);

        // Avoid division by zero if all values are the same
        const normalized =
          minLog === maxLog ? 0 : (valLog - minLog) / (maxLog - minLog);

        // Map 0..1 to Size Range [SYMBOL_MIN_SIZE .. SYMBOL_MAX_SIZE]
        size = SYMBOL_MIN_SIZE + normalized * SYMBOL_MAX_SIZE;
      }
    }

    if (node.nodeType === 'account' && node.category === NODE_ENUM.Account) {
      size = SYMBOL_ACCOUNT_SIZE;
    }

    return {
      ...node,
      symbolSize: size,
      value: value,
    } satisfies GraphNode;
  });

  // Normalize Link Properties (Value, Width, Curveness)
  const links = Array.from(linksMap.values()).map((link) => {
    let normalized = 0;

    if (link._amount > 0) {
      const minLog = Math.log(minLinkAmount);
      const maxLog = Math.log(maxLinkAmount);
      const valLog = Math.log(link._amount);

      normalized =
        minLog === maxLog ? 0 : (valLog - minLog) / (maxLog - minLog);
    }

    // HIGH amount -> THICK line
    const lineWidth =
      link.linkType === 'accountHolder'
        ? 1
        : LINK_MIN_SIZE + normalized * LINK_MAX_SIZE;

    const curveness =
      link.linkType === 'In' || link.linkType === 'Out' ? 0.1 : 0;

    return {
      ...link,
      lineStyle: {
        width: lineWidth,
        curveness: curveness,
      },
      label: {
        show: false,
      },
    } satisfies Link;
  });

  return { nodes, links };
}

const COLOR_FOCAL_PERSON = '#d32f2f';
const COLOR_FOCAL_ENTITY = '#00e676';
const COLOR_CIBC_RED = '#B00B1C'; // CIBC official brand color

const NODES = [
  { name: 'CIBC Person', itemStyle: { color: COLOR_CIBC_RED } }, // 0 - CIBC official red
  { name: 'CIBC Entity', itemStyle: { color: '#8B0616' } }, // 1 - Darker CIBC red variant
  { name: 'Account', itemStyle: { color: '#ffa726' } }, // 2 - Warm orange
  { name: 'External Person', itemStyle: { color: '#9575cd' } }, // 3 - Medium purple
  { name: 'External Entity', itemStyle: { color: '#26a69a' } }, // 4 - Teal
  { name: 'Unknown', itemStyle: { color: '#90a4ae' } }, // 5 - Blue gray
  { name: 'Focal Person', itemStyle: { color: COLOR_FOCAL_PERSON } }, // 6 - Deep red
  { name: 'Focal Entity', itemStyle: { color: COLOR_FOCAL_ENTITY } }, // 7 - Bright neon green
  { name: 'Focal Account', itemStyle: { color: '#ff6f00' } }, // 8 - Deep orange/amber
  { name: 'Merchant', itemStyle: { color: '#4527a0' } }, // 9 - Indigo purple
];

export function getNodeName(num: number) {
  const index = (Object.values(NODE_ENUM) as number[]).findIndex(
    (val) => val === num,
  );
  return NODES[index].name;
}

export type Link = NonNullable<GraphSeriesOption['links']>[number] &
  LinkAccountHolderOrTransaction;

type LinkAccountHolderOrTransaction = {
  /**
   * **For normalizing ONLY**
   */
  _amount: number;
} & (
  | {
      linkId: string;
      linkType: 'accountHolder';
    }
  | {
      linkId: string;
      linkType: 'In';
    }
  | {
      linkId: string;
      linkType: 'Out';
    }
);

export type GraphNode = GraphNodeItemOption &
  (
    | {
        nodeType: 'account';
        transit?: string | null;
        account?: string | null;
      }
    | {
        nodeType: 'subject';
        displayName: string;
        creditsByTxnType: TxnTypeAmount;
        debitsByTxnType: TxnTypeAmount;
        entityInfo: EntityType | null;
      }
  );

export type TxnTypeKey =
  | (typeof TRANSACTION_TYPE_ENUM)[keyof typeof TRANSACTION_TYPE_ENUM]
  | (number & {});

export type TxnTypeAmount = Partial<
  Record<TxnTypeKey, { amount: number; currency: string }[]>
>;

// indirectly extracts type GraphNodeItemOption (not exported)
type GraphNodeItemOption = Extract<
  NonNullable<GraphSeriesOption['data']>[number],
  { name?: string }
>;

export type DIRECTION_OF_SA = 'In' | 'Out';

const SYMBOL_MIN_SIZE = 14;
const SYMBOL_MAX_SIZE = 22;
const SYMBOL_ACCOUNT_SIZE = 14;
const LINK_OPACITY = 0.8;

const LINK_MIN_SIZE = 1;
const LINK_MAX_SIZE = 4;

type LabelFormatter = Exclude<
  NonNullable<NonNullable<GraphSeriesOption['label']>['formatter']>,
  string
>;
