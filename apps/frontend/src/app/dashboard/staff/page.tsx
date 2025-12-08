"use client";

import DashboardCard from "@/components/dashboard-card";
import { useAuthStore } from "@/stores/auth-store";
import { CalendarDays, ListOrdered, User } from "lucide-react";

export default function StaffDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard
          title="Queue"
          description="Manage patient queue"
          href="/dashboard/queue"
          icon={ListOrdered}
        />
        <DashboardCard
          title="Appointments"
          description="View all appointments"
          href="/dashboard/appointment"
          icon={CalendarDays}
        />
        <DashboardCard
          title="Patients"
          description="Patient records"
          href="/dashboard/patients"
          icon={User}
        />
      </div>
    </div>
  );
}
