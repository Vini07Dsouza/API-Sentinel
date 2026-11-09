import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, BarChart3, CheckCircle2, Gauge, Timer } from "lucide-react";

import { EmptyState, PageContainer, PageHeader, Panel, WorkspaceGate } from "@/components/layout/page";
import { StatCard } from "@/components/stat-card";
import { ResponseTimeChart, SimpleBarChart, UptimeChart } from "@/components/charts/time-series-charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusDot } from "@/components/status/status-badges";
import {
  bucketize,
  checksInWindow,
  deriveStatus,
  failureDistribution,
  latencyStats,
  PERIODS,
  uptimePercent,
  type Period,
} from "@/lib/monitoring/metrics";
import { formatMs, formatPercent } from "@/lib/format";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — API Sentinel" },
      { name: "description", content: "Uptime, latency and failure analytics across your monitored APIs." },
      { property: "og:title", content: "Analytics — API Sentinel" },
      { property: "og:description", content: "Uptime, latency and failure analytics across your monitored APIs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return <WorkspaceGate>{(data) => <AnalyticsView data={data} />}</WorkspaceGate>;
}

function AnalyticsView({ data }: { data: AppData }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [monitorId, setMonitorId] = useState<string>("all");

  const result = useMemo(() => {
    const now = Date.now();
    const { ms, bucketMs } = PERIODS[period];
    const from = now - ms;
    const scoped = data.checks.filter((c) => monitorId === "all" || c.monitorId === monitorId);
    const inWindow = checksInWindow(scoped, from, now);
    const comparison = data.monitors.map((m) => {
      const mc = inWindow.filter((c) => c.monitorId === m.id);
      const all = data.checks.filter((c) => c.monitorId === m.id);
      return {
        monitor: m,
        status: deriveStatus(m, all[all.length - 1], data.settings.thresholds),
        uptime: uptimePercent(mc),
        latency: latencyStats(mc),
        failures: mc.filter((c) => !c.ok).length,
        checks: mc.length,
      };
    });
    return {
      bucketMs,
      buckets: bucketize(inWindow, from, now, bucketMs),
      uptime: uptimePercent(inWindow),
      latency: latencyStats(inWindow),
      failures: failureDistribution(inWindow),
      totalChecks: inWindow.length,
      comparison,
    };
  }, [data, period, monitorId]);

  if (data.monitors.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" />
        <Panel>
          <EmptyState icon={BarChart3} title="No data yet" description="Add a monitor and run checks to see analytics." />
        </Panel>
      </PageContainer>
    );
  }

  const target = data.settings.thresholds.uptimeTarget;
  const comparisonBars = result.comparison
    .filter((c) => c.latency.avg !== null)
    .map((c) => ({ label: c.monitor.name, value: Math.round(c.latency.avg ?? 0) }))
    .sort((a, b) => b.value - a.value);

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description={`${result.totalChecks.toLocaleString()} checks · ${PERIODS[period].label.toLowerCase()}`}
        actions={
          <>
            <Select value={monitorId} onValueChange={setMonitorId}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Endpoint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All endpoints</SelectItem>
                {data.monitors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(v) => v && setPeriod(v as Period)}
              variant="outline"
              aria-label="Time period"
            >
              {(Object.keys(PERIODS) as Period[]).map((p) => (
                <ToggleGroupItem key={p} value={p} aria-label={PERIODS[p].label} className="px-3 font-mono text-xs">
                  {p}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Uptime"
          value={formatPercent(result.uptime, 3)}
          hint={`Target ${target}%`}
          icon={Gauge}
          tone={result.uptime !== null && result.uptime < target ? "warning" : "success"}
        />
        <StatCard label="Avg latency" value={formatMs(result.latency.avg)} hint={`p95 ${formatMs(result.latency.p95)}`} icon={Timer} />
        <StatCard label="Min latency" value={formatMs(result.latency.min)} icon={ArrowDownToLine} tone="success" />
        <StatCard label="Max latency" value={formatMs(result.latency.max)} icon={ArrowUpToLine} tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Response time" description="Average and maximum per interval" bodyClassName="p-3 sm:p-5">
          <ResponseTimeChart buckets={result.buckets} bucketMs={result.bucketMs} showMax threshold={data.settings.thresholds.latencyWarningMs} />
        </Panel>
        <Panel title="Uptime" description="Availability per interval" bodyClassName="p-3 sm:p-5">
          <UptimeChart buckets={result.buckets} bucketMs={result.bucketMs} target={target} />
        </Panel>
        <Panel title="Failures by status code" description="Failed checks grouped by HTTP response" bodyClassName="p-3 sm:p-5">
          {result.failures.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No failures" description="Every check in this period succeeded." className="h-64" />
          ) : (
            <SimpleBarChart
              data={result.failures.map((f) => ({ label: f.code, value: f.count }))}
              valueLabel="Failed checks"
              color="var(--chart-5)"
            />
          )}
        </Panel>
        <Panel title="Average latency by endpoint" bodyClassName="p-3 sm:p-5">
          {comparisonBars.length === 0 ? (
            <EmptyState icon={BarChart3} title="No latency data" className="h-64" />
          ) : (
            <SimpleBarChart data={comparisonBars} valueLabel="Avg latency" valueFormatter={(v) => `${v} ms`} layout="vertical" color="var(--chart-2)" />
          )}
        </Panel>
      </div>

      <Panel className="mt-4" title="Endpoint comparison" description={PERIODS[period].label} bodyClassName="p-0">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Endpoint</TableHead>
              <TableHead className="text-right">Uptime</TableHead>
              <TableHead className="text-right">Avg</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead className="text-right">p95</TableHead>
              <TableHead className="pr-5 text-right">Failures</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.comparison.map((c) => (
              <TableRow key={c.monitor.id} className={cn(monitorId === c.monitor.id && "bg-accent/40")}>
                <TableCell className="pl-5">
                  <span className="flex items-center gap-2.5">
                    <StatusDot status={c.status} />
                    <span className="truncate font-medium">{c.monitor.name}</span>
                  </span>
                </TableCell>
                <TableCell className={cn("tabular text-right font-mono text-xs", c.uptime !== null && c.uptime < target && "text-warning")}>
                  {formatPercent(c.uptime)}
                </TableCell>
                <TableCell className="tabular text-right font-mono text-xs">{formatMs(c.latency.avg)}</TableCell>
                <TableCell className="tabular text-right font-mono text-xs">{formatMs(c.latency.min)}</TableCell>
                <TableCell className="tabular text-right font-mono text-xs">{formatMs(c.latency.max)}</TableCell>
                <TableCell className="tabular text-right font-mono text-xs">{formatMs(c.latency.p95)}</TableCell>
                <TableCell className={cn("tabular pr-5 text-right font-mono text-xs", c.failures > 0 && "text-destructive")}>
                  {c.failures} / {c.checks}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </PageContainer>
  );
}
