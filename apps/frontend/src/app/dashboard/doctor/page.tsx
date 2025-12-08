"use client";

import DashboardCard from "@/components/dashboard-card";
import { useAppointments } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { useQueue } from "@/hooks/use-queue";
import { useAuthStore } from "@/stores/auth-store";
import { CalendarDays, ListOrdered, User } from "lucide-react";

export default function DoctorDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data: appointments } = useAppointments();
  const { data: queue } = useQueue();
  const { data: patients } = usePatients();

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, Dr. {user?.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard
          title="Today's Schedule"
          description="View your appointments"
          href="/dashboard/appointment"
          icon={CalendarDays}
          count={appointments?.length}
        />
        <DashboardCard
          title="Patients"
          description="Access patient records"
          href="/dashboard/patients"
          icon={User}
          count={patients?.length}
        />
        <DashboardCard
          title="Queue"
          description="Current waiting patients"
          href="/dashboard/queue"
          icon={ListOrdered}
          count={queue?.length}
        />
      </div>
    </div>
  );
}
