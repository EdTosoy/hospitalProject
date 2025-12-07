"use client";

import DashboardCard from "@/components/dashboard-card";
import { useAuthStore } from "@/stores/auth-store";

export default function DoctorDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, Dr. {user?.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard
          title="Today's Schedule"
          description="View your appointments"
          href="/dashboard/appointment"
        />
        <DashboardCard
          title="Patients"
          description="Access patient records"
          href="/dashboard/patients"
        />
        <DashboardCard
          title="Queue"
          description="Current waiting patients"
          href="/dashboard/queue"
        />
      </div>
    </div>
  );
}
