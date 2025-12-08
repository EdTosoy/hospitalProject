"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Mail, Pencil, Shield, User } from "lucide-react";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Avatar Section */}
      <div className="flex items-center gap-6 mb-8">
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || "U")}&size=120&background=01bfa5&color=fff&bold=true`}
          alt="Avatar"
          className="w-24 h-24 rounded-full ring-4 ring-primary/20"
        />
        <div>
          <h2 className="text-2xl font-bold">{user?.name || "User"}</h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-md space-y-4">
        <div className="border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
          <div className="p-3 bg-primary/10 rounded-lg">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Name</label>
            <p className="font-medium">{user?.name || "—"}</p>
          </div>
        </div>

        <div className="border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>

        <div className="border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Role</label>
            <p className="font-medium">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Edit Button */}
      <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
        <Pencil className="w-4 h-4" />
        Edit Profile
      </button>
    </div>
  );
}
