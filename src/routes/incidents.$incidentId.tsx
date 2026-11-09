import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageContainer, Panel, WorkspaceGate } from "@/components/layout/page";
import { IncidentStatusBadge, MethodBadge, SeverityBadge } from "@/components/status/status-badges";
import { IncidentActions } from "@/components/incidents/incident-actions";
import { Timeline } from "@/components/incidents/timeline";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSentinel } from "@/lib/store/sentinel-store";
import { formatDateTime, formatDuration, formatMs } from "@/lib/format";
import { failureDistribution, latencyStats } from "@/lib/monitoring/metrics";
import type { AppData, Incident } from "@/lib/types";

export const Route = createFileRoute("/incidents/$incidentId")({
  head: () => ({
    meta: [
      { title: "Incident details — API Sentinel" },
      { name: "description", content: "Incident timeline, affected API and resolution actions." },
      { property: "og:title", content: "Incident details — API Sentinel" },
      { property: "og:description", content: "Incident timeline, affected API and resolution actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentDetailPage,
});

function IncidentDetailPage() {
  const { incidentId } = Route.useParams();
  return (
    <WorkspaceGate>
      {(data) => {
        const incident = data.incidents.find((i) => i.id === incidentId);
        if (!incident) {
          return (
            <PageContainer className="max-w-4xl">
              <Panel>
                <EmptyState
                  icon={SearchX}
                  title="Incident not found"
                  description="It may have been removed together with its monitor."
                  action={
                    <Button asChild>
                      <Link to="/incidents">Back to incidents</Link>
                    </Button>
                  }
                />
              </Panel>
            </PageContainer>
          );
        }
        return <IncidentDetail data={data} incident={incident} />;
      }}
    </WorkspaceGate>
  );
}

function IncidentDetail({ data, incident }: { data: AppData; incident: Incident }) {
  const { actions } = useSentinel();
  const [note, setNote] = useState("");
  const monitor = data.monitors.find((m) => m.id === incident.monitorId);
  const end = incident.resolvedAt ?? Date.now();
  const windowChecks = data.checks.filter((c) => c.monitorId === incident.monitorId && c.at >= incident.startedAt - 60 * 60000 && c.at <= end);
  const failures = windowChecks.filter((c) => !c.ok);
  const latency = latencyStats(windowChecks);
  const codes = failureDistribution(windowChecks);

  return (
    <PageContainer className="max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link to="/incidents">
          <ArrowLeft /> All incidents
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <SeverityBadge severity={incident.severity} />
            <IncidentStatusBadge status={incident.status} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{incident.title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{incident.id}</p>
        </div>
        <IncidentActions incident={incident} size="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Timeline">
            <Timeline
              items={[...incident.events]
                .sort((a, b) => a.at - b.at)
                .map((event, i) => ({ key: `${event.at}-${i}`, event }))}
            />
            <form
              className="mt-6 space-y-2 border-t pt-5"
              onSubmit={(e) => {
                e.preventDefault();
                const message = note.trim();
                if (!message) return;
                actions.addIncidentNote(incident.id, message);
                setNote("");
                toast.success("Note added");
              }}
            >
              <Label htmlFor="incident-note">Add an update</Label>
              <Textarea
                id="incident-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Investigating elevated error rates from the upstream provider…"
                maxLength={1000}
                rows={3}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={!note.trim()}>
                  Post update
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Affected API">
            {monitor ? (
              <div className="space-y-2">
                <Link
                  to="/monitors/$monitorId/edit"
                  params={{ monitorId: monitor.id }}
                  className="block font-medium hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  {monitor.name}
                </Link>
                <div className="flex min-w-0 items-center gap-2">
                  <MethodBadge method={monitor.method} />
                  <span className="truncate font-mono text-xs text-muted-foreground" title={monitor.url}>
                    {monitor.url}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This monitor has been deleted.</p>
            )}
          </Panel>
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Started</dt>
              <dd className="text-right">{formatDateTime(incident.startedAt)}</dd>
              <dt className="text-muted-foreground">Acknowledged</dt>
              <dd className="text-right">{incident.acknowledgedAt ? formatDateTime(incident.acknowledgedAt) : "—"}</dd>
              <dt className="text-muted-foreground">Resolved</dt>
              <dd className="text-right">{incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "—"}</dd>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="tabular text-right font-mono">{formatDuration(end - incident.startedAt)}</dd>
              <dt className="text-muted-foreground">Failed checks</dt>
              <dd className="tabular text-right font-mono">
                {failures.length} / {windowChecks.length}
              </dd>
              <dt className="text-muted-foreground">Avg latency</dt>
              <dd className="tabular text-right font-mono">{formatMs(latency.avg)}</dd>
              <dt className="text-muted-foreground">Error codes</dt>
              <dd className="text-right font-mono text-xs">{codes.length ? codes.map((c) => `${c.code}×${c.count}`).join(", ") : "—"}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </PageContainer>
  );
}
