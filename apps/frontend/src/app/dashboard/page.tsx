"use client";

import { useAuthStore } from "@/stores/auth-store";
import PatientDashboardPage from "./patient/page";
import DoctorDashboardPage from "./doctor/page";
import StaffDashboardPage from "./staff/page";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  switch (user.role) {
    case "PATIENT":
      return <PatientDashboardPage />;
    case "DOCTOR":
      return <DoctorDashboardPage />;
    default:
      return <StaffDashboardPage />;
  }
}
