import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IncidentSeverity, IncidentStatus, MonitorStatus } from "@/lib/types";

export const MONITOR_STATUS_META: Record<
  MonitorStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]>; dot: string }
> = {
  operational: { label: "Operational", variant: "success", dot: "bg-success text-success" },
  degraded: { label: "Degraded", variant: "warning", dot: "bg-warning text-warning" },
  down: { label: "Down", variant: "danger", dot: "bg-destructive text-destructive" },
  paused: { label: "Paused", variant: "muted", dot: "bg-muted-foreground text-muted-foreground" },
  pending: { label: "Not checked", variant: "info", dot: "bg-primary text-primary" },
};

export function StatusDot({ status, className }: { status: MonitorStatus; className?: string }) {
  const meta = MONITOR_STATUS_META[status];
  const pulse = status === "down" || status === "degraded";
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", meta.dot, pulse && "status-dot-pulse", className)}
    />
  );
}

export function MonitorStatusBadge({ status }: { status: MonitorStatus }) {
  const meta = MONITOR_STATUS_META[status];
  return (
    <Badge variant={meta.variant}>
      <StatusDot status={status} className="size-1.5" />
      {meta.label}
    </Badge>
  );
}

const SEVERITY_META: Record<IncidentSeverity, { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  critical: { label: "Critical", variant: "danger" },
  major: { label: "Major", variant: "warning" },
  minor: { label: "Minor", variant: "info" },
};

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const meta = SEVERITY_META[severity];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const INCIDENT_STATUS_META: Record<IncidentStatus, { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  open: { label: "Open", variant: "danger" },
  acknowledged: { label: "Acknowledged", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const meta = INCIDENT_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function MethodBadge({ method }: { method: string }) {
  return <Badge variant="mono">{method}</Badge>;
}
