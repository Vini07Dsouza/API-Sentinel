import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, AlertOctagon, BarChart3, Bell, LayoutDashboard, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSentinel } from "@/lib/store/sentinel-store";
import { Logo } from "@/components/layout/logo";

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
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U"
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSentinel();
  const { setOpenMobile, isMobile } = useSidebar();

  const data = state.status === "ready" ? state.data : null;
  const activeIncidents = data?.incidents.filter((i) => i.status !== "resolved").length ?? 0;
  const unread = data?.notifications.filter((n) => !n.read).length ?? 0;
  const account = data?.settings.account;

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3">
        <Link to="/" onClick={closeOnMobile} className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring">
          <Logo />
          <span className="truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
            API Sentinel
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[0.65rem] uppercase tracking-wider">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const badge = item.to === "/incidents" ? activeIncidents : item.to === "/notifications" ? unread : 0;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                      <Link to={item.to} onClick={closeOnMobile}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badge > 0 ? (
                      <SidebarMenuBadge
                        className={
                          item.to === "/incidents"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-primary/15 text-primary"
                        }
                        aria-label={`${badge} ${item.to === "/incidents" ? "active incidents" : "unread notifications"}`}
                      >
                        {badge}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Account settings" isActive={pathname === "/settings"}>
              <Link to="/settings" onClick={closeOnMobile}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary">
                  {initials(account?.name ?? "")}
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium text-sidebar-accent-foreground">{account?.name ?? "Loading…"}</span>
                  <span className="truncate text-xs text-muted-foreground">{account?.email ?? ""}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
