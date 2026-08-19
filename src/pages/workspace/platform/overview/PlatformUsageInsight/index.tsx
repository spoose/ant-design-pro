import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Liveline, type LivelinePoint, type LivelineSeries } from 'liveline';
import { useEffect, useMemo, useState } from 'react';
import { statusColors } from '@/theme/statusColors';
import { formatNumber } from '@/utils/format';
import {
  getMockAiUsageTotals,
  mockAiDayLabels,
  mockAiFailureCounts,
  mockAiInputTokens,
  mockAiOutputTokens,
  mockAiRequestCounts,
  mockAiUsageAllocation,
} from './mockUsageInsight';
import useUsageInsightStyles from './style';

const totals = getMockAiUsageTotals();
const INPUT_COLOR = '#f68f3c';
const OUTPUT_COLOR = '#3d9aff';
const REQUEST_COLOR = statusColors.success.ink;
const FAILURE_COLOR = '#ee5c61';
const CHART_PAD = { bottom: 32, left: 8, right: 8, top: 16 } as const;

type Styles = ReturnType<typeof useUsageInsightStyles>['styles'];

function makeLivelinePoints(
  values: readonly number[],
  secondsPerDay = 6,
): LivelinePoint[] {
  const end = Math.floor(Date.now() / 1000);
  const total = values.length * secondsPerDay;
  const points: LivelinePoint[] = [];
  for (let index = 0; index < total; index += 1) {
    const day = Math.min(values.length - 1, Math.floor(index / secondsPerDay));
    points.push({
      time: end - (total - 1 - index),
      value: values[day],
    });
  }
  return points;
}

function dayLabelAt(time: number, points: readonly LivelinePoint[]) {
  if (points.length === 0) {
    return '';
  }
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const delta = Math.abs(points[index].time - time);
    if (delta < best) {
      best = delta;
      nearest = index;
    }
  }
  const perDay = Math.max(
    1,
    Math.round(points.length / mockAiDayLabels.length),
  );
  return mockAiDayLabels[
    Math.min(mockAiDayLabels.length - 1, Math.floor(nearest / perDay))
  ];
}

function chartIndexFromPointer(
  event: React.PointerEvent<HTMLDivElement>,
  pointCount: number,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const progress = Math.max(
    0,
    Math.min(1, (event.clientX - rect.left) / rect.width),
  );
  return Math.round(progress * (pointCount - 1));
}

function useChartTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      setTheme(
        root.classList.contains('dark') || media.matches ? 'dark' : 'light',
      );
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    media.addEventListener('change', update);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);

  return theme;
}

function ChartTooltip({
  rows,
  styles,
  timeLabel,
}: {
  rows: { color: string; label: string; value: string }[];
  styles: Styles;
  timeLabel: string;
}) {
  return (
    <div className={styles.chartTooltip}>
      <span className={styles.chartTooltipTime}>{timeLabel}</span>
      {rows.map((row) => (
        <div className={styles.chartTooltipRow} key={row.label}>
          <span className={styles.chartTooltipLabel}>
            <span
              className={styles.chartTooltipDot}
              style={{ background: row.color }}
            />
            {row.label}
          </span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ChartHoverLayer({
  hoverIndex,
  pointCount,
  rows,
  styles,
}: {
  hoverIndex: number | null;
  pointCount: number;
  rows: { color: string; label: string; value: string }[];
  styles: Styles;
}) {
  if (hoverIndex === null || pointCount < 2) {
    return null;
  }

  const ratio = hoverIndex / (pointCount - 1);

  return (
    <>
      <span
        className={styles.chartCursor}
        style={{ left: `${ratio * 100}%` }}
      />
      <span
        className={styles.chartTooltipAnchor}
        style={{ left: `${Math.min(Math.max(ratio * 100, 28), 72)}%` }}
      >
        <ChartTooltip
          rows={rows}
          styles={styles}
          timeLabel={mockAiDayLabels[hoverIndex]}
        />
      </span>
    </>
  );
}

function Entity({ name, toneClass }: { name: string; toneClass: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-baseline font-medium text-zinc-900 dark:text-zinc-100">
      <span className={`inline-block size-2.5 rounded-full ${toneClass}`} />
      {name}
    </span>
  );
}

function CompareUsage({ styles }: { styles: Styles }) {
  const theme = useChartTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const data = useMemo(
    () => ({
      input: makeLivelinePoints(mockAiInputTokens),
      output: makeLivelinePoints(mockAiOutputTokens),
    }),
    [],
  );
  const latestInput = data.input.at(-1)?.value ?? 0;
  const latestOutput = data.output.at(-1)?.value ?? 0;
  const series: LivelineSeries[] = useMemo(
    () => [
      {
        id: 'input',
        label: '输入 Token',
        data: data.input,
        value: latestInput,
        color: INPUT_COLOR,
      },
      {
        id: 'output',
        label: '输出 Token',
        data: data.output,
        value: latestOutput,
        color: OUTPUT_COLOR,
      },
    ],
    [data.input, data.output, latestInput, latestOutput],
  );

  return (
    <div className={styles.innerCard}>
      <div className={styles.metrics}>
        {[
          {
            name: '输入 Token',
            delta: totals.inputDelta,
            sub: `${formatNumber(totals.inputTotal)} 千`,
            deltaClass: 'text-[#9a2827]',
            dotClass: 'bg-[#f68f3c]',
          },
          {
            name: '输出 Token',
            delta: totals.outputDelta,
            sub: `${formatNumber(totals.outputTotal)} 千`,
            deltaClass: 'text-[#54915c]',
            dotClass: 'bg-[#3d9aff]',
          },
        ].map((item) => (
          <div className={styles.metric} key={item.name}>
            <span className={styles.metricLabel}>
              <span
                className={`size-2 shrink-0 rounded-full ${item.dotClass}`}
              />
              {item.name}
            </span>
            <span className={`${styles.metricDelta} ${item.deltaClass}`}>
              {item.delta}
            </span>
            <span className={styles.metricValue}>{item.sub}</span>
          </div>
        ))}
      </div>

      <div className={styles.well}>
        <div className={styles.wellBar}>
          <span>近 7 日 · 千 Token</span>
        </div>
        <div
          className={styles.chartStage}
          onPointerCancel={() => setHoverIndex(null)}
          onPointerDown={(event) =>
            setHoverIndex(chartIndexFromPointer(event, mockAiDayLabels.length))
          }
          onPointerLeave={() => setHoverIndex(null)}
          onPointerMove={(event) =>
            setHoverIndex(chartIndexFromPointer(event, mockAiDayLabels.length))
          }
          onPointerUp={() => setHoverIndex(null)}
        >
          <Liveline
            badge={false}
            cursor="default"
            data={data.input}
            exaggerate
            formatTime={(time) => dayLabelAt(time, data.input)}
            formatValue={(value) => formatNumber(Math.round(value))}
            grid
            lineWidth={2.25}
            padding={CHART_PAD}
            paused
            pulse={false}
            scrub={false}
            series={series}
            theme={theme}
            value={latestInput}
            window={48}
          />
          <ChartHoverLayer
            hoverIndex={hoverIndex}
            pointCount={mockAiDayLabels.length}
            rows={[
              {
                color: INPUT_COLOR,
                label: '输入 Token',
                value: formatNumber(mockAiInputTokens[hoverIndex ?? 0]),
              },
              {
                color: OUTPUT_COLOR,
                label: '输出 Token',
                value: formatNumber(mockAiOutputTokens[hoverIndex ?? 0]),
              },
            ]}
            styles={styles}
          />
        </div>
      </div>
    </div>
  );
}

function AnomalyUsage({ styles }: { styles: Styles }) {
  const theme = useChartTheme();
  const [metric, setMetric] = useState<'requests' | 'failures'>('requests');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const requests = useMemo(
    () => makeLivelinePoints(mockAiRequestCounts, 7),
    [],
  );
  const failures = useMemo(
    () => makeLivelinePoints(mockAiFailureCounts, 7),
    [],
  );
  const data = metric === 'requests' ? requests : failures;
  const rawValues =
    metric === 'requests' ? mockAiRequestCounts : mockAiFailureCounts;
  const value = data.at(-1)?.value ?? 0;
  const color = metric === 'requests' ? REQUEST_COLOR : FAILURE_COLOR;
  const threshold =
    metric === 'requests'
      ? `${formatNumber(totals.avgRequests)} 周均值`
      : `${formatNumber(Math.round(totals.totalFailures / 7))} 周均值`;

  return (
    <div className={styles.innerCard}>
      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100">
        <span aria-hidden style={{ color: REQUEST_COLOR }}>
          ↑
        </span>
        请求峰值偏高
      </span>

      <div className={styles.well}>
        <div className={styles.wellBar}>
          <span className="truncate">
            {hoverIndex !== null
              ? formatNumber(rawValues[hoverIndex])
              : threshold}
          </span>
          <span className="flex shrink-0 rounded-full bg-white p-0.5 dark:bg-zinc-800">
            {(['requests', 'failures'] as const).map((item) => (
              <button
                aria-pressed={metric === item}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  metric === item
                    ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
                key={item}
                onClick={() => setMetric(item)}
                type="button"
              >
                {item === 'requests' ? '请求' : '失败'}
              </button>
            ))}
          </span>
        </div>
        <div
          className={styles.chartStage}
          onPointerCancel={() => setHoverIndex(null)}
          onPointerDown={(event) =>
            setHoverIndex(chartIndexFromPointer(event, mockAiDayLabels.length))
          }
          onPointerLeave={() => setHoverIndex(null)}
          onPointerMove={(event) =>
            setHoverIndex(chartIndexFromPointer(event, mockAiDayLabels.length))
          }
          onPointerUp={() => setHoverIndex(null)}
        >
          <Liveline
            badge={false}
            color={color}
            cursor="crosshair"
            data={data}
            exaggerate
            fill={false}
            formatTime={(time) => dayLabelAt(time, data)}
            formatValue={(v) => formatNumber(Math.round(v))}
            grid
            key={metric}
            lineWidth={2.25}
            momentum={false}
            padding={CHART_PAD}
            paused
            pulse={false}
            referenceLine={{
              value:
                metric === 'requests'
                  ? totals.avgRequests
                  : Math.round(totals.totalFailures / 7),
              label: '均值',
            }}
            scrub={false}
            theme={theme}
            value={value}
            window={56}
          />
          <ChartHoverLayer
            hoverIndex={hoverIndex}
            pointCount={mockAiDayLabels.length}
            rows={[
              {
                color,
                label: metric === 'requests' ? 'AI 请求' : '失败请求',
                value: formatNumber(rawValues[hoverIndex ?? 0]),
              },
            ]}
            styles={styles}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
          {formatNumber(totals.peakRequests)} 次
        </span>
        <span className="text-xs tabular-nums text-[#9a2827]">
          {totals.spikeLabel}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          高于周均值
        </span>
      </div>
    </div>
  );
}

function AllocationUsage({ styles }: { styles: Styles }) {
  const [selected, setSelected] = useState<string>(mockAiUsageAllocation[0].id);
  const active =
    mockAiUsageAllocation.find((segment) => segment.id === selected) ??
    mockAiUsageAllocation[0];

  return (
    <div className={styles.innerCard}>
      <div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100">
          <span
            className={`flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white ${active.barClass}`}
          >
            {active.short}
          </span>
          应用请求占比
        </span>
        <span className="mt-1 block text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
          {active.amount}
        </span>
      </div>

      <div className="flex h-8 gap-0.5 overflow-hidden rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800">
        {mockAiUsageAllocation.map((segment) => (
          <button
            aria-label={`${segment.label}: ${segment.pct}%`}
            aria-pressed={selected === segment.id}
            className={`h-full rounded-full ${segment.barClass} transition-opacity duration-200`}
            key={segment.id}
            onClick={() => setSelected(segment.id)}
            style={{
              opacity: selected === segment.id ? 1 : 0.5,
              width: `${segment.pct}%`,
            }}
            type="button"
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {mockAiUsageAllocation.map((segment) => (
          <button
            aria-pressed={selected === segment.id}
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
              selected === segment.id
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900'
            }`}
            key={segment.id}
            onClick={() => setSelected(segment.id)}
            type="button"
          >
            <span className={`size-1.5 rounded-full ${segment.barClass}`} />
            {segment.label}
            <span className="tabular-nums">{segment.pct}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const ALL_INSIGHT_PAGES = [
  {
    key: 'compare',
    prose: (
      <>
        本周 <Entity name="xOneAI" toneClass="bg-[#f68f3c]" />{' '}
        中最耗用量的是输入 Token，较上周{' '}
        <span className="tabular-nums text-[#9a2827]">{totals.inputDelta}</span>
        。
      </>
    ),
    Body: CompareUsage,
  },
  {
    key: 'allocation',
    prose: (
      <>
        请求主要集中在 <Entity name="xOneAI" toneClass="bg-[#975FE4]" />
        ，占{' '}
        <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
          {totals.xoneaiShare}
        </span>
        。
      </>
    ),
    Body: AllocationUsage,
  },
  {
    key: 'anomaly',
    prose: (
      <>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {totals.peakDayLabel}
        </span>{' '}
        请求峰值 {formatNumber(totals.peakRequests)}，较周均值{' '}
        <span className="tabular-nums text-[#9a2827]">{totals.spikeLabel}</span>
        。
      </>
    ),
    Body: AnomalyUsage,
  },
] as const;

// ponytail: allocation page hidden; drop this filter to show it again.
const INSIGHT_PAGES = ALL_INSIGHT_PAGES.filter(
  (page) => page.key !== 'allocation',
);

/** 工作台 AI 用量洞察：单层卡片 + Liveline 轮播。 */
const PlatformUsageInsight = () => {
  const { styles } = useUsageInsightStyles();
  const [page, setPage] = useState(0);
  const { prose, Body } = INSIGHT_PAGES[page];

  const move = (direction: -1 | 1) => {
    setPage(
      (current) =>
        (current + direction + INSIGHT_PAGES.length) % INSIGHT_PAGES.length,
    );
  };

  return (
    <section
      aria-labelledby="platform-usage-insight-title"
      className={`${styles.root} flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900`}
      data-testid="platform-mock-chart"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-baseline gap-1.5">
          <h2
            className="m-0 text-sm font-semibold text-zinc-950 dark:text-zinc-50"
            id="platform-usage-insight-title"
          >
            AI 数据洞悉
          </h2>
          <span className="text-sm tabular-nums text-zinc-400 dark:text-zinc-500">
            {INSIGHT_PAGES.length}
          </span>
        </span>
        <span className="flex items-center">
          <button
            aria-label="上一条用量洞察"
            className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            onClick={() => move(-1)}
            type="button"
          >
            <LeftOutlined className="text-xs" />
          </button>
          <button
            aria-label="下一条用量洞察"
            className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            onClick={() => move(1)}
            type="button"
          >
            <RightOutlined className="text-xs" />
          </button>
        </span>
      </div>

      <Body styles={styles} />

      <p className="m-0 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
        {prose}
      </p>
    </section>
  );
};

export default PlatformUsageInsight;
