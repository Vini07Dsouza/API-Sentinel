import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-primary bg-primary/10 border-primary/20",
    success: "text-success bg-success/10 border-success/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    danger: "text-destructive bg-destructive/10 border-destructive/25",
  }[tone];
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow truncate">{label}</p>
        <span className={cn("flex size-7 items-center justify-center rounded-md border", toneClass)}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="tabular mt-3 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
