"use client";

import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="max-w-md space-y-4">
        <div className="border rounded-lg p-4">
          <label className="text-sm text-muted-foreground">Name</label>
          <p className="font-medium">{user?.name || "—"}</p>
        </div>

        <div className="border rounded-lg p-4">
          <label className="text-sm text-muted-foreground">Email</label>
          <p className="font-medium">{user?.email}</p>
        </div>

        <div className="border rounded-lg p-4">
          <label className="text-sm text-muted-foreground">Role</label>
          <p className="font-medium">{user?.role}</p>
        </div>
      </div>
    </div>
  );
}
