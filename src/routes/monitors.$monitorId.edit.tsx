import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageContainer, PageHeader, Panel, WorkspaceGate } from "@/components/layout/page";
import { MonitorForm } from "@/components/monitors/monitor-form";
import { Button } from "@/components/ui/button";
import { useSentinel } from "@/lib/store/sentinel-store";

export const Route = createFileRoute("/monitors/$monitorId/edit")({
  head: () => ({
    meta: [
      { title: "Edit monitor — API Sentinel" },
      { name: "description", content: "Update endpoint, interval, timeout and authentication for a monitor." },
      { property: "og:title", content: "Edit monitor — API Sentinel" },
      { property: "og:description", content: "Update a monitor's configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditMonitorPage,
});

function EditMonitorPage() {
  const { monitorId } = Route.useParams();
  const { actions } = useSentinel();
  const navigate = useNavigate();

  return (
    <WorkspaceGate>
      {(data) => {
        const monitor = data.monitors.find((m) => m.id === monitorId);
        if (!monitor) {
          return (
            <PageContainer className="max-w-3xl">
              <Panel>
                <EmptyState
                  icon={SearchX}
                  title="Monitor not found"
                  description="It may have been deleted."
                  action={
                    <Button asChild>
                      <Link to="/monitors">Back to monitors</Link>
                    </Button>
                  }
                />
              </Panel>
            </PageContainer>
          );
        }
        return (
          <PageContainer className="max-w-3xl">
            <PageHeader title={`Edit ${monitor.name}`} description="Changes apply from the next check." />
            <MonitorForm
              key={monitor.id}
              monitor={monitor}
              submitLabel="Save changes"
              defaults={{
                intervalSeconds: data.settings.monitoring.defaultIntervalSeconds,
                timeoutMs: data.settings.monitoring.defaultTimeoutMs,
              }}
              onCancel={() => navigate({ to: "/monitors" })}
              onSubmit={(input) => {
                actions.updateMonitor(monitor.id, input);
                toast.success("Monitor updated", { description: input.name });
                navigate({ to: "/monitors" });
              }}
            />
          </PageContainer>
        );
      }}
    </WorkspaceGate>
  );
}
