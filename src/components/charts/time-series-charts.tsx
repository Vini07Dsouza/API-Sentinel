import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface ResponsePoint {
  t: number;
  avgMs: number | null;
  maxMs?: number | null;
}

export interface UptimeSeriesPoint {
  t: number;
  uptime: number | null;
}

/** Picks an axis label format from the time span covered by the data. */
function tickFormatter(points: { t: number }[]) {
  const first = points[0]?.t ?? 0;
  const last = points[points.length - 1]?.t ?? 0;
  const span = last - first;
  const pattern = span > 3 * 86400000 ? "MMM d" : span > 86400000 ? "MMM d HH:mm" : "HH:mm";
  return (t: number) => format(t, pattern);
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-mono font-medium text-foreground">{value}</span>
    </div>
  );
}

const labelFromPayload = (_: unknown, payload: { payload?: { t?: number } }[] | undefined) => {
  const t = payload?.[0]?.payload?.t;
  return t ? format(t, "MMM d, HH:mm") : "";
};

const responseConfig = {
  avgMs: { label: "Avg response", color: "var(--chart-1)" },
  maxMs: { label: "Max response", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function ResponseTimeChart({
  points,
  showMax = false,
  threshold,
  className,
}: {
  points: ResponsePoint[];
  showMax?: boolean;
  threshold?: number;
  className?: string;
}) {
  return (
    <ChartContainer config={responseConfig} className={cn("aspect-auto h-64 w-full", className)}>
      <AreaChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-avgMs)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-avgMs)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="t" tickFormatter={tickFormatter(points)} tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
        <YAxis width={52} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`)} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={labelFromPayload}
              formatter={(value, name) => (
                <TooltipRow label={responseConfig[name as keyof typeof responseConfig]?.label ?? String(name)} value={`${Math.round(Number(value))} ms`} />
              )}
            />
          }
        />
        {threshold ? <ReferenceLine y={threshold} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.7} /> : null}
        {showMax ? (
          <Area dataKey="maxMs" type="monotone" stroke="var(--color-maxMs)" fill="transparent" strokeWidth={1.25} strokeDasharray="4 3" connectNulls />
        ) : null}
        <Area dataKey="avgMs" type="monotone" stroke="var(--color-avgMs)" fill="url(#fillAvg)" strokeWidth={2} connectNulls />
      </AreaChart>
    </ChartContainer>
  );
}

const uptimeConfig = { uptime: { label: "Uptime", color: "var(--chart-3)" } } satisfies ChartConfig;

export function UptimeChart({ points, target, className }: { points: UptimeSeriesPoint[]; target?: number; className?: string }) {
  const values = points.map((b) => b.uptime).filter((v): v is number => v !== null);
  const min = values.length ? Math.min(...values, target ?? 100) : 95;
  const domainMin = Math.max(0, Math.floor(min - 1));
  return (
    <ChartContainer config={uptimeConfig} className={cn("aspect-auto h-64 w-full", className)}>
      <LineChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="t" tickFormatter={tickFormatter(points)} tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
        <YAxis width={48} domain={[domainMin, 100]} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={labelFromPayload}
              formatter={(value) => <TooltipRow label="Uptime" value={`${Number(value).toFixed(2)}%`} />}
            />
          }
        />
        {target ? <ReferenceLine y={target} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.6} /> : null}
        <Line dataKey="uptime" type="monotone" stroke="var(--color-uptime)" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}

export function SimpleBarChart({
  data,
  valueLabel,
  valueFormatter = (v) => String(v),
  color = "var(--chart-1)",
  className,
  layout = "horizontal",
}: {
  data: { label: string; value: number }[];
  valueLabel: string;
  valueFormatter?: (v: number) => string;
  color?: string;
  className?: string;
  layout?: "horizontal" | "vertical";
}) {
  const config = { value: { label: valueLabel, color } } satisfies ChartConfig;
  const tooltip = (
    <ChartTooltip content={<ChartTooltipContent formatter={(value) => <TooltipRow label={valueLabel} value={valueFormatter(Number(value))} />} />} />
  );
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      {layout === "vertical" ? (
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          {tooltip}
          <Bar dataKey="value" fill="var(--color-value)" radius={4} maxBarSize={18} />
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
          {tooltip}
          <Bar dataKey="value" fill="var(--color-value)" fillOpacity={0.85} radius={4} maxBarSize={44} />
        </BarChart>
      )}
    </ChartContainer>
  );
}
