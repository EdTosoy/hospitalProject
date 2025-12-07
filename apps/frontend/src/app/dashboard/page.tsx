"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || !user) return;

    switch (user.role) {
      case "PATIENT":
        router.push("/dashboard/patient");
        break;
      case "DOCTOR":
        router.push("/dashboard/doctor");
        break;
      default:
        router.push("/dashboard/staff");
    }
  }, [isHydrated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Redirecting to your dashboard...</p>
    </div>
  );
}
