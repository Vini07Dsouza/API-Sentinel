import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, SearchX } from "lucide-react";

import { EmptyState, PageContainer, PageHeader, Panel, WorkspaceGate } from "@/components/layout/page";
import { IncidentStatusBadge, SeverityBadge } from "@/components/status/status-badges";
import { IncidentActions } from "@/components/incidents/incident-actions";
import { Timeline } from "@/components/incidents/timeline";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/format";
import type { AppData, IncidentSeverity } from "@/lib/types";

export const Route = createFileRoute("/incidents/")({
  head: () => ({
    meta: [
      { title: "Incidents — API Sentinel" },
      { name: "description", content: "Track, acknowledge and resolve API incidents with a full history timeline." },
      { property: "og:title", content: "Incidents — API Sentinel" },
      { property: "og:description", content: "Track, acknowledge and resolve API incidents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentsPage,
});

function IncidentsPage() {
  return <WorkspaceGate>{(data) => <IncidentsView data={data} />}</WorkspaceGate>;
}

type View = "active" | "resolved" | "all";

function IncidentsView({ data }: { data: AppData }) {
  const [view, setView] = useState<View>("active");
  const [severity, setSeverity] = useState<IncidentSeverity | "all">("all");
  const now = Date.now();
  const monitorName = useMemo(() => new Map(data.monitors.map((m) => [m.id, m.name])), [data.monitors]);

  const counts = {
    active: data.incidents.filter((i) => i.status !== "resolved").length,
    resolved: data.incidents.filter((i) => i.status === "resolved").length,
    all: data.incidents.length,
  };

  const rows = data.incidents
    .filter((i) => (view === "all" ? true : view === "active" ? i.status !== "resolved" : i.status === "resolved"))
    .filter((i) => severity === "all" || i.severity === severity)
    .sort((a, b) => b.startedAt - a.startedAt);

  const history = useMemo(
    () =>
      data.incidents
        .flatMap((incident) =>
          incident.events
            .filter((e) => e.type === "opened" || e.type === "resolved")
            .map((event) => ({ incident, event })),
        )
        .sort((a, b) => b.event.at - a.event.at)
        .slice(0, 10),
    [data.incidents],
  );

  return (
    <PageContainer>
      <PageHeader title="Incidents" description={`${counts.active} active · ${counts.resolved} resolved`} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" bodyClassName="p-0">
          <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity | "all")}>
              <SelectTrigger className="sm:w-40" aria-label="Filter by severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            view === "active" && severity === "all" ? (
              <EmptyState icon={CheckCircle2} title="No active incidents" description="All monitored endpoints are healthy." />
            ) : (
              <EmptyState icon={SearchX} title="No incidents match" description="Try another filter." />
            )
          ) : (
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Severity</TableHead>
                  <TableHead>Incident</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="pl-5">
                      <SeverityBadge severity={incident.severity} />
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <Link
                        to="/incidents/$incidentId"
                        params={{ incidentId: incident.id }}
                        className="block truncate font-medium hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                      >
                        {incident.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {monitorName.get(incident.monitorId) ?? "Deleted monitor"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(incident.startedAt)}
                      <span className="block text-[0.7rem]">{formatRelative(incident.startedAt)}</span>
                    </TableCell>
                    <TableCell className="tabular font-mono text-xs">
                      {formatDuration((incident.resolvedAt ?? now) - incident.startedAt)}
                    </TableCell>
                    <TableCell>
                      <IncidentStatusBadge status={incident.status} />
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex justify-end gap-2">
                        <IncidentActions incident={incident} />
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/incidents/$incidentId" params={{ incidentId: incident.id }} aria-label={`View ${incident.title}`}>
                            <ArrowRight />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel title="Incident history" description="Recent openings and resolutions">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incident history yet.</p>
          ) : (
            <Timeline
              items={history.map(({ incident, event }) => ({
                key: `${incident.id}-${event.type}-${event.at}`,
                event,
                title: (
                  <Link
                    to="/incidents/$incidentId"
                    params={{ incidentId: incident.id }}
                    className="hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                  >
                    {monitorName.get(incident.monitorId) ?? "Deleted monitor"} {event.type === "opened" ? "went down" : "recovered"}
                  </Link>
                ),
              }))}
            />
          )}
        </Panel>
      </div>
    </PageContainer>
  );
}
