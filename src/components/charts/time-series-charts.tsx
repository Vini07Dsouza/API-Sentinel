import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Bucket } from "@/lib/monitoring/metrics";
import { cn } from "@/lib/utils";

function tickFormatter(bucketMs: number) {
  return (t: number) => format(t, bucketMs >= 24 * 3600 * 1000 ? "MMM d" : bucketMs >= 6 * 3600 * 1000 ? "MMM d HH:mm" : "HH:mm");
}

const responseConfig = {
  avgMs: { label: "Avg response", color: "var(--chart-1)" },
  maxMs: { label: "Max response", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ResponseTimeChart({
  buckets,
  bucketMs,
  showMax = false,
  threshold,
  className,
}: {
  buckets: Bucket[];
  bucketMs: number;
  showMax?: boolean;
  threshold?: number;
  className?: string;
}) {
  const fmt = tickFormatter(bucketMs);
  return (
    <ChartContainer config={responseConfig} className={cn("aspect-auto h-64 w-full", className)}>
      <AreaChart data={buckets} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-avgMs)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-avgMs)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="t" tickFormatter={fmt} tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
        <YAxis width={52} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`)} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const t = payload?.[0]?.payload?.t as number | undefined;
                return t ? format(t, "MMM d, HH:mm") : "";
              }}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{responseConfig[name as keyof typeof responseConfig]?.label ?? name}</span>
                  <span className="tabular font-mono font-medium text-foreground">{value} ms</span>
                </div>
              )}
            />
          }
        />
        {threshold ? (
          <ReferenceLine y={threshold} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.6} />
        ) : null}
        {showMax ? (
          <Area dataKey="maxMs" type="monotone" stroke="var(--color-maxMs)" fill="transparent" strokeWidth={1.25} strokeDasharray="4 3" connectNulls />
        ) : null}
        <Area dataKey="avgMs" type="monotone" stroke="var(--color-avgMs)" fill="url(#fillAvg)" strokeWidth={2} connectNulls />
      </AreaChart>
    </ChartContainer>
  );
}

const uptimeConfig = { uptime: { label: "Uptime", color: "var(--chart-3)" } } satisfies ChartConfig;

export function UptimeChart({
  buckets,
  bucketMs,
  target,
  className,
}: {
  buckets: Bucket[];
  bucketMs: number;
  target?: number;
  className?: string;
}) {
  const fmt = tickFormatter(bucketMs);
  const values = buckets.map((b) => b.uptime).filter((v): v is number => v !== null);
  const min = values.length ? Math.min(...values, target ?? 100) : 95;
  const domainMin = Math.max(0, Math.floor(min - 1));
  return (
    <ChartContainer config={uptimeConfig} className={cn("aspect-auto h-64 w-full", className)}>
      <LineChart data={buckets} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="t" tickFormatter={fmt} tickLine={false} axisLine={false} minTickGap={32} tickMargin={8} />
        <YAxis width={48} domain={[domainMin, 100]} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const t = payload?.[0]?.payload?.t as number | undefined;
                return t ? format(t, "MMM d, HH:mm") : "";
              }}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="tabular font-mono font-medium text-foreground">{Number(value).toFixed(2)}%</span>
                </div>
              )}
            />
          }
        />
        {target ? <ReferenceLine y={target} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.6} /> : null}
        <Line dataKey="uptime" type="monotone" stroke="var(--color-uptime)" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}

const barConfig = { value: { label: "Value", color: "var(--chart-1)" } } satisfies ChartConfig;

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
  const config = { value: { ...barConfig.value, label: valueLabel, color } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      {layout === "vertical" ? (
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={valueFormatter} />
          <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{valueLabel}</span>
                    <span className="tabular font-mono font-medium text-foreground">{valueFormatter(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} maxBarSize={18} />
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{valueLabel}</span>
                    <span className="tabular font-mono font-medium text-foreground">{valueFormatter(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="value" fill="var(--color-value)" fillOpacity={0.85} radius={4} maxBarSize={44} />
        </BarChart>
      )}
    </ChartContainer>
  );
}

/** Small uptime bar strip (one bar per bucket), used in monitor lists. */
export function UptimeStrip({ buckets, className }: { buckets: Bucket[]; className?: string }) {
  return (
    <div className={cn("flex h-6 items-end gap-[2px]", className)} aria-hidden>
      {buckets.map((b) => {
        const tone =
          b.uptime === null
            ? "bg-muted"
            : b.uptime >= 99.5
              ? "bg-success/80"
              : b.uptime >= 95
                ? "bg-warning/80"
                : "bg-destructive/80";
        return <span key={b.t} className={cn("h-full min-w-[3px] flex-1 rounded-[2px]", tone)} />;
      })}
    </div>
  );
}
