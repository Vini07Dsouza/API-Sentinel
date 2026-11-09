import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, PageContainer, PageHeader, Panel, WorkspaceGate } from "@/components/layout/page";
import { MethodBadge, MonitorStatusBadge, MONITOR_STATUS_META } from "@/components/status/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRunMonitorCheck } from "@/hooks/use-run-check";
import { summarizeMonitors, useSentinel, type MonitorSummary } from "@/lib/store/sentinel-store";
import { formatInterval, formatMs, formatPercent, formatRelative } from "@/lib/format";
import { HTTP_METHODS, type AppData, type MonitorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monitors/")({
  head: () => ({
    meta: [
      { title: "Monitors — API Sentinel" },
      { name: "description", content: "All registered API endpoints with status, response time and uptime." },
      { property: "og:title", content: "Monitors — API Sentinel" },
      { property: "og:description", content: "All registered API endpoints with status, response time and uptime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MonitorsPage,
});

function MonitorsPage() {
  return <WorkspaceGate>{(data) => <MonitorsView data={data} />}</WorkspaceGate>;
}

type SortKey = "name" | "status" | "response" | "uptime" | "lastChecked";
const STATUS_ORDER: Record<MonitorStatus, number> = { down: 0, degraded: 1, pending: 2, operational: 3, paused: 4 };

function MonitorsView({ data }: { data: AppData }) {
  const { actions } = useSentinel();
  const navigate = useNavigate();
  const { runCheck, runningId } = useRunMonitorCheck();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<MonitorStatus | "all">("all");
  const [method, setMethod] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "status", dir: "asc" });
  const [pendingDelete, setPendingDelete] = useState<MonitorSummary | null>(null);

  const summaries = useMemo(() => summarizeMonitors(data), [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = summaries.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (method === "all" || s.monitor.method === method) &&
        (!q || s.monitor.name.toLowerCase().includes(q) || s.monitor.url.toLowerCase().includes(q)),
    );
    const value = (s: MonitorSummary): number | string => {
      switch (sort.key) {
        case "name":
          return s.monitor.name.toLowerCase();
        case "status":
          return STATUS_ORDER[s.status];
        case "response":
          return s.latest?.responseMs ?? Number.POSITIVE_INFINITY;
        case "uptime":
          return s.uptime30d ?? -1;
        case "lastChecked":
          return s.latest?.at ?? 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [summaries, query, status, method, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "status" ? "asc" : "desc" }));

  const hasFilters = query !== "" || status !== "all" || method !== "all";

  return (
    <PageContainer>
      <PageHeader
        title="Monitors"
        description={`${data.monitors.length} registered endpoint${data.monitors.length === 1 ? "" : "s"}`}
        actions={
          <Button asChild>
            <Link to="/monitors/new">
              <Plus /> Add monitor
            </Link>
          </Button>
        }
      />

      {data.monitors.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Activity}
            title="No monitors yet"
            description="Register an API endpoint to start monitoring its availability and response times."
            action={
              <Button asChild>
                <Link to="/monitors/new">
                  <Plus /> Add monitor
                </Link>
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel bodyClassName="p-0">
          <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:p-4">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search monitors"
                placeholder="Search by name or URL"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Select value={status} onValueChange={(v) => setStatus(v as MonitorStatus | "all")}>
                <SelectTrigger className="sm:w-40" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(MONITOR_STATUS_META) as MonitorStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {MONITOR_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="sm:w-36" aria-label="Filter by method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No monitors match"
              description="Try a different search term or clear the filters."
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setStatus("all");
                      setMethod("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead label="API" k="name" sort={sort} onSort={toggleSort} className="pl-5" />
                  <TableHead>Method</TableHead>
                  <SortableHead label="Status" k="status" sort={sort} onSort={toggleSort} />
                  <SortableHead label="Response" k="response" sort={sort} onSort={toggleSort} align="right" />
                  <SortableHead label="Uptime 30d" k="uptime" sort={sort} onSort={toggleSort} align="right" />
                  <SortableHead label="Last checked" k="lastChecked" sort={sort} onSort={toggleSort} />
                  <TableHead className="w-12 pr-5">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const running = runningId === s.monitor.id;
                  return (
                    <TableRow key={s.monitor.id}>
                      <TableCell className="max-w-[320px] pl-5">
                        <Link
                          to="/monitors/$monitorId/edit"
                          params={{ monitorId: s.monitor.id }}
                          className="block truncate font-medium text-foreground hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                        >
                          {s.monitor.name}
                        </Link>
                        <p className="truncate font-mono text-xs text-muted-foreground" title={s.monitor.url}>
                          {s.monitor.url}
                        </p>
                      </TableCell>
                      <TableCell>
                        <MethodBadge method={s.monitor.method} />
                      </TableCell>
                      <TableCell>
                        <MonitorStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="tabular text-right font-mono text-xs">
                        {formatMs(s.latest?.responseMs)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "tabular text-right font-mono text-xs",
                          s.uptime30d !== null && s.uptime30d < data.settings.thresholds.uptimeTarget && "text-warning",
                        )}
                      >
                        {formatPercent(s.uptime30d)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {running ? (
                          <span className="inline-flex items-center gap-1.5 text-primary">
                            <Loader2 className="size-3 animate-spin" /> Checking…
                          </span>
                        ) : (
                          <>
                            {formatRelative(s.latest?.at)}
                            <span className="block text-[0.7rem]">every {formatInterval(s.monitor.intervalSeconds)}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="pr-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${s.monitor.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem disabled={s.monitor.paused || running} onSelect={() => void runCheck(s.monitor)}>
                              <RefreshCw /> Check now
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => navigate({ to: "/monitors/$monitorId/edit", params: { monitorId: s.monitor.id } })}
                            >
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                actions.setPaused(s.monitor.id, !s.monitor.paused);
                                toast.success(s.monitor.paused ? "Monitoring resumed" : "Monitoring paused", {
                                  description: s.monitor.name,
                                });
                              }}
                            >
                              {s.monitor.paused ? <Play /> : <Pause />} {s.monitor.paused ? "Resume" : "Pause"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setPendingDelete(s)}
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.monitor.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the monitor along with its check history and incidents. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDelete) return;
                actions.deleteMonitor(pendingDelete.monitor.id);
                toast.success("Monitor deleted", { description: pendingDelete.monitor.name });
                setPendingDelete(null);
              }}
            >
              Delete monitor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function SortableHead({
  label,
  k,
  sort,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(align === "right" && "text-right", className)}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm text-xs font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  );
}
