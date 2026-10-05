"use client";

import type { User } from "@hospital/shared";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiAuthFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (attempt > 0) setIsHydrated(false);
    // Remove credentials left by older builds; never consume them.
    localStorage.removeItem("auth-storage");
    setError(null);
    apiAuthFetch<User>("/auth/me")
      .then((user) => {
        if (active) {
          useAuthStore.getState().setUser(user);
          setIsHydrated(true);
        }
      })
      .catch((error) => {
        if (active) {
          if (error.status === 401) {
            useAuthStore.getState().logout();
            setIsHydrated(true);
          } else setError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (isHydrated && !user) {
      router.push("/login");
    }
  }, [isHydrated, user, router]);

  if (error)
    return (
      <div role="alert" className="p-8">
        Unable to verify your session: {error}{" "}
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Try again
        </button>
      </div>
    );

  if (!isHydrated) {
    return <div className="p-8">Loading</div>;
  }

  if (!user) {
    return <div className="p-8">Redirecting to login</div>;
  }

  const restricted =
    pathname === "/dashboard/doctor"
      ? ["DOCTOR"]
      : pathname === "/dashboard/patient"
        ? ["PATIENT"]
        : pathname === "/dashboard/staff"
          ? ["NURSE", "FRONT_DESK", "ADMIN"]
          : pathname.startsWith("/dashboard/consult")
            ? ["DOCTOR", "NURSE", "ADMIN"]
            : pathname.startsWith("/dashboard/billing")
              ? ["BILLING", "ADMIN"]
              : pathname === "/dashboard/appointment"
                ? ["PATIENT", "DOCTOR", "NURSE", "FRONT_DESK", "ADMIN"]
                : pathname === "/dashboard/patients" ||
                    pathname === "/dashboard/queue"
                  ? ["DOCTOR", "NURSE", "FRONT_DESK", "ADMIN"]
                  : undefined;
  if (restricted && !restricted.includes(user?.role || ""))
    return (
      <p role="alert" className="p-8">
        You do not have access to this page.
      </p>
    );
  return <>{children}</>;
}
