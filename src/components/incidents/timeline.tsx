import { AlertOctagon, CheckCircle2, Eye, MessageSquare, RefreshCw } from "lucide-react";

import { formatDateTime, formatRelative } from "@/lib/format";
import type { IncidentEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const EVENT_META: Record<IncidentEvent["type"], { icon: React.ComponentType<{ className?: string }>; tone: string; label: string }> = {
  opened: { icon: AlertOctagon, tone: "text-destructive border-destructive/30 bg-destructive/10", label: "Opened" },
  acknowledged: { icon: Eye, tone: "text-warning border-warning/30 bg-warning/10", label: "Acknowledged" },
  update: { icon: RefreshCw, tone: "text-primary border-primary/30 bg-primary/10", label: "Update" },
  note: { icon: MessageSquare, tone: "text-muted-foreground border-border bg-secondary", label: "Note" },
  resolved: { icon: CheckCircle2, tone: "text-success border-success/30 bg-success/10", label: "Resolved" },
};

export function Timeline({
  items,
}: {
  items: { key: string; event: IncidentEvent; title?: React.ReactNode }[];
}) {
  return (
    <ol className="relative space-y-5">
      {items.map(({ key, event, title }, i) => {
        const meta = EVENT_META[event.type];
        return (
          <li key={key} className="relative flex gap-3">
            {i < items.length - 1 ? (
              <span aria-hidden className="absolute left-[13px] top-8 bottom-[-20px] w-px bg-border" />
            ) : null}
            <span className={cn("relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border", meta.tone)}>
              <meta.icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium text-foreground">{title ?? meta.label}</p>
                <time dateTime={new Date(event.at).toISOString()} className="text-xs text-muted-foreground" title={formatDateTime(event.at)}>
                  {formatDateTime(event.at)} · {formatRelative(event.at)}
                </time>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{event.message}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
