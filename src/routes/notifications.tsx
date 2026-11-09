import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertOctagon, BellOff, CheckCheck, CheckCircle2, Info, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageContainer, PageHeader, Panel, WorkspaceGate } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSentinel } from "@/lib/store/sentinel-store";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { AppData, NotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — API Sentinel" },
      { name: "description", content: "Alerts for downtime, degraded performance and recoveries." },
      { property: "og:title", content: "Notifications — API Sentinel" },
      { property: "og:description", content: "Alerts for downtime, degraded performance and recoveries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

const KIND_META: Record<NotificationKind, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  incident: { icon: AlertOctagon, tone: "text-destructive bg-destructive/10 border-destructive/25" },
  degraded: { icon: TriangleAlert, tone: "text-warning bg-warning/10 border-warning/25" },
  recovery: { icon: CheckCircle2, tone: "text-success bg-success/10 border-success/25" },
  system: { icon: Info, tone: "text-primary bg-primary/10 border-primary/25" },
};

function NotificationsPage() {
  return <WorkspaceGate>{(data) => <NotificationsView data={data} />}</WorkspaceGate>;
}

function NotificationsView({ data }: { data: AppData }) {
  const { actions } = useSentinel();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = data.notifications.filter((n) => !n.read).length;
  const list = data.notifications
    .filter((n) => filter === "all" || !n.read)
    .sort((a, b) => b.at - a.at);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={unread === 0}
            onClick={() => {
              actions.markAllNotificationsRead();
              toast.success("All notifications marked as read");
            }}
          >
            <CheckCheck /> Mark all read
          </Button>
        }
      />
      <Panel bodyClassName="p-0">
        <div className="border-b p-3 sm:p-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
            <TabsList>
              <TabsTrigger value="all">All ({data.notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unread})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {list.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === "unread" ? "No unread notifications" : "No notifications"}
            description="Alerts about downtime and recoveries will appear here."
          />
        ) : (
          <ul className="divide-y">
            {list.map((n) => {
              const meta = KIND_META[n.kind];
              return (
                <li key={n.id} className={cn("flex gap-3 px-4 py-4 sm:px-5", !n.read && "bg-primary/[0.04]")}>
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", meta.tone)}>
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className={cn("text-sm", n.read ? "font-medium text-foreground/90" : "font-semibold text-foreground")}>
                        {!n.read ? <span className="mr-2 inline-block size-1.5 rounded-full bg-primary align-middle" aria-label="Unread" /> : null}
                        {n.title}
                      </p>
                      <time className="text-xs text-muted-foreground" title={formatDateTime(n.at)}>
                        {formatRelative(n.at)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.incidentId && data.incidents.some((i) => i.id === n.incidentId) ? (
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <Link
                            to="/incidents/$incidentId"
                            params={{ incidentId: n.incidentId }}
                            onClick={() => actions.markNotificationRead(n.id)}
                          >
                            View incident
                          </Link>
                        </Button>
                      ) : null}
                      {!n.read ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => actions.markNotificationRead(n.id)}>
                          Mark read
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => actions.deleteNotification(n.id)}
                        aria-label={`Dismiss ${n.title}`}
                      >
                        <Trash2 className="size-3" /> Dismiss
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </PageContainer>
  );
}
