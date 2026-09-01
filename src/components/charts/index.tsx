'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Chart wrappers.
 *
 * Deliberately plain: on a care product, a vitals chart exists so a nurse can see a shape
 * in two seconds, not so the page looks busy. So — one series per chart where possible,
 * no gradients, axis labels that name the unit, and a shaded band showing the configured
 * review range rather than a red "abnormal" zone (the platform does not diagnose).
 *
 * The palette is colour-blind safe and every series is also distinguishable by position
 * or label; charts never carry meaning in hue alone.
 */

const AXIS = { stroke: '#84909e', fontSize: 11 };
const GRID = '#eceef1';

export const SERIES_COLOURS = ['#0f7d73', '#175cd3', '#a35b06', '#7a3ea8', '#0d6340', '#b42318'];

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-md border border-dashed border-ink-200 px-4 text-center text-sm text-ink-500">
      {message}
    </div>
  );
}

export type TrendSeries = {
  key: string;
  label: string;
  colour?: string;
};

export function LineTrend({
  data,
  series,
  xKey = 'label',
  unit,
  height = 240,
  reviewBand,
  emptyMessage = 'Not enough readings yet to show a trend.',
}: {
  data: Record<string, string | number | null>[];
  series: TrendSeries[];
  xKey?: string;
  unit?: string;
  height?: number;
  /** The configured review range, shaded so a reading outside it is visually obvious. */
  reviewBand?: { low?: number | null; high?: number | null };
  emptyMessage?: string;
}) {
  if (!data.length) return <EmptyChart message={emptyMessage} />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {reviewBand && (reviewBand.low != null || reviewBand.high != null) ? (
            <ReferenceArea
              y1={reviewBand.low ?? undefined}
              y2={reviewBand.high ?? undefined}
              fill="#189c8d"
              fillOpacity={0.07}
              ifOverflow="extendDomain"
            />
          ) : null}
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={48}
            label={
              unit
                ? { value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#84909e' } }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #e7e2d7',
              fontSize: 12,
              boxShadow: '0 8px 24px -12px rgba(19,22,27,0.2)',
            }}
          />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, index) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.colour ?? SERIES_COLOURS[index % SERIES_COLOURS.length]}
              strokeWidth={2}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarSeries({
  data,
  series,
  xKey = 'label',
  height = 240,
  stacked,
  emptyMessage = 'No data for this period yet.',
}: {
  data: Record<string, string | number>[];
  series: TrendSeries[];
  xKey?: string;
  height?: number;
  stacked?: boolean;
  emptyMessage?: string;
}) {
  if (!data.length) return <EmptyChart message={emptyMessage} />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(24,156,141,0.06)' }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #e7e2d7',
              fontSize: 12,
            }}
          />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'a' : undefined}
              fill={s.colour ?? SERIES_COLOURS[index % SERIES_COLOURS.length]}
              radius={stacked ? 0 : [4, 4, 0, 0]}
              maxBarSize={44}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutSplit({
  data,
  height = 220,
  emptyMessage = 'Nothing to break down yet.',
}: {
  data: { label: string; value: number; colour?: string }[];
  height?: number;
  emptyMessage?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <EmptyChart message={emptyMessage} />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((item, index) => (
              <Cell key={item.label} fill={item.colour ?? SERIES_COLOURS[index % SERIES_COLOURS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e7e2d7', fontSize: 12 }}
            formatter={(value: number, name: string) => [
              `${value} (${Math.round((value / total) * 100)}%)`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny inline trend, for stat tiles. No axes — the shape is the whole point. */
export function Sparkline({
  data,
  colour = '#0f7d73',
  height = 40,
}: {
  data: { value: number }[];
  colour?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <Line type="monotone" dataKey="value" stroke={colour} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
