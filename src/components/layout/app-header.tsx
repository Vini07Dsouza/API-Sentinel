import { Link } from "@tanstack/react-router";
import { Bell, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useSentinel } from "@/lib/store/sentinel-store";

export function AppHeader() {
  const { state } = useSentinel();
  const data = state.status === "ready" ? state.data : null;
  const unread = data?.notifications.filter((n) => !n.read).length ?? 0;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger aria-label="Toggle navigation" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      {data?.isSampleData ? (
        <Badge variant="info" className="hidden sm:inline-flex" title="This workspace shows generated sample data">
          Sample data
        </Badge>
      ) : null}
      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Link to="/notifications">
            <Bell />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/monitors/new">
            <Plus /> <span className="hidden sm:inline">Add monitor</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
