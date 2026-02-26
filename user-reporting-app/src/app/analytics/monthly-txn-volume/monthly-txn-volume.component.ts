import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BarChart, BarSeriesOption } from 'echarts/charts';
import {
  DataZoomComponent,
  DataZoomComponentOption,
  GridComponent,
  GridComponentOption,
  LegendComponent,
  LegendComponentOption,
  TitleComponent,
  TitleComponentOption,
  TooltipComponent,
  TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TransactionDateDirective } from '../../reporting-ui/edit-form/transaction-date.directive';
import { StrTransaction } from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { formatCurrencyLocal } from '../../reporting-ui/edit-form/common-validation';

// Register only what you need
echarts.use([
  BarChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
  CanvasRenderer,
  DataZoomComponent,
]);

// Combine an Option type with only required components and charts via ComposeOption
type ECOption = echarts.ComposeOption<
  | BarSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | TitleComponentOption
  | DataZoomComponentOption
>;

@Component({
  selector: 'app-monthly-txn-volume',
  imports: [],
  template: `
    <div
      class="h-500 w-100 position-relative border rounded shadow-sm overflow-hidden">
      <div #chartContainer class="w-100 h-100"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyTxnVolumeComponent
  implements OnChanges, OnDestroy, AfterViewInit
{
  private destroyRef = inject(DestroyRef);
  private myChart: echarts.ECharts | undefined;
  private resizeObserver: ResizeObserver | undefined;

  @Input({ required: true }) transactions: StrTransaction[] = [];
  @Input({ required: true }) account: {
    account: string;
    currency: string;
    transit: string;
  } | null = null;
  @Output() readonly zoomChange = new EventEmitter<{
    start: string;
    end: string;
  }>();
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  ngAfterViewInit() {
    this.initChart();
    this.setupDataZoomListener();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['transactions'] || changes['transactions'].firstChange) return;

    this.updateChart();
  }

  ngOnDestroy(): void {
    this.myChart?.dispose();
    this.resizeObserver?.disconnect();
    this.myChart?.off('datazoom');
  }

  private initChart(): void {
    if (!this.chartContainer) return;

    this.myChart = echarts.init(this.chartContainer.nativeElement);

    // Auto-resize handler
    this.resizeObserver = new ResizeObserver(() => {
      this.myChart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);

    if (this.transactions.length <= 0) return;

    this.updateChart();
  }

  private updateChart(): void {
    if (!this.myChart) return;

    const { monthlyData } = this.groupByMonth(this.transactions);

    // Create series for each account (credits and debits)
    const series: ECOption['series'] = [];

    [this.account!.account].forEach((accountId, index) => {
      const color = this.accountColors[index % this.accountColors.length];

      // Credit series for this account (positive, stacked upward)
      series.push({
        name: `${accountId} (CR)`,
        type: 'bar',
        stack: 'credits',
        data: monthlyData.map((m) => m.credits || 0),
        itemStyle: {
          color: color,
          opacity: 0.9,
        },
        emphasis: {
          focus: 'series',
        },
      });

      // Debit series for this account (negative, stacked downward)
      series.push({
        name: `${accountId} (DB)`,
        type: 'bar',
        stack: 'debits',
        data: monthlyData.map((m) => -(m.debits || 0)),
        itemStyle: {
          color: color,
          opacity: 0.6,
        },
        emphasis: {
          focus: 'series',
        },
      });
    });

    const option: ECOption = {
      title: {
        text: 'Monthly Transaction Volume',
        subtext: 'Incoming vs. Outgoing Funds for Account',
        left: 'center',
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        confine: true,
        formatter: (params: ToolTipFormatterParams) => {
          if (!Array.isArray(params)) return '';

          const month = 'axisValue' in params[0] ? params[0].axisValue : null;

          let credit = 0;
          let debit = 0;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((item: any) => {
            const match = item.seriesName.match(/^(.+) \((CR|DB)\)$/);
            if (!match) return;

            const type = match[2];
            if (type === 'CR') {
              credit = item.value;
            } else {
              debit = Math.abs(item.value);
            }
          });

          const currency = this.account!.currency;

          let result = `<div style="font-size: 13px;">`;
          result += `<strong>${month}</strong><br/>`;
          result += `<span>Transit: ${this.account?.transit}</span><br/>`;
          result += `<span>Account: ${this.account?.account}</span><br/>`;
          result += '<hr style="margin: 4px 0; border-color: #ddd"/>';

          if (credit > 0) {
            result += `<span style="color: #22c55e;">↑ Credit:</span> ${formatCurrencyLocal({ value: credit, currencyCode: currency })}<br/>`;
          }
          if (debit > 0) {
            result += `<span style="color: #ef4444;">↓ Debit:</span> ${formatCurrencyLocal({ value: debit, currencyCode: currency })}<br/>`;
          }

          if (credit > 0 && debit > 0) {
            const netFlow = credit - debit;
            const netColor = netFlow >= 0 ? '#22c55e' : '#ef4444';
            const netLabel = netFlow >= 0 ? 'Inflow' : 'Outflow';

            result += '<hr style="margin: 4px 0; border-color: #ddd"/>';
            result += `<strong style="color: ${netColor};">${netLabel}:</strong> ${formatCurrencyLocal({ value: Math.abs(netFlow), currencyCode: currency })}`;
          }

          result += `</div>`;
          return result;
        },
      },
      legend: {
        data: series.map((s) => s.name as string),
        top: 60,
        type: 'scroll', // Allow scrolling if too many accounts
        pageButtonPosition: 'end',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: 80,
        top: 120,
        outerBoundsMode: 'same',
        outerBoundsContain: 'axisLabel',
      },
      xAxis: {
        type: 'category',
        data: monthlyData.map((d) => d.month),
        axisLabel: {
          rotate: 45,
        },
      },
      dataZoom: [
        {
          type: 'slider', // Interactive slider at the bottom
          xAxisIndex: 0,
          start: 0,
          end: 100,
          height: 25, // Slider height
          bottom: 10, // Position from bottom
          handleSize: '110%', // Handle size
          handleStyle: {
            color: '#5470c6',
          },
          textStyle: {
            color: '#333',
          },
          borderColor: '#ccc',
          fillerColor: 'rgba(84, 112, 198, 0.2)',
          backgroundColor: '#f5f5f5',
          showDetail: true, // Show date range detail
          labelFormatter: (value: number) => {
            // Format the label to show month names
            return monthlyData[value]?.month || '';
          },
          throttle: 100,
        },
        {
          type: 'inside', // Mouse wheel / touch zoom
          xAxisIndex: 0,
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          throttle: 100,
        },
      ],
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            const absVal = Math.abs(value);
            const sign = value >= 0 ? '' : '-';
            return `${sign}$${(absVal / 1000).toFixed(0)}k`;
          },
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      series: series,
    };

    this.myChart.setOption(option);
  }

  private groupByMonth(data: StrTransaction[]): {
    monthlyData: AccountMonthlyData[];
  } {
    const monthMap = new Map<string, AccountMonthlyData>();

    data.forEach((txn) => {
      const { wasTxnAttempted } = txn;
      if (wasTxnAttempted) return;

      const dateStr = txn.dateOfTxn || txn.flowOfFundsTransactionDate;
      if (!dateStr) return;

      // Parse date
      const date = TransactionDateDirective.parse(dateStr);

      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      const monthData = monthMap.get(monthKey) ?? {
        month: '',
        credits: 0,
        debits: 0,
        netFlow: 0,
      };

      const creditAmount = txn.flowOfFundsCreditAmount || 0;
      const debitAmount = txn.flowOfFundsDebitAmount || 0;

      // Process credits
      if (creditAmount > 0) {
        console.assert(!!txn.flowOfFundsCreditedAccount);
        monthData.credits += creditAmount;
      }

      // Process debits
      if (debitAmount > 0) {
        console.assert(!!txn.flowOfFundsDebitedAccount);
        monthData.debits += debitAmount;
      }

      monthMap.set(monthKey, monthData);
    });

    // Convert to sorted array
    const sortedKeys = Array.from(monthMap.keys()).sort();
    const monthlyData: AccountMonthlyData[] = [];

    sortedKeys.forEach((key) => {
      const [year, month] = key.split('-');
      const data = monthMap.get(key)!;

      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      const credits = data.credits;
      const debits = data.debits;
      data.netFlow = credits - debits;

      monthlyData.push({
        month: monthName,
        credits: data.credits,
        debits: data.debits,
        netFlow: data.netFlow,
      });
    });

    return {
      monthlyData,
    };
  }

  // Color palette for different accounts
  private readonly accountColors = [
    '#5470c6',
    '#91cc75',
    '#fac858',
    '#ee6666',
    '#73c0de',
    '#3ba272',
    '#fc8452',
    '#9a60b4',
    '#ea7ccc',
    '#5cb85c',
  ];

  // Expose chart instance for parent component access
  public getChartInstance() {
    return this.myChart;
  }

  private zoomSubject = new Subject<{ start: string; end: string }>();

  // Public method to set up datazoom listener from parent
  private setupDataZoomListener(): void {
    if (!this.myChart) return;

    // Set up debounced subscription
    this.zoomSubject
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(
          (prev, curr) => prev.start === curr.start && prev.end === curr.end,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      // eslint-disable-next-line rxjs-angular-x/prefer-async-pipe
      .subscribe(({ start, end }) => {
        // Emit to parent component
        this.zoomChange.emit({ start, end });
      });

    this.myChart.on('datazoom', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const option = this.myChart!.getOption() as any;
      const dataZoom = option['dataZoom']?.[0] as DataZoomComponentOption;
      console.assert(dataZoom.type === 'slider');

      if (!dataZoom) return;

      // Get the actual month/year strings from xAxis data
      const xAxisData = option.xAxis?.[0]?.data as string[];

      const startValue = dataZoom.startValue as number;
      const endValue = dataZoom.endValue as number;

      if (!xAxisData || startValue === undefined || endValue === undefined)
        return;

      const startMonth = xAxisData[startValue];
      const endMonth = xAxisData[endValue];

      // Convert from "Jan 2024" format to "YYYY-MM" format
      const startMonthKey = this.convertToMonthKey(startMonth);
      const endMonthKey = this.convertToMonthKey(endMonth);

      this.zoomSubject.next({ start: startMonthKey, end: endMonthKey });
    });
  }

  private convertToMonthKey(monthStr: string): string {
    // Convert "Jan 2024" to "2024-01"
    const date = new Date(monthStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }
}

interface AccountMonthlyData {
  month: string;
  credits: number;
  debits: number;
  netFlow: number;
}

type CallbackType = Exclude<
  NonNullable<TooltipComponentOption['formatter']>,
  string
>;
type ToolTipFormatterParams = Parameters<CallbackType>[0];
