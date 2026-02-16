import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { PieChart } from 'echarts/charts';
import {
  GraphicComponent,
  GraphicComponentOption,
  LegendComponent,
  LegendComponentOption,
  TitleComponent,
  TitleComponentOption,
  TooltipComponent,
  TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { formatCurrencyLocal } from '../../reporting-ui/edit-form/common-validation';
import { StrTransaction } from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  getTxnType,
  TRANSACTION_TYPE_FRIENDLY_NAME,
} from '../account-transaction-totals.service';

echarts.use([
  PieChart,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
  GraphicComponent,
  CanvasRenderer,
]);

// Combine an Option type with only required components and charts via ComposeOption
type ECOption = echarts.ComposeOption<
  | LegendComponentOption
  | TooltipComponentOption
  | TitleComponentOption
  | GraphicComponentOption
>;

@Component({
  selector: 'app-txn-type-breakdown',
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIcon,
  ],
  template: `
    <div
      class="h-400 w-100 position-relative border rounded shadow-sm overflow-hidden">
      <!-- Direction Toggle -->
      <mat-button-toggle-group
        class="direction-toggle float-end z-1 me-1 mt-1"
        [value]="viewMode()"
        (change)="setViewMode($event.value)"
        hideSingleSelectionIndicator>
        <mat-button-toggle value="credits">
          <mat-icon>arrow_upward</mat-icon>
          <span>Credits</span>
        </mat-button-toggle>
        <mat-button-toggle value="debits">
          <mat-icon>arrow_downward</mat-icon>
          <span>Debits</span>
        </mat-button-toggle>
      </mat-button-toggle-group>

      <div #chartContainer class="w-100 h-100"></div>
    </div>
  `,
  styleUrl: 'txn-type-breakdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TxnTypeBreakdownComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  @Input({ required: true }) transactions: StrTransaction[] = [];
  @Input({ required: true }) account: {
    account: string;
    currency: string;
    transit: string;
  } | null = null;

  private myChart: echarts.ECharts | undefined;
  private resizeObserver: ResizeObserver | undefined;

  viewMode = signal<ViewMode>('credits');

  ngOnInit(): void {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && !changes['transactions'].firstChange) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    if (this.myChart) {
      this.myChart.dispose();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    this.updateChart();
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    this.myChart = echarts.init(this.chartContainer.nativeElement);

    this.resizeObserver = new ResizeObserver(() => {
      this.myChart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);

    if (this.transactions.length > 0) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    if (!this.myChart) return;

    const typeData = this.processTypeData(this.transactions);
    const mode = this.viewMode();

    // Extract relevant data based on view mode
    const chartData = typeData
      .map(
        (m) =>
          ({
            name: m.name,
            value: mode === 'credits' ? m.credits : m.debits,
            count: mode === 'credits' ? m.creditCount : m.debitCount,
            _avgValue: mode === 'credits' ? m.avgCreditValue : m.avgDebitValue,
          }) satisfies ChartData,
      )
      .filter((d) => d.value > 0); // Only show types with transactions

    const totalValue = chartData.reduce((sum, m) => sum + m.value, 0);

    const values = chartData.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    const interpolateRgb = (
      from: { r: number; g: number; b: number },
      to: { r: number; g: number; b: number },
      t: number,
    ) => {
      const tt = clamp01(t);
      const r = Math.round(from.r + (to.r - from.r) * tt);
      const g = Math.round(from.g + (to.g - from.g) * tt);
      const b = Math.round(from.b + (to.b - from.b) * tt);
      return `rgb(${r}, ${g}, ${b})`;
    };

    // Different color schemes for credits vs debits
    const getColorByMode = (value: number, mode: ViewMode): string => {
      // If all values are the same, just return a mid-ish shade
      if (maxValue <= 0 || maxValue === minValue) {
        return mode === 'credits' ? '#73d13d' : '#ff4d4f';
      }

      // Log scale based on real min/max (no “expected max”)
      const v = Math.max(value, 1);
      const logMin = Math.log10(Math.max(minValue, 1));
      const logMax = Math.log10(Math.max(maxValue, 1));
      const t = (Math.log10(v) - logMin) / (logMax - logMin);

      if (mode === 'credits') {
        return interpolateRgb(
          { r: 217, g: 247, b: 190 }, // #d9f7be  (light)
          { r: 115, g: 209, b: 61 }, // #73d13d  (dark)
          t,
        );
      }

      return interpolateRgb(
        { r: 255, g: 204, b: 199 }, // #ffccc7  (light)
        { r: 255, g: 77, b: 79 }, // #ff4d4f  (dark)
        t,
      );
    };

    const option: ECOption = {
      title: {
        text: `Transaction Type Breakdown - ${mode === 'credits' ? 'Credits' : 'Debits'}`,
        subtext:
          mode === 'credits'
            ? 'Incoming Funds by Type'
            : 'Outgoing Funds by Type',
        left: 'left',
        top: 10,
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const data = params.data as ChartData;
          const currency = this.account!.currency;
          const isCredit = mode === 'credits';
          const color = isCredit ? '#22c55e' : '#ef4444';

          let result = `<div style="font-size: 13px;">`;
          result += `<strong>${params.name}</strong><br/>`;
          result += `<span>Transit: ${this.account?.transit}</span><br/>`;
          result += `<span>Account: ${this.account?.account}</span><br/>`;
          result += '<hr style="margin: 4px 0; border-color: #ddd"/>';

          result += `<span>Transactions: ${data.count.toLocaleString()}</span><br/>`;
          result += `<span style="color: ${color};">${isCredit ? '↑ Credit' : '↓ Debit'}:</span> ${formatCurrencyLocal({ value: data.value, currencyCode: currency })}<br/>`;

          result += `</div>`;
          return result;
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        itemGap: 15,
        formatter: (name: string) => {
          const type = chartData.find((m) => m.name === name);
          if (!type) return name;

          return `${name}: ${formatCurrencyLocal({ value: type.value, currencyCode: this.account?.currency })}`;
        },
        textStyle: {
          fontSize: 13,
        },
      },
      series: [
        {
          name: 'Transaction Types',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['60%', '50%'],
          data: chartData.map((type) => ({
            name: type.name,
            value: type.value,
            count: type.count,
            itemStyle: {
              color: getColorByMode(type.value, mode),
              borderColor: '#fff',
              borderWidth: 2,
            },
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 15,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              borderWidth: 3,
            },
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          label: {
            show: true,
            position: 'outside',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) => {
              return `{name|${params.name}}`;
            },
            rich: {
              name: {
                fontSize: 12,
                fontWeight: 'bold',
                color: '#333',
              },
              value: {
                fontSize: 11,
                color: '#666',
                padding: [3, 0, 0, 0],
              },
              percent: {
                fontSize: 10,
                color: '#999',
              },
            },
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
            smooth: true,
          },
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: 0,
        },
      ],
      // Center graphic showing total
      graphic: [
        {
          type: 'text',
          right: '3%',
          top: '44%',
          style: {
            text: mode === 'credits' ? 'Total Credits' : 'Total Debits',
            align: 'center',
            fill: '#999',
            fontSize: 13,
          },
        },
        {
          type: 'text',
          right: '3%',
          top: '50%',
          style: {
            text: `${formatCurrencyLocal({ value: totalValue, currencyCode: this.account?.currency })}`,
            align: 'center',
            fill: mode === 'credits' ? '#52c41a' : '#f5222d',
            fontSize: 22,
            fontWeight: 'bold',
          },
        },
        {
          type: 'text',
          right: '3%',
          top: '56%',
          style: {
            text: `${chartData.reduce((sum, d) => sum + d.count, 0)} txns`,
            align: 'center',
            fill: '#999',
            fontSize: 11,
          },
        },
      ],
    };

    this.myChart.setOption(option, { notMerge: true });
  }

  private processTypeData(data: StrTransaction[]): TypeData[] {
    const typeMap = new Map<
      string,
      {
        credits: number;
        debits: number;
        creditCount: number;
        debitCount: number;
      }
    >();

    data.forEach(
      ({
        wasTxnAttempted,
        flowOfFundsCreditAmount,
        flowOfFundsDebitAmount,
        startingActions = [],
        completingActions = [],
      }) => {
        if (wasTxnAttempted) return;

        // Determine txn type
        const txnTypeKey = getTxnType({
          typeOfFunds: startingActions[0].typeOfFunds,
          detailsOfDispo: completingActions[0].detailsOfDispo,
          detailsOfDispoOther: completingActions[0].detailsOfDispoOther,
          startingActionsLength: startingActions.length,
        })!;

        const friendlyName = TRANSACTION_TYPE_FRIENDLY_NAME[txnTypeKey];

        // Separate credits and debits
        const creditAmount = flowOfFundsCreditAmount || 0;
        const debitAmount = flowOfFundsDebitAmount || 0;

        const typeData = typeMap.get(friendlyName) ?? {
          credits: 0,
          debits: 0,
          creditCount: 0,
          debitCount: 0,
        };

        if (creditAmount > 0) {
          typeData.credits += creditAmount;
          typeData.creditCount += 1;
        }

        if (debitAmount > 0) {
          typeData.debits += debitAmount;
          typeData.debitCount += 1;
        }

        typeMap.set(friendlyName, typeData);
      },
    );

    // Convert to array and calculate averages
    const result: TypeData[] = [];
    typeMap.forEach((data, name) => {
      result.push({
        name: name,
        credits: data.credits,
        debits: data.debits,
        creditCount: data.creditCount,
        debitCount: data.debitCount,
        avgCreditValue:
          data.creditCount > 0 ? data.credits / data.creditCount : 0,
        avgDebitValue: data.debitCount > 0 ? data.debits / data.debitCount : 0,
      });
    });

    // Sort by total value descending
    return result.sort((a, b) => b.credits + b.debits - (a.credits + a.debits));
  }
}

interface TypeData {
  name: string;
  credits: number;
  debits: number;
  creditCount: number;
  debitCount: number;
  avgCreditValue: number;
  avgDebitValue: number;
}

type ViewMode = 'credits' | 'debits';

interface ChartData {
  name: string;
  value: number;
  count: number;
  _avgValue: number;
}
