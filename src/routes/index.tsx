import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, AlertOctagon, ArrowRight, CheckCircle2, Gauge, Plus, Timer } from "lucide-react";

import { EmptyState, PageContainer, PageHeader, Panel, WorkspaceGate } from "@/components/layout/page";
import { StatCard } from "@/components/stat-card";
import { ResponseTimeChart, UptimeChart, UptimeStrip } from "@/components/charts/time-series-charts";
import { IncidentStatusBadge, MonitorStatusBadge, SeverityBadge, StatusDot } from "@/components/status/status-badges";
import { Button } from "@/components/ui/button";
import { bucketize, checksInWindow, DAY, HOUR, latencyStats, uptimePercent } from "@/lib/monitoring/metrics";
import { summarizeMonitors } from "@/lib/store/sentinel-store";
import { formatMs, formatPercent, formatRelative, hostOf } from "@/lib/format";
import type { AppData } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — API Sentinel" },
      { name: "description", content: "Live overview of endpoint availability, response times and incidents." },
      { property: "og:title", content: "Dashboard — API Sentinel" },
      { property: "og:description", content: "Live overview of endpoint availability, response times and incidents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return <WorkspaceGate>{(data) => <Dashboard data={data} />}</WorkspaceGate>;
}

function Dashboard({ data }: { data: AppData }) {
  const now = Date.now();
  const summaries = useMemo(() => summarizeMonitors(data, now), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const activeIds = new Set(data.monitors.filter((m) => !m.paused).map((m) => m.id));
    const activeChecks = data.checks.filter((c) => activeIds.has(c.monitorId));
    const last24 = checksInWindow(activeChecks, now - DAY, now);
    const last30 = checksInWindow(activeChecks, now - 30 * DAY, now);
    return {
      total: data.monitors.length,
      paused: data.monitors.filter((m) => m.paused).length,
      operational: summaries.filter((s) => s.status === "operational").length,
      degraded: summaries.filter((s) => s.status === "degraded").length,
      down: summaries.filter((s) => s.status === "down").length,
      activeIncidents: data.incidents.filter((i) => i.status !== "resolved"),
      uptime30: uptimePercent(last30),
      avg24: latencyStats(last24).avg,
      responseBuckets: bucketize(last24, now - DAY, now, HOUR),
      uptimeBuckets: bucketize(last30, now - 30 * DAY, now, DAY),
    };
  }, [data, summaries]); // eslint-disable-line react-hooks/exhaustive-deps

  const activity = useMemo(() => {
    const monitorName = new Map(data.monitors.map((m) => [m.id, m.name]));
    return data.incidents
      .flatMap((incident) =>
        incident.events.map((event) => ({ incident, event, monitor: monitorName.get(incident.monitorId) ?? "Unknown" })),
      )
      .sort((a, b) => b.event.at - a.event.at)
      .slice(0, 7);
  }, [data]);

  if (data.monitors.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard" description="Overview of your monitored APIs." />
        <Panel>
          <EmptyState
            icon={Activity}
            title="No monitors yet"
            description="Add your first API endpoint to start tracking availability and response times."
            action={
              <Button asChild>
                <Link to="/monitors/new">
                  <Plus /> Add monitor
                </Link>
              </Button>
            }
          />
        </Panel>
      </PageContainer>
    );
  }

  const target = data.settings.thresholds.uptimeTarget;

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={
          stats.down > 0
            ? `${stats.down} endpoint${stats.down > 1 ? "s are" : " is"} currently down.`
            : stats.degraded > 0
              ? `${stats.degraded} endpoint${stats.degraded > 1 ? "s are" : " is"} degraded. Everything else is operational.`
              : "All active endpoints are operational."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/analytics">
              View analytics <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Monitored" value={stats.total} hint={`${stats.paused} paused`} icon={Activity} />
        <StatCard
          label="Operational"
          value={`${stats.operational}/${stats.total - stats.paused}`}
          hint={`${stats.degraded} degraded · ${stats.down} down`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Active incidents"
          value={stats.activeIncidents.length}
          hint={`${stats.activeIncidents.filter((i) => i.severity === "critical").length} critical`}
          icon={AlertOctagon}
          tone={stats.activeIncidents.length > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Uptime · 30d"
          value={formatPercent(stats.uptime30)}
          hint={`Target ${target}%`}
          icon={Gauge}
          tone={stats.uptime30 !== null && stats.uptime30 < target ? "warning" : "success"}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard label="Avg response · 24h" value={formatMs(stats.avg24)} hint="Across active monitors" icon={Timer} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Response time" description="Hourly average, last 24 hours" bodyClassName="p-3 sm:p-5">
          <ResponseTimeChart
            buckets={stats.responseBuckets}
            bucketMs={HOUR}
            threshold={data.settings.thresholds.latencyWarningMs}
          />
        </Panel>
        <Panel title="Uptime trend" description="Daily uptime, last 30 days" bodyClassName="p-3 sm:p-5">
          <UptimeChart buckets={stats.uptimeBuckets} bucketMs={DAY} target={target} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Monitored endpoints"
          description="Current status and 30-day availability"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/monitors">
                All monitors <ArrowRight />
              </Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {summaries.slice(0, 8).map((s) => (
              <li key={s.monitor.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <StatusDot status={s.status} />
                  <div className="min-w-0">
                    <Link
                      to="/monitors/$monitorId/edit"
                      params={{ monitorId: s.monitor.id }}
                      className="block truncate text-sm font-medium text-foreground hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                    >
                      {s.monitor.name}
                    </Link>
                    <p className="truncate font-mono text-xs text-muted-foreground">{hostOf(s.monitor.url)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:w-[340px]">
                  <UptimeStrip
                    className="hidden flex-1 md:flex"
                    buckets={bucketize(checksInWindow(s.checks, now - 30 * DAY, now), now - 30 * DAY, now, DAY)}
                  />
                  <span className="tabular w-16 text-right font-mono text-xs text-muted-foreground">{formatMs(s.avg24h)}</span>
                  <span className="ml-auto sm:ml-0">
                    <MonitorStatusBadge status={s.status} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="lg:col-span-2"
          title="Recent incident activity"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/incidents">
                Incidents <ArrowRight />
              </Link>
            </Button>
          }
        >
          {activity.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No incidents" description="Incident activity will show up here." />
          ) : (
            <ol className="divide-y">
              {activity.map(({ incident, event, monitor }) => (
                <li key={`${incident.id}-${event.at}-${event.type}`}>
                  <Link
                    to="/incidents/$incidentId"
                    params={{ incidentId: incident.id }}
                    className="block px-5 py-3 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{monitor}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(event.at)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{event.message}</p>
                    <div className="mt-2 flex gap-1.5">
                      <SeverityBadge severity={incident.severity} />
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </PageContainer>
  );
}
