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
  getTxnMethod,
  METHOD_ENUM,
} from '../txn-method-breakdown/txn-method-breakdown.component';
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
 * Creates nodes and links for subjects and accounts
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
  // SA account and subjects nodes and links
  for (const {
    conductors = [],
    branch: saTransit,
    account: saAccount,
    accountHolders = [],
    typeOfFunds: saTypeOfFunds,
  } of transaction.startingActions) {
    const typeOfFunds = saTypeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS;

    const isAccountInfoMissingSA = !saAccount && typeOfFunds !== 'Cash';

    let accountId = saAccount;
    let accountCategory: number = NODE_ENUM.Account;

    if (isAccountInfoMissingSA) {
      accountId = generateUnknownNodeKey();
      accountCategory = NODE_ENUM.UnknownNode;
    }

    if (saAccount && focalAccounts.has(saAccount)) {
      accountCategory = NODE_ENUM.FocalAccount;
    }

    if (!nodesMap.has(accountId)) {
      nodesMap.set(accountId, {
        id: accountId ?? '',
        category: accountCategory,
        nodeType: 'account',
        transit: saTransit,
        account: saAccount ?? '',
        name: saAccount ?? '',
        rawCredit: 0,
        rawDebit: 0,
        creditsByMethod: {},
        debitsByMethod: {},
      });
    }

    // Related Subjects - Conductor, Account holders
    const {
      subjectId: conductorId,
      category,
      name: conductorName,
    } = getSubjectIdAndCategory(conductors?.[0], focalSubjects);

    if (!nodesMap.has(conductorId)) {
      nodesMap.set(conductorId, {
        id: conductorId,
        category,
        nodeType: 'subject',
        subjectName: conductorName,
        relatedTransit: saTransit,
        relatedAccount: saAccount,
        rawCredit: 0,
        rawDebit: 0,
        creditsByMethod: {},
        debitsByMethod: {},
      });
    }

    const relatedConductorAndAccountHolderIds = [] as string[];
    const isConductorRelatedToAccount = typeOfFunds !== 'Cheque';

    if (isConductorRelatedToAccount) {
      relatedConductorAndAccountHolderIds.push(conductorId);
    }

    accountHolders.forEach((accHolder) => {
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

      relatedConductorAndAccountHolderIds.push(accountHolderId);
    });

    if (!accountId) continue;

    for (const subId of relatedConductorAndAccountHolderIds) {
      const source = accountId;
      const target = subId;
      const linkId = getLinkId(source, target);

      if (linksMap.has(linkId)) continue;

      linksMap.set(linkId, {
        source: accountId,
        target: subId,
        linkId,
        linkType: 'accountHolder',
        rawAmount: 0,
        symbol: 'none',
      });
    }
  }

  // CA account and subjects nodes and links
  for (const {
    beneficiaries = [],
    branch: caTransit,
    account: caAccount,
    accountHolders = [],
    detailsOfDispo: caDetailsOfDispo,
  } of transaction.completingActions) {
    const detailsOfDispo =
      caDetailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION;

    const isAccountInfoMissingCA =
      !caAccount && detailsOfDispo !== 'Cash Withdrawal';

    let accountId = caAccount;
    let accountCategory: number = NODE_ENUM.Account;

    if (isAccountInfoMissingCA) {
      accountId = generateUnknownNodeKey();
      accountCategory = NODE_ENUM.UnknownNode;
    }

    if (caAccount && focalAccounts.has(caAccount)) {
      accountCategory = NODE_ENUM.FocalAccount;
    }

    if (!nodesMap.has(accountId)) {
      nodesMap.set(accountId, {
        id: accountId ?? '',
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

    // Related Subjects - Beneficiaries, Account holders
    const relatedBeneficiariesAndAccountHoldersIds = [] as string[];

    for (const beneficiary of beneficiaries) {
      const {
        subjectId: beneficiaryId,
        category,
        name: beneficiaryName,
      } = getSubjectIdAndCategory(beneficiary, focalSubjects);

      if (!nodesMap.has(beneficiaryId)) {
        nodesMap.set(beneficiaryId, {
          id: beneficiaryId,
          category,
          nodeType: 'subject',
          subjectName: beneficiaryName,
          relatedTransit: caTransit,
          relatedAccount: caAccount,
          rawCredit: 0,
          rawDebit: 0,
          creditsByMethod: {},
          debitsByMethod: {},
        });
      }

      relatedBeneficiariesAndAccountHoldersIds.push(beneficiaryId);
    }

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

      relatedBeneficiariesAndAccountHoldersIds.push(accountHolderId);
    }

    if (!accountId) return;

    for (const subId of relatedBeneficiariesAndAccountHoldersIds) {
      const source = accountId;
      const target = subId;
      const linkId = getLinkId(source, target);

      if (linksMap.has(linkId)) continue;

      linksMap.set(linkId, {
        source: accountId,
        target: subId,
        linkId,
        linkType: 'accountHolder',
        rawAmount: 0,
        symbol: 'none',
      });
    }
  }
}

/**
 * Creates links for in/out transactions
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
  const { methodOfTxn } = transaction;

  for (const {
    directionOfSA,
    conductors = [],
    typeOfFunds: saTypeOfFunds,
    account: saAccount,
    amount: saAmount,
  } of transaction.startingActions) {
    const addEmptyConductor = conductors.length === 0;
    if (addEmptyConductor) {
      conductors.push({
        partyKey: '',
        surname: '',
        givenName: '',
        otherOrInitial: '',
        nameOfEntity: '',
        wasConductedOnBehalf: null,
      });
    }

    for (const conductor of conductors) {
      for (const {
        beneficiaries = [],
        detailsOfDispo: caDetailsOfDispo,
        account: caAccount,
      } of transaction.completingActions) {
        const direction = directionOfSA as DIRECTION_OF_SA | null;
        if (!direction) continue;

        let { subjectId: conductorId } = getSubjectIdAndCategory(
          conductor,
          focalSubjects,
        );

        const typeOfFunds = saTypeOfFunds as FORM_OPTIONS_TYPE_OF_FUNDS;
        const detailsOfDispo =
          caDetailsOfDispo as FORM_OPTIONS_DETAILS_OF_DISPOSITION;
        const txnMethod =
          getTxnMethod(typeOfFunds, detailsOfDispo, methodOfTxn) ??
          METHOD_ENUM.Unknown;

        let nodeCon = nodesMap.get(conductorId)!;

        const isCashWithdrawal =
          txnMethod === METHOD_ENUM.ABM && direction === 'Out';
        const isChequeWithdrawal =
          txnMethod === METHOD_ENUM.Cheque && direction === 'Out';

        const isCashDeposit =
          txnMethod === METHOD_ENUM.ABM && direction === 'In';
        const isChequeDeposit =
          txnMethod === METHOD_ENUM.Cheque && direction === 'In';

        if (isCashWithdrawal || isChequeWithdrawal) {
          conductorId = saAccount ? saAccount : generateUnknownNodeKey();
          nodeCon = nodesMap.get(conductorId)!;
        }

        addToDebits(nodeCon, txnMethod, saAmount ?? 0);

        for (const beneficiary of beneficiaries) {
          let { subjectId: beneficiaryId } = getSubjectIdAndCategory(
            beneficiary,
            focalSubjects,
          );
          let nodeBen = nodesMap.get(beneficiaryId)!;

          if (isCashDeposit || isChequeDeposit) {
            beneficiaryId = caAccount ? caAccount : generateUnknownNodeKey();
            nodeBen = nodesMap.get(beneficiaryId)!;

            createOrUpdateBidirectionalLink(
              linksMap,
              conductorId,
              beneficiaryId,
              direction,
              saAmount ?? 0,
            );

            addToCredits(nodeBen, txnMethod, saAmount ?? 0);

            break;
          }

          createOrUpdateBidirectionalLink(
            linksMap,
            conductorId,
            beneficiaryId,
            direction,
            saAmount ?? 0,
          );

          addToCredits(nodeBen, txnMethod, saAmount ?? 0);
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

export function getSubjectIdAndCategory(
  subject: Subject | undefined,
  focalSubjects: Set<string>,
) {
  let category = NODE_ENUM.UnknownNode as number;
  let name = 'Unknown Subject';
  let isFocal = false;

  if (!subject) {
    return {
      subjectId: generateUnknownNodeKey(),
      category,
      name,
      isFocal,
    };
  }

  if (
    !subject.partyKey &&
    !subject.givenName &&
    !subject.otherOrInitial &&
    !subject.surname &&
    !subject.nameOfEntity
  ) {
    return {
      subjectId: generateUnknownNodeKey(),
      category,
      name,
      isFocal,
    };
  }

  const isClient = !!subject.partyKey;
  const isPerson = !!subject.surname && !!subject.givenName;
  const isEntity = !!subject.nameOfEntity;
  isFocal = !!subject.partyKey && focalSubjects.has(subject.partyKey);

  if (isFocal && isPerson) {
    category = NODE_ENUM.FocalPersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial ? subject.otherOrInitial + ' ' : ''}${subject.surname}`;
  }

  if (isFocal && isEntity) {
    category = NODE_ENUM.FocalEntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  if (!isFocal && isClient && isPerson) {
    category = NODE_ENUM.CibcPersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial ? subject.otherOrInitial + ' ' : ''}${subject.surname}`;
  }

  if (!isFocal && isClient && isEntity) {
    category = NODE_ENUM.CibcEntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  if (!isFocal && !isClient && isPerson) {
    category = NODE_ENUM.PersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial ? subject.otherOrInitial + ' ' : ''}${subject.surname}`;
  }

  if (!isFocal && !isClient && isEntity) {
    category = NODE_ENUM.EntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  return {
    subjectId: `SUBJECT-${subject.partyKey ?? ''}-${subject.surname ?? ''}-${subject.givenName ?? ''}-${subject.otherOrInitial ?? ''}-${subject.nameOfEntity ?? ''}`,
    category,
    name,
    isFocal,
  };
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

export const NODE_ENUM = {
  CibcPersonSubject: 0,
  CibcEntitySubject: 1,
  Account: 2,
  PersonSubject: 3,
  EntitySubject: 4,
  AttemptedTxn: 5,
  UnknownNode: 6,
  FocalPersonSubject: 7,
  FocalEntitySubject: 8,
  FocalAccount: 9,
} as const;

export function getNodeName(num: number) {
  const index = (Object.values(NODE_ENUM) as number[]).findIndex(
    (val) => val === num,
  );
  return NODES[index].name;
}

function generateUnknownNodeKey() {
  return `UNKNOWN-${crypto.randomUUID()}`;
}

export const CATEGORY_LABEL: Record<number, string> = {
  7: 'an individual',
  8: 'a business/entity',
  3: 'an individual',
  4: 'a business/entity',
  0: 'an individual',
  1: 'a business/entity',
};

interface Subject {
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
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
const SYMBOL_ACCOUNT_SIZE = 5;
const LINK_OPACITY = 0.8;

export function formatCurrencyLocal(val: number) {
  return formatCurrency(val, 'en-US', '$', 'USD', '1.2-2');
}

type LabelFormatter = Exclude<
  NonNullable<NonNullable<GraphSeriesOption['label']>['formatter']>,
  string
>;
