"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "DOCTOR") {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "DOCTOR")
    return <div className="p-8">Access denied</div>;

  return <>{children}</>;
}
