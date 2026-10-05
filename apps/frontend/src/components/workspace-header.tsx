"use client";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth-store";

export const roleLabels: Record<string, string> = {
  PATIENT: "Patient portal",
  DOCTOR: "Doctor workspace",
  NURSE: "Nursing workspace",
  FRONT_DESK: "Front desk",
  BILLING: "Billing workspace",
  ADMIN: "Administration",
};
export function WorkspaceHeader() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const section = pathname.includes("/consult/")
    ? "Consultation"
    : (
        {
          appointment: "Appointments",
          patients: "Patients",
          queue: "Patient queue",
          billing: "Billing",
          profile: "My profile",
        } as Record<string, string>
      )[pathname.split("/").at(-1) || ""] || "Overview";
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger />
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {roleLabels[user?.role || ""] || "Pulse Medical"}
        </span>
        <span
          className="hidden text-muted-foreground/40 sm:inline"
          aria-hidden="true"
        >
          /
        </span>
        <span className="truncate text-sm font-semibold">{section}</span>
      </div>
      <span className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        {user?.role === "PATIENT" ? "Patient portal" : "Staff access"}
      </span>
    </header>
  );
}
