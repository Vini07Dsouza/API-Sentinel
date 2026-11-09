import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SentinelProvider } from "@/lib/store/sentinel-store";

/** Application chrome: workspace store, sidebar navigation, header and toasts. */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <SentinelProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <AppHeader />
            <main className="min-w-0 flex-1">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </SentinelProvider>
  );
}
