import { formatCurrency } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GraphChart, GraphSeriesOption } from 'echarts/charts';
import {
  LegendComponent,
  LegendComponentOption,
  TooltipComponent,
  TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { map } from 'rxjs';
import { CaseRecordStore } from '../../aml/case-record.store';
import { StrTransaction } from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';

// Register only what you need
echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer]);

// Combine an Option type with only required components and charts via ComposeOption
type ECOption = echarts.ComposeOption<
  GraphSeriesOption | LegendComponentOption | TooltipComponentOption
>;

@Component({
  selector: 'app-circular',
  imports: [],
  template: `
    <div class="circular-container">
      <div #chartContainer class="chart"></div>
    </div>
  `,
  styleUrl: './circular.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CircularComponent implements OnInit, OnChanges, OnDestroy {
  private caseRecord = inject(CaseRecordStore);
  private destroyRef = inject(DestroyRef);

  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  @Input() transactionData: StrTransaction[] = [];

  private myChart: echarts.ECharts | undefined;
  private resizeObserver: ResizeObserver | undefined;

  ngOnInit(): void {
    this.caseRecord.state$
      .pipe(
        map(
          ({
            searchParams: { partyKeysSelection, accountNumbersSelection },
          }) => {
            return {
              partyKeysSelection,
              accountNumbersSelection,
            };
          },
        ),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe(({ partyKeysSelection, accountNumbersSelection }) => {
        const focalSubjects = new Set(partyKeysSelection);
        const focalAccounts = new Set(
          accountNumbersSelection.map(({ account }) => account),
        );
        this.initChart(focalSubjects, focalAccounts);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['transactionData'] || changes['transactionData'].firstChange)
      return;

    // this.updateChart(focalAccounts, focalSubjects);
  }

  ngOnDestroy(): void {
    this.myChart?.dispose();
    this.resizeObserver?.disconnect();
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

    if (this.transactionData.length > 0) {
      this.updateChart(focalSubjects, focalAccounts);
    }
  }

  private updateChart(
    focalSubjects: Set<string>,
    focalAccounts: Set<string>,
  ): void {
    if (!this.myChart) return;

    const nodesMap = new Map<string, GraphNode>();
    const linksMap = new Map<string, Link>();

    this.transactionData.forEach((txn) => {
      buildNodesAndAccountHolderLinks(
        txn,
        nodesMap,
        linksMap,
        focalSubjects,
        focalAccounts,
      );
    });
    this.transactionData.forEach((txn) => {
      buildLinks(txn, linksMap, focalSubjects, nodesMap);
    });
    const { nodes, links } = normalize(nodesMap, linksMap);

    const option: ECOption = {
      tooltip: {
        trigger: 'item',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const node = params.data as GraphNode;

            if (node.nodeType === 'account') {
              return `
                <strong>Account: ${node.account}</strong><br/>
                Type: ${getCategory(node.category as number)}<br/>
                Funds In: ${formatCurrencyLocal(node.rawCredit)}<br/>
              `;
            }

            if (node.nodeType === 'subject') {
              return `
                <strong>${node.name}</strong><br/>
                Type: ${getCategory(node.category as number)}<br/>
                Funds In: ${formatCurrencyLocal(node.rawCredit)}<br/>
              `;
            }
          } else {
            const link = params.data as Link;
            if (link.linkType === 'In') {
              return `
                <strong>Funds Transferred</strong><br/>
                Credit: ${formatCurrencyLocal(link.rawAmount)}<br/>
              `;
            }

            if (link.linkType === 'Out') {
              return `
                <strong>Funds Transferred</strong><br/>
                Debit: ${formatCurrencyLocal(link.rawAmount)}<br/>
              `;
            }

            if (link.linkType === 'accountHolder') {
              return `
                <strong>Account Holder</strong><br/>
              `;
            }
            // return `
            //   <strong>Transaction</strong><br/>
            //   Amount: $${params.data.value}<br/>
            //   Date: ${params.data.date}<br/>
            //   Ref: ${params.data.ref}
            // `;
          }
          return '';
        },
      },
      legend: [
        {
          data: CATEGORIES.map((c) => c.name),
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
        },
      ],
      series: [
        {
          name: 'Transactions',
          type: 'graph',
          layout: 'circular',
          data: nodes,
          links,
          categories: CATEGORIES,
          roam: true,
          label: {
            show: true,
            position: 'right',
            formatter: (({ name, data }) => {
              const node = data as GraphNode;

              if (node.category === CATEGORY_ENUM.Account) return;
              if (node.category === CATEGORY_ENUM.FocalAccount)
                return `#${node.name}`;

              return name;
            }) as LabelFormatter,
            distance: 4,
          },
          labelLayout: {
            hideOverlap: true,
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
          // force: {
          //   edgeLength: [700, 20],
          //   // friction: 0.6, // High friction stops movement quickly (default 0.6)
          //   repulsion: 200,
          //   gravity: 0.3, // Slightly higher gravity centers it faster
          // },
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
function buildNodesAndAccountHolderLinks(
  transaction: StrTransaction,
  nodesMap: Map<string | null, GraphNode>,
  linksMap: Map<string, Link>,
  focalSubjects: Set<string>,
  focalAccounts: Set<string>,
) {
  // SA account and subjects nodes and links
  for (const {
    conductors = [],
    account: saAccount,
    accountHolders = [],
    typeOfFunds: saTypeOfFunds,
  } of transaction.startingActions) {
    const typeOfFunds = saTypeOfFunds as TYPE_OF_FUNDS;

    // SA Account
    const isAccountInfoMissingSA = !saAccount && typeOfFunds !== 'Cash';

    let accountId = saAccount;
    let accountCategory: number = CATEGORY_ENUM.Account;

    if (isAccountInfoMissingSA) {
      accountId = generateUnknownNodeKey();
      accountCategory = CATEGORY_ENUM.UnknownNode;
    }

    if (saAccount && focalAccounts.has(saAccount)) {
      accountCategory = CATEGORY_ENUM.FocalAccount;
    }

    nodesMap.set(accountId, {
      id: accountId ?? '',
      category: accountCategory,
      nodeType: 'account',
      account: saAccount ?? '',
      name: saAccount ?? '',
      rawCredit: 0,
    });

    // Related Subjects - Conductor, Account holders
    const {
      subjectId: conductorId,
      category,
      name: conductorName,
    } = getSubjectIdAndCategory(conductors?.[0], focalSubjects);

    nodesMap.set(conductorId, {
      id: conductorId,
      category,
      nodeType: 'subject',
      name: conductorName,
      rawCredit: 0,
    });

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

      nodesMap.set(accountHolderId, {
        id: accountHolderId,
        category,
        nodeType: 'subject',
        name: accountHolderName,
        rawCredit: 0,
      });

      relatedConductorAndAccountHolderIds.push(accountHolderId);
    });

    if (!accountId) continue;

    for (const subId of relatedConductorAndAccountHolderIds) {
      const source = accountId;
      const target = subId;
      const linkId = source + '-' + target;

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
    account: caAccount,
    accountHolders = [],
    detailsOfDispo: caDetailsOfDispo,
  } of transaction.completingActions) {
    const detailsOfDispo = caDetailsOfDispo as DETAILS_OF_DISPOSITION;

    // CA Account
    const isAccountInfoMissingCA =
      !caAccount && detailsOfDispo !== 'Cash Withdrawal';

    let accountId = caAccount;
    let accountCategory: number = CATEGORY_ENUM.Account;

    if (isAccountInfoMissingCA) {
      accountId = generateUnknownNodeKey();
      accountCategory = CATEGORY_ENUM.UnknownNode;
    }

    if (caAccount && focalAccounts.has(caAccount)) {
      accountCategory = CATEGORY_ENUM.FocalAccount;
    }

    nodesMap.set(accountId, {
      id: accountId ?? '',
      category: accountCategory,
      nodeType: 'account',
      account: caAccount ?? '',
      name: caAccount ?? '',
      rawCredit: 0,
    });

    // Related Subjects - Beneficiaries, Account holders
    const relatedBeneficiariesAndAccountHoldersIds = [] as string[];

    for (const beneficiary of beneficiaries) {
      const {
        subjectId: beneficiaryId,
        category,
        name: beneficiaryName,
      } = getSubjectIdAndCategory(beneficiary, focalSubjects);

      nodesMap.set(beneficiaryId, {
        id: beneficiaryId,
        category,
        nodeType: 'subject',
        name: beneficiaryName,
        rawCredit: 0,
      });

      relatedBeneficiariesAndAccountHoldersIds.push(beneficiaryId);
    }

    for (const accHolder of accountHolders) {
      const {
        subjectId: accountHolderId,
        category,
        name: accountHolderName,
      } = getSubjectIdAndCategory(accHolder, focalSubjects);

      nodesMap.set(accountHolderId, {
        id: accountHolderId,
        category,
        nodeType: 'subject',
        name: accountHolderName,
        rawCredit: 0,
      });

      relatedBeneficiariesAndAccountHoldersIds.push(accountHolderId);
    }

    if (!accountId) {
      return;
    }

    for (const subId of relatedBeneficiariesAndAccountHoldersIds) {
      const source = accountId;
      const target = subId;
      const linkId = source + '-' + target;

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
function buildLinks(
  transaction: StrTransaction,
  linksMap: Map<string, Link>,
  focalSubjects: Set<string>,
  nodesMap: Map<string, GraphNode>,
) {
  // link transfer by sa conductor(s) to ca beneficiary(s)
  for (const {
    directionOfSA,
    conductors = [],
    typeOfFunds: saTypeOfFunds,
    account: saAccount,
    amount: debitedAmount,
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
        amount: creditedAmount,
      } of transaction.completingActions) {
        for (const beneficiary of beneficiaries) {
          const typeOfFunds = saTypeOfFunds as TYPE_OF_FUNDS;
          const detailsOfDispo = caDetailsOfDispo as DETAILS_OF_DISPOSITION;

          let { subjectId: conductorId } = getSubjectIdAndCategory(
            conductor,
            focalSubjects,
          );
          let { subjectId: beneficiaryId } = getSubjectIdAndCategory(
            beneficiary,
            focalSubjects,
          );

          if (
            typeOfFunds === 'Funds withdrawal' &&
            (detailsOfDispo === 'Cash Withdrawal' ||
              detailsOfDispo === 'Issued Cheque')
          ) {
            conductorId = saAccount ? saAccount : generateUnknownNodeKey();
          }

          if (
            (typeOfFunds === 'Cash' || typeOfFunds === 'Cheque') &&
            detailsOfDispo === 'Deposit to account'
          ) {
            beneficiaryId = caAccount ? caAccount : generateUnknownNodeKey();
          }

          const linkId = conductorId + '-' + beneficiaryId;

          const direction = directionOfSA as DIRECTION_OF_SA | null;

          if (!direction) continue;

          if (!linksMap.has(linkId)) {
            linksMap.set(linkId, {
              source: conductorId,
              target: beneficiaryId,
              linkId,
              linkType: direction,
              rawAmount: 0,
              symbol: ['none', 'arrow'],
            });
          }

          const link = linksMap.get(linkId)!;
          console.assert(
            link.source === conductorId && link.target === beneficiaryId,
          );

          const totalInAmount = link.rawAmount + (creditedAmount ?? 0);

          linksMap.set(linkId, {
            ...link,
            rawAmount: totalInAmount,
          });

          const nodeBen = nodesMap.get(beneficiaryId)!;
          nodesMap.set(beneficiaryId, {
            ...nodeBen,
            rawCredit: nodeBen.rawCredit + (creditedAmount ?? 0),
          });
        }
      }
    }
  }
}

function getSubjectIdAndCategory(
  subject: Subject | undefined,
  focalSubjects: Set<string>,
) {
  let category = CATEGORY_ENUM.UnknownNode as number;
  let name = 'Unknown Subject';

  if (!subject) {
    return {
      subjectId: generateUnknownNodeKey(),
      category,
      name,
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
    };
  }

  const isClient = !!subject.partyKey;
  const isPerson = !!subject.surname && !!subject.givenName;
  const isEntity = !!subject.nameOfEntity;
  const isFocal = !!subject.partyKey && focalSubjects.has(subject.partyKey);

  if (isFocal && isPerson) {
    category = CATEGORY_ENUM.FocalPersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial} ${subject.surname}`;
  }

  if (isFocal && isEntity) {
    category = CATEGORY_ENUM.FocalEntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  if (!isFocal && isClient && isPerson) {
    category = CATEGORY_ENUM.CibcPersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial} ${subject.surname}`;
  }

  if (!isFocal && isClient && isEntity) {
    category = CATEGORY_ENUM.CibcEntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  if (!isFocal && !isClient && isPerson) {
    category = CATEGORY_ENUM.PersonSubject;
    name = `${subject.givenName} ${subject.otherOrInitial ? subject.otherOrInitial + ' ' : ''}${subject.surname}`;
  }

  if (!isFocal && !isClient && isEntity) {
    category = CATEGORY_ENUM.EntitySubject;
    name = `${subject.nameOfEntity}`;
  }

  return {
    subjectId: `SUBJECT-${subject.partyKey ?? ''}-${subject.surname ?? ''}-${subject.givenName ?? ''}-${subject.otherOrInitial ?? ''}-${subject.nameOfEntity ?? ''}`,
    category,
    name,
  };
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

    if (node.category === CATEGORY_ENUM.Account) {
      size = SYMBOL_ACCOUNT_SIZE;
    }

    return {
      ...node,
      symbolSize: size,
      value: node.rawCredit,
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
      // For Force Layout: This value becomes the edge length target
      // inverted force.edgeLength
      // value: forceLayoutValue,

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
const CATEGORIES = [
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

const CATEGORY_ENUM = {
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

function getCategory(num: number) {
  const index = (Object.values(CATEGORY_ENUM) as number[]).findIndex(
    (val) => val === num,
  );
  return CATEGORIES[index].name;
}

function generateUnknownNodeKey() {
  return `UNKNOWN-${crypto.randomUUID()}`;
}

interface Subject {
  partyKey: string | null;
  surname: string | null;
  givenName: string | null;
  otherOrInitial: string | null;
  nameOfEntity: string | null;
}

type TYPE_OF_FUNDS =
  | 'Funds withdrawal'
  | 'Cash'
  | 'Cheque'
  | 'Domestic Funds Transfer'
  | 'Email money transfer'
  | 'International Funds Transfer';

type DETAILS_OF_DISPOSITION =
  | 'Deposit to account'
  | 'Cash Withdrawal'
  | 'Issued Cheque'
  | 'Outgoing email money transfer';

type Link = NonNullable<GraphSeriesOption['links']>[number] &
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

type GraphNode = GraphNodeItemOption & GraphNodeAccountOrSubject;

type GraphNodeAccountOrSubject =
  | {
      nodeType: 'account';
      account: string;
      rawCredit: number;
    }
  | { nodeType: 'subject'; name: string; rawCredit: number };

type GraphNodeItemOption = Extract<
  NonNullable<GraphSeriesOption['data']>[number],
  { name?: string }
>;

type DIRECTION_OF_SA = 'In' | 'Out';

const SYMBOL_MIN_SIZE = 20;
const SYMBOL_MAX_SIZE = 40;
const SYMBOL_ACCOUNT_SIZE = 5;
const LINK_OPACITY = 0.8;

function formatCurrencyLocal(val: number) {
  return formatCurrency(val, 'en-CA', 'CA$', 'CAD', '1.2-2');
}

type LabelFormatter = Exclude<
  NonNullable<NonNullable<GraphSeriesOption['label']>['formatter']>,
  string
>;
