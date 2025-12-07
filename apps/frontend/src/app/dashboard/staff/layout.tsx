"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const STAFF_ROLES = ["FRONT_DESK", "NURSE", "BILLING"];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (user && !STAFF_ROLES.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user || !STAFF_ROLES.includes(user.role))
    return <div className="p-8">Access denied</div>;

  return <>{children}</>;
}
