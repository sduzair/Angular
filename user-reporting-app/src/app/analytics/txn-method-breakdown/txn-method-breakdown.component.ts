import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
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
import { StrTransaction } from '../../reporting-ui/reporting-ui-table/reporting-ui-table.component';
import { CanvasRenderer } from 'echarts/renderers';

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
  selector: 'app-txn-method-breakdown',
  imports: [],
  template: `
    <div
      class="h-400 w-100 position-relative border rounded shadow-sm overflow-hidden">
      <div #chartContainer class="w-100 h-100"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TxnMethodBreakdownComponent
  implements OnInit, OnChanges, OnDestroy
{
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  @Input() transactionData: StrTransaction[] = [];

  private myChart: echarts.ECharts | undefined;
  private resizeObserver: ResizeObserver | undefined;

  ngOnInit(): void {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactionData'] && !changes['transactionData'].firstChange) {
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

  private initChart(): void {
    if (!this.chartContainer) return;

    this.myChart = echarts.init(this.chartContainer.nativeElement);

    this.resizeObserver = new ResizeObserver(() => {
      this.myChart?.resize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);

    if (this.transactionData.length > 0) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    if (!this.myChart) return;

    const methodData = this.processMethodData(this.transactionData);
    const totalValue = methodData.reduce((sum, m) => sum + m.value, 0);

    // Color mapping based on value ranges
    const getColorByValue = (avgValue: number): string => {
      if (avgValue > 5000) return '#ee6666'; // High Value (Red)
      if (avgValue > 2000) return '#fac858'; // Medium Value (Orange)
      return '#91cc75'; // Low Value (Green)
    };

    const option: ECOption = {
      title: {
        text: 'Transaction Method Breakdown',
        subtext: 'How funds are moved',
        left: 'left',
        top: 10,
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const data = params.data as MethodData;
          const percent = ((data.value / totalValue) * 100).toFixed(1);

          return `
            <strong>${params.name}</strong><br/>
            <hr style="margin: 4px 0; border-color: #ddd"/>
            Total Amount: $${data.value.toLocaleString()}<br/>
            Transaction Count: ${data.count.toLocaleString()}<br/>
            Average Value: $${data.avgValue.toLocaleString()}<br/>
            Percentage: ${percent}%
          `;
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        itemGap: 15,
        formatter: (name: string) => {
          const method = methodData.find((m) => m.name === name);
          if (!method) return name;

          const percent = ((method.value / totalValue) * 100).toFixed(1);
          return `${name} (${percent}%)`;
        },
        textStyle: {
          fontSize: 13,
        },
      },
      series: [
        {
          name: 'Transaction Methods',
          type: 'pie',
          radius: ['45%', '70%'], // Donut style: [innerRadius, outerRadius]
          center: ['60%', '50%'], // Shifted right for legend
          data: methodData.map((method) => ({
            name: method.name,
            value: method.value,
            count: method.count,
            avgValue: method.avgValue,
            itemStyle: {
              color: getColorByValue(method.avgValue),
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
              const percent = ((params.value / totalValue) * 100).toFixed(1);
              return `{name|${params.name}}\n{value|$${(params.value / 1000).toFixed(0)}k} ({percent|${percent}%})`;
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
        },
      ],
      // Add a graphic element to show total in center
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '46%',
          style: {
            text: 'Total',
            align: 'center',
            fill: '#999',
            fontSize: 14,
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '50%',
          style: {
            text: `$${(totalValue / 1000).toFixed(0)}k`,
            align: 'center',
            fill: '#333',
            fontSize: 22,
            fontWeight: 'bold',
          },
        },
      ],
    };

    this.myChart.setOption(option);
  }

  private processMethodData(data: StrTransaction[]): MethodData[] {
    const methodMap = new Map<string, { total: number; count: number }>();

    data.forEach((txn) => {
      // Determine method from multiple possible fields
      let method = txn.sourceId;

      // Normalize method names
      if (!method) method = 'Unknown';

      // Map to friendly names
      const methodMapping: Record<string, string> = {
        ABM: 'ABM Cash',
        OLB: 'Online Banking',
        EMT: 'Email Transfer (EMT)',
        Wires: 'Wire Transfer',
      };

      const friendlyName = methodMapping[method] || method;
      const amount = txn.flowOfFundsTransactionCurrencyAmount || 0;

      if (!methodMap.has(friendlyName)) {
        methodMap.set(friendlyName, { total: 0, count: 0 });
      }

      const methodData = methodMap.get(friendlyName)!;
      methodData.total += amount;
      methodData.count += 1;
    });

    // Convert to array and calculate averages
    const result: MethodData[] = [];
    methodMap.forEach((data, name) => {
      result.push({
        name: name,
        value: data.total,
        count: data.count,
        avgValue: data.total / data.count,
      });
    });

    // Sort by total value descending
    return result.sort((a, b) => b.value - a.value);
  }
}

interface MethodData {
  name: string;
  value: number;
  count: number;
  avgValue: number;
}
