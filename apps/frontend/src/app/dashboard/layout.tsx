import type React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceHeader } from "@/components/workspace-header";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <a
            href="#workspace-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
          >
            Skip to content
          </a>
          <WorkspaceHeader />
          <main id="workspace-content" tabIndex={-1} className="min-w-0 flex-1">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
