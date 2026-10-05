"use client";

import { useAuthStore } from "@/stores/auth-store";
import BillingPage from "./billing/page";
import DoctorDashboardPage from "./doctor/page";
import PatientDashboardPage from "./patient/page";
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
    case "BILLING":
      return <BillingPage />;
    case "PATIENT":
      return <PatientDashboardPage />;
    case "DOCTOR":
      return <DoctorDashboardPage />;
    default:
      return <StaffDashboardPage />;
  }
}
