"use client";

import DashboardCard from "@/components/dashboard-card";
import { useAuthStore } from "@/stores/auth-store";

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
        />
        <DashboardCard
          title="Appointments"
          description="View all appointments"
          href="/dashboard/appointment"
        />
        <DashboardCard
          title="Patients"
          description="Patient records"
          href="/dashboard/patients"
        />
      </div>
    </div>
  );
}
