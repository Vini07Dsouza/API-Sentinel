import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageContainer, PageHeader, WorkspaceGate } from "@/components/layout/page";
import { MonitorForm } from "@/components/monitors/monitor-form";
import { useSentinel } from "@/lib/store/sentinel-store";

export const Route = createFileRoute("/monitors/new")({
  head: () => ({
    meta: [
      { title: "Add monitor — API Sentinel" },
      { name: "description", content: "Register a new API endpoint to monitor for availability and latency." },
      { property: "og:title", content: "Add monitor — API Sentinel" },
      { property: "og:description", content: "Register a new API endpoint to monitor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewMonitorPage,
});

function NewMonitorPage() {
  const { actions } = useSentinel();
  const navigate = useNavigate();
  return (
    <WorkspaceGate>
      {(data) => (
        <PageContainer className="max-w-3xl">
          <PageHeader title="Add monitor" description="Register an endpoint. You can test the connection before saving." />
          <MonitorForm
            submitLabel="Save monitor"
            defaults={{
              intervalSeconds: data.settings.monitoring.defaultIntervalSeconds,
              timeoutMs: data.settings.monitoring.defaultTimeoutMs,
            }}
            onCancel={() => navigate({ to: "/monitors" })}
            onSubmit={(input) => {
              actions.addMonitor(input);
              toast.success("Monitor created", { description: `${input.name} has been added.` });
              navigate({ to: "/monitors" });
            }}
          />
        </PageContainer>
      )}
    </WorkspaceGate>
  );
}
