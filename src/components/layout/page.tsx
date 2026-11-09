import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSentinel } from "@/lib/store/sentinel-store";
import type { AppData } from "@/lib/types";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card text-card-foreground shadow-card", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-secondary">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <PageContainer>
      <div role="status" aria-label="Loading workspace" className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}

export function ErrorState({ message, onRetry, onReset }: { message: string; onRetry: () => void; onReset?: () => void }) {
  return (
    <PageContainer>
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-destructive" />
        <h2 className="mt-4 text-base font-semibold">Couldn't load your workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw /> Try again
          </Button>
          {onReset ? <Button onClick={onReset}>Reset to sample data</Button> : null}
        </div>
      </div>
    </PageContainer>
  );
}

/** Renders loading / error states and hands ready workspace data to children. */
export function WorkspaceGate({ children }: { children: (data: AppData) => ReactNode }) {
  const { state, retry, actions } = useSentinel();
  if (state.status === "loading") return <PageSkeleton />;
  if (state.status === "error") {
    return <ErrorState message={state.error} onRetry={retry} onReset={actions.resetSampleData} />;
  }
  return <>{children(state.data)}</>;
}
