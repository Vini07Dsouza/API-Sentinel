import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, AlertOctagon, BarChart3, Bell, LayoutDashboard, LogOut, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/layout/logo";
import { useIncidents } from "@/hooks/use-api";
import { useSession } from "@/hooks/use-session";
import { useSignOut } from "@/hooks/use-sign-out";
import { isApiConfigured } from "@/services/config";

const NAV = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Monitors", to: "/monitors", icon: Activity },
  { title: "Incidents", to: "/incidents", icon: AlertOctagon },
  { title: "Analytics", to: "/analytics", icon: BarChart3 },
  { title: "Notifications", to: "/notifications", icon: Bell },
  { title: "Settings", to: "/settings", icon: Settings },
] as const;

function initials(name: string) {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile, isMobile } = useSidebar();
  const session = useSession();
  const signOut = useSignOut();
  const incidents = useIncidents();
  const activeIncidents = incidents.data?.filter((i) => i.status !== "resolved").length ?? 0;

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  const displayName = session?.user?.name || session?.user?.email || (isApiConfigured() ? "Signed in" : "Not connected");
  const subtitle = session?.user?.email ?? (isApiConfigured() ? "" : "Backend not configured");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3">
        <Link
          to="/"
          onClick={closeOnMobile}
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring"
        >
          <Logo variant="inverse" />
          <span className="truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
            API Sentinel
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[0.65rem] uppercase tracking-wider text-sidebar-foreground/80">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                    <Link to={item.to} onClick={closeOnMobile}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.to === "/incidents" && activeIncidents > 0 ? (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground" aria-label={`${activeIncidents} active incidents`}>
                      {activeIncidents}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Account" isActive={pathname === "/settings"}>
              <Link to="/settings" onClick={closeOnMobile}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials(session?.user?.name ?? session?.user?.email ?? "")}
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium text-sidebar-accent-foreground">{displayName}</span>
                  {subtitle ? <span className="truncate text-xs text-sidebar-foreground/80">{subtitle}</span> : null}
                </span>
              </Link>
            </SidebarMenuButton>
            {session ? (
              <SidebarMenuAction onClick={() => void signOut()} aria-label="Sign out" title="Sign out" className="top-3">
                <LogOut />
              </SidebarMenuAction>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
