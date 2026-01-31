import { formatCurrency } from '@angular/common';
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
import {
  FORM_OPTIONS_DETAILS_OF_DISPOSITION,
  FORM_OPTIONS_TYPE_OF_FUNDS,
} from '../../reporting-ui/edit-form/form-options.service';
import { StrTransaction } from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { SnackbarQueueService } from '../../snackbar-queue.service';
import { AccountNumberData } from '../../transaction-search/account-number-selectable-table/account-number-selectable-table.component';
import {
  getSubjectIdAndCategory,
  getTransactionType,
  NODE_ENUM,
  TRANSACTION_TYPE_ENUM,
} from '../account-methods.service';
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
      class="h-900 w-100 position-relative border rounded shadow-sm overflow-hidden">
      <div #chartContainer class="w-100 h-100"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CircularComponent implements OnInit, OnChanges, OnDestroy {
  private snackbarQ = inject(SnackbarQueueService);
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  @Input({ required: true }) filteredSelections: StrTransaction[] = [];

  @Input({ required: true })
  partyKeysSelection: string[] = [];

  @Input({ required: true })
  accountNumbersSelection: AccountNumberData[] = [];

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
    if (
      !changes['filteredSelections'] ||
      changes['filteredSelections'].firstChange
    )
      return;

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

    if (this.filteredSelections.length > 0) {
      this.updateChart(focalSubjects, focalAccounts);
    }

    // Set up click event for copying
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.myChart.on('click', (params: any) => {
      if (params.dataType === 'node') {
        const copyText = getNodeDataTextToCopy(params.data as GraphNode);
        navigator.clipboard.writeText(copyText).then(
          () => {
            this.snackbarQ.open('Copied to clipboard!', 'OK', {
              duration: 1000,
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

    this.filteredSelections.forEach((txn) => {
      buildNodesAndAccountHolderLinks({
        transaction: txn,
        nodesMap,
        linksMap,
        focalSubjects,
        focalAccounts,
      });
    });

    this.filteredSelections.forEach((txn) => {
      buildTransactionLinks({
        transaction: txn,
        linksMap,
        focalSubjects,
        nodesMap,
      });
    });

    const { nodes, links } = normalize(nodesMap, linksMap);

    const option: ECOption = {
      title: {
        text: 'Circular Flow of Funds Analysis',
        subtext:
          'Interactive relationship mapping between subjects and accounts',
        left: 'left',
        top: 10,
      },
      tooltip: {
        trigger: 'item',
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
          itemGap: 12,
          itemWidth: 25,
          itemHeight: 14,
          // selectors for show/hide all
          selector: [
            { type: 'all', title: 'Select All' },
            { type: 'inverse', title: 'Invert' },
          ],
          selectorPosition: 'start',
          selectorItemGap: 8,
          selectorButtonGap: 15,

          // Style the selector buttons
          selectorLabel: {
            show: true,
            color: '#333',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 4,
            padding: [4, 8, 4, 8], // [top, right, bottom, left]
            backgroundColor: '#f0f0f0',
            borderColor: '#d0d0d0',
            borderWidth: 1,
          },

          // Hover state
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
            formatter: (({ data }) => {
              const node = data as GraphNode;

              if (node.category === NODE_ENUM.Account) return;

              if (node.category === NODE_ENUM.FocalAccount)
                return `#${node.name}`;

              if (node.nodeType === 'subject') return node.subjectName;

              return node.name;
            }) as LabelFormatter,
            distance: 4,
          },
          edgeSymbolSize: 15,
          lineStyle: {
            color: '#3c3c3c',
            opacity: LINK_OPACITY,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 10,
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
}: {
  transaction: StrTransaction;
  nodesMap: Map<string | null, GraphNode>;
  linksMap: Map<string, Link>;
  focalSubjects: Set<string>;
  focalAccounts: Set<string>;
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
        rawCredit: 0,
        rawDebit: 0,
        creditsByMethod: {},
        debitsByMethod: {},
      });
    }

    // Related Subjects - Account holders

    const relatedAccountHolderIds = [] as string[];

    for (const accHolder of accountHolders) {
      const {
        subjectId: accountHolderId,
        category,
        name: accountHolderName,
      } = getSubjectIdAndCategory(accHolder, focalSubjects);

      if (!nodesMap.has(accountHolderId)) {
        nodesMap.set(accountHolderId, {
          id: accountHolderId,
          category,
          nodeType: 'subject',
          subjectName: accountHolderName,
          relatedTransit: saTransit,
          relatedAccount: saAccount,
          rawCredit: 0,
          rawDebit: 0,
          creditsByMethod: {},
          debitsByMethod: {},
        });
      }

      relatedAccountHolderIds.push(accountHolderId);
    }

    if (!saAccount) continue;

    for (const accountHolderId of relatedAccountHolderIds) {
      const source = saAccount;
      const target = accountHolderId;
      const linkId = getLinkId(source, target);

      if (linksMap.has(linkId)) continue;

      linksMap.set(linkId, {
        source,
        target,
        linkId,
        linkType: 'accountHolder',
        rawAmount: 0,
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
        rawCredit: 0,
        rawDebit: 0,
        creditsByMethod: {},
        debitsByMethod: {},
      });
    }

    // Related Subjects - Account holders

    const relatedAccountHoldersIds = [] as string[];

    for (const accHolder of accountHolders) {
      const {
        subjectId: accountHolderId,
        category,
        name: accountHolderName,
      } = getSubjectIdAndCategory(accHolder, focalSubjects);

      if (!nodesMap.has(accountHolderId)) {
        nodesMap.set(accountHolderId, {
          id: accountHolderId,
          category,
          nodeType: 'subject',
          subjectName: accountHolderName,
          relatedTransit: caTransit,
          relatedAccount: caAccount,
          rawCredit: 0,
          rawDebit: 0,
          creditsByMethod: {},
          debitsByMethod: {},
        });
      }

      relatedAccountHoldersIds.push(accountHolderId);
    }

    if (!caAccount) return;

    for (const accountHolderId of relatedAccountHoldersIds) {
      const source = caAccount;
      const target = accountHolderId;
      const linkId = getLinkId(source, target);

      if (linksMap.has(linkId)) continue;

      linksMap.set(linkId, {
        source,
        target,
        linkId,
        linkType: 'accountHolder',
        rawAmount: 0,
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
  focalSubjects,
}: {
  transaction: StrTransaction;
  nodesMap: Map<string, GraphNode>;
  linksMap: Map<string, Link>;
  focalSubjects: Set<string>;
}) {
  const { methodOfTxn, wasTxnAttempted } = transaction;

  if (wasTxnAttempted) return;

  for (const {
    directionOfSA,
    conductors = [],
    typeOfFunds: saTypeOfFunds,
    amount: saAmount,
  } of transaction.startingActions) {
    const addEmptyConductor = conductors.length === 0;
    if (addEmptyConductor) {
      conductors.push({
        linkToSub: '',
        _hiddenPartyKey: '',
        _hiddenSurname: '',
        _hiddenGivenName: '',
        _hiddenOtherOrInitial: '',
        _hiddenNameOfEntity: '',
        wasConductedOnBehalf: null,
      });
    }

    for (const conductor of conductors) {
      for (const {
        beneficiaries = [],
        detailsOfDispo: caDetailsOfDispo,
      } of transaction.completingActions) {
        if (!directionOfSA) continue;

        let { subjectId: conductorId } = getSubjectIdAndCategory(
          conductor,
          focalSubjects,
        );

        const txnTypeKey =
          getTransactionType(
            saTypeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS,
            caDetailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION,
            methodOfTxn,
          ) ?? TRANSACTION_TYPE_ENUM.Unknown;

        let nodeCon = nodesMap.get(conductorId)!;

        const isConductorABeneficiary = (conductorId: string) =>
          beneficiaries
            .map((ben) => {
              let { subjectId: beneficiaryId } = getSubjectIdAndCategory(
                ben,
                focalSubjects,
              );
              return beneficiaryId;
            })
            .some((benId) => benId === conductorId);

        if (!isConductorABeneficiary(conductorId))
          addToDebits(nodeCon, txnTypeKey, saAmount ?? 0);

        for (const beneficiary of beneficiaries) {
          let { subjectId: beneficiaryId } = getSubjectIdAndCategory(
            beneficiary,
            focalSubjects,
          );
          let nodeBen = nodesMap.get(beneficiaryId)!;

          createOrUpdateBidirectionalLink(
            linksMap,
            conductorId,
            beneficiaryId,
            directionOfSA as DIRECTION_OF_SA,
            saAmount ?? 0,
          );

          addToCredits(nodeBen, txnTypeKey, saAmount ?? 0);
        }
      }
    }
  }

  /**
   * Update node from FOCAL CLIENT perspective
   */
  function addToDebits(node: GraphNode, txnMethod: number, txnAmount: number) {
    // eslint-disable-next-line no-param-reassign
    node.debitsByMethod[txnMethod] ??= { amount: 0, count: 0 };
    // eslint-disable-next-line no-param-reassign
    node.debitsByMethod[txnMethod].amount += txnAmount;
    // eslint-disable-next-line no-param-reassign
    node.debitsByMethod[txnMethod]!.count += 1;
    // eslint-disable-next-line no-param-reassign
    node.rawDebit += txnAmount;
  }

  /**
   * Update node from FOCAL CLIENT perspective
   */
  function addToCredits(node: GraphNode, txnMethod: number, txnAmount: number) {
    // eslint-disable-next-line no-param-reassign
    node.creditsByMethod[txnMethod] ??= { amount: 0, count: 0 };
    // eslint-disable-next-line no-param-reassign
    node.creditsByMethod[txnMethod].amount += txnAmount;
    // eslint-disable-next-line no-param-reassign
    node.creditsByMethod[txnMethod]!.count += 1;
    // eslint-disable-next-line no-param-reassign
    node.rawCredit += txnAmount;
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

function createOrUpdateBidirectionalLink(
  linksMap: Map<string, Link>,
  sourceId: string,
  targetId: string,
  direction: DIRECTION_OF_SA,
  amount: number,
) {
  const forwardLinkId = getLinkId(sourceId, targetId);
  const reverseLinkId = getLinkId(targetId, sourceId);

  // Same direction
  if (linksMap.has(forwardLinkId)) {
    const link = linksMap.get(forwardLinkId)!;
    linksMap.set(forwardLinkId, {
      ...link,
      rawAmount: link.rawAmount + amount,
    });
    return;
  }

  // Opposite direction
  if (linksMap.has(reverseLinkId)) {
    const link = linksMap.get(reverseLinkId)!;
    const newAmount = link.rawAmount - amount;

    // If amount becomes negative flip it
    if (newAmount < 0) {
      linksMap.delete(reverseLinkId);
      linksMap.set(forwardLinkId, {
        source: sourceId,
        target: targetId,
        linkId: forwardLinkId,
        linkType: direction,
        rawAmount: Math.abs(newAmount),
        symbol: ['none', 'arrow'],
      });
    } else {
      // Positive net flow, keep reverse link with reduced amount
      linksMap.set(reverseLinkId, {
        ...link,
        rawAmount: newAmount,
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
    rawAmount: amount,
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

  for (const node of nodesMap.values()) {
    if (node.rawCredit > 0) {
      if (node.rawCredit < minNodeCredit) minNodeCredit = node.rawCredit;
      if (node.rawCredit > maxNodeCredit) maxNodeCredit = node.rawCredit;
    }
  }

  // Fallback for nodes
  if (minNodeCredit === Infinity) minNodeCredit = 1;
  if (maxNodeCredit === 0) maxNodeCredit = 1;

  let minLinkAmount = Infinity;
  let maxLinkAmount = 0;

  for (const link of linksMap.values()) {
    if (link.rawAmount > 0) {
      if (link.rawAmount < minLinkAmount) minLinkAmount = link.rawAmount;
      if (link.rawAmount > maxLinkAmount) maxLinkAmount = link.rawAmount;
    }
  }

  // Fallback for links
  if (minLinkAmount === Infinity) minLinkAmount = 1;
  if (maxLinkAmount === 0) maxLinkAmount = 1;

  // Normalize Node Properties (Symbol Size)
  const nodes = Array.from(nodesMap.values()).map((node) => {
    let size = SYMBOL_MIN_SIZE;

    if (node.rawCredit > 0) {
      const minLog = Math.log(minNodeCredit);
      const maxLog = Math.log(maxNodeCredit);
      const valLog = Math.log(node.rawCredit);

      // Avoid division by zero if all values are the same
      const normalized =
        minLog === maxLog ? 0 : (valLog - minLog) / (maxLog - minLog);

      // Map 0..1 to Size Range [20px .. 80px]
      size = SYMBOL_MIN_SIZE + normalized * SYMBOL_MAX_SIZE;
    }

    if (node.category === NODE_ENUM.Account) {
      size = SYMBOL_ACCOUNT_SIZE;
    }

    return {
      ...node,
      symbolSize: size,
      value: node.rawCredit,
      // Explicitly preserve Maps (they don't spread correctly)
      creditsByMethod: node.creditsByMethod,
      debitsByMethod: node.debitsByMethod,
    } satisfies GraphNode;
  });

  // Normalize Link Properties (Value, Width, Curveness)
  const links = Array.from(linksMap.values()).map((link) => {
    let normalized = 0;

    if (link.rawAmount > 0) {
      const minLog = Math.log(minLinkAmount);
      const maxLog = Math.log(maxLinkAmount);
      const valLog = Math.log(link.rawAmount);

      normalized =
        minLog === maxLog ? 0 : (valLog - minLog) / (maxLog - minLog);
    }

    // HIGH amount -> THICK line
    const lineWidth =
      link.linkType === 'accountHolder' ? 1 : 1 + normalized * 7;

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
const NODES = [
  { name: 'CIBC Person', itemStyle: { color: '#1e88e5' } }, // 0 - Modern blue
  { name: 'CIBC Entity', itemStyle: { color: '#43a047' } }, // 1 - Forest green
  { name: 'Account', itemStyle: { color: '#ffa726' } }, // 2 - Warm orange
  { name: 'External Person', itemStyle: { color: '#ab47bc' } }, // 3 - Purple
  { name: 'External Entity', itemStyle: { color: '#26a69a' } }, // 4 - Teal
  { name: 'Attempted Transaction', itemStyle: { color: '#ef5350' } }, // 5 - Coral red
  { name: 'Unknown', itemStyle: { color: '#78909c' } }, // 6 - Blue gray
  { name: 'Focal Person', itemStyle: { color: COLOR_FOCAL_PERSON } }, // 7 - Deep red
  { name: 'Focal Entity', itemStyle: { color: COLOR_FOCAL_ENTITY } }, // 8 - Bright neon green
  { name: 'Focal Account', itemStyle: { color: '#ff2f65' } }, // 9 - Deep amber
];

export function getNodeName(num: number) {
  const index = (Object.values(NODE_ENUM) as number[]).findIndex(
    (val) => val === num,
  );
  return NODES[index].name;
}

export type Link = NonNullable<GraphSeriesOption['links']>[number] &
  LinkAccountHolderOrTransaction;

type LinkAccountHolderOrTransaction =
  | {
      linkId: string;
      linkType: 'accountHolder';
      rawAmount: number;
    }
  | {
      linkId: string;
      linkType: 'In';
      rawAmount: number;
    }
  | {
      linkId: string;
      linkType: 'Out';
      rawAmount: number;
    };

export type GraphNode = GraphNodeItemOption & GraphNodeAccountOrSubject;

type GraphNodeAccountOrSubject = {
  rawCredit: number;
  rawDebit: number;
  creditsByMethod: MethodAmount;
  debitsByMethod: MethodAmount;
} & (
  | {
      nodeType: 'account';
      transit?: string | null;
      account?: string | null;
    }
  | {
      nodeType: 'subject';
      subjectName: string;
      relatedTransit?: string | null;
      relatedAccount?: string | null;
    }
);

export type CategoryKey =
  | (typeof NODE_ENUM)[keyof typeof NODE_ENUM]
  | (number & {});

export type MethodAmount = Partial<
  Record<CategoryKey, { amount: number; count: number }>
>;

type GraphNodeItemOption = Extract<
  NonNullable<GraphSeriesOption['data']>[number],
  { name?: string }
>;

type DIRECTION_OF_SA = 'In' | 'Out';

const SYMBOL_MIN_SIZE = 20;
const SYMBOL_MAX_SIZE = 40;
const SYMBOL_ACCOUNT_SIZE = 20;
const LINK_OPACITY = 0.8;

export function formatCurrencyLocal(val: number) {
  return formatCurrency(val, 'en-US', '$', 'USD', '1.2-2');
}

type LabelFormatter = Exclude<
  NonNullable<NonNullable<GraphSeriesOption['label']>['formatter']>,
  string
>;
