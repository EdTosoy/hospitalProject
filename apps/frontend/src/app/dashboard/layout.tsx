import { AppSidebar } from "@/components/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 p-4">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
