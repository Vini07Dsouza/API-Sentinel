import { Link } from "@tanstack/react-router";
import { Bell, Plus, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/logo";
import { isApiConfigured } from "@/services/config";

export function AppHeader() {
  const configured = isApiConfigured();
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 sm:px-4">
      <SidebarTrigger aria-label="Toggle navigation" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Link to="/" className="flex min-w-0 items-center gap-2 md:hidden" aria-label="API Sentinel home">
        <Logo className="size-6" />
        <span className="truncate text-sm font-semibold tracking-tight">API Sentinel</span>
      </Link>
      {!configured ? (
        <Badge variant="warning" className="hidden sm:inline-flex" title="Set VITE_API_BASE_URL to connect your backend">
          <Unplug className="size-3" /> Backend not connected
        </Badge>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button asChild variant="ghost" size="icon" aria-label="Notifications">
          <Link to="/notifications">
            <Bell />
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
