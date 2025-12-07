"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "PATIENT") {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "PATIENT")
    return <div className="p-8">Access denied</div>;

  return <>{children}</>;
}
