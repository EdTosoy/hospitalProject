"use client";

import DashboardCard from "@/components/dashboard-card";
import { useAuthStore } from "@/stores/auth-store";
import { CalendarDays, User } from "lucide-react";

export default function PatientDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard
          title="My Appointments"
          description="View and book appointments"
          href="/dashboard/appointment"
          icon={CalendarDays}
        />
        <DashboardCard
          title="My Profile"
          description="Update your information"
          href="/dashboard/profile"
          icon={User}
        />
      </div>
    </div>
  );
}
