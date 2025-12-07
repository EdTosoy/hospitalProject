"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
