import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card sm:p-5" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-7 rounded-md" />
      </div>
      <Skeleton className="mt-4 h-7 w-24" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading chart" className={cn("flex h-64 items-end gap-2 px-2", className)}>
      {[40, 65, 50, 80, 55, 70, 45, 85, 60, 75, 50, 68].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          {Array.from({ length: columns - 1 }).map((_, c) => (
            <Skeleton key={c} className="hidden h-5 w-16 sm:block" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2 px-5 py-4">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
