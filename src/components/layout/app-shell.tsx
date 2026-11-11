import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { useSession } from "@/hooks/use-session";

const AUTH_PATHS = new Set(["/login", "/register"]);

/** Application chrome: sidebar navigation, header, toasts and session-expiry handling. */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthPage = AUTH_PATHS.has(pathname);
  const session = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const hadSession = useRef(false);

  // When a signed-in session ends (expired token, 401, sign-out in another tab), return to login.
  useEffect(() => {
    if (session) {
      hadSession.current = true;
      return;
    }
    if (hadSession.current && !isAuthPage) {
      hadSession.current = false;
      qc.clear();
      void navigate({ to: "/login", replace: true });
    }
  }, [session, isAuthPage, qc, navigate]);

  const toaster = <Toaster theme="light" position="bottom-right" richColors closeButton />;

  if (isAuthPage) {
    return (
      <>
        <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
        {toaster}
      </>
    );
  }

  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="min-w-0 bg-background">
            <AppHeader />
            <main className="min-w-0 flex-1">
              <ErrorBoundary resetKey={pathname} title="This page couldn't be displayed">
                {children}
              </ErrorBoundary>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      {toaster}
    </>
  );
}
