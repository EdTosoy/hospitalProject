"use client";

import { useUpdateUser } from "@/hooks/use-update-user";
import { useAuthStore } from "@/stores/auth-store";
import { Check, Mail, Pencil, Shield, User, X } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useUpdateUser();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSave = () => {
    updateUser.mutate(
      {
        name,
        email,
      },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setIsEditing(false);
  };
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>
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
      <div className="max-w-md space-y-4">
        <div className="border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
          <div className="p-3 bg-primary/10 rounded-lg">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">Name</label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="font-medium">{user?.name || "—"}</p>
            )}
          </div>
        </div>
        <div className="border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <p className="font-medium">{user?.email}</p>
            )}
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
      {isEditing && (
        <div className="flex gap-3 max-w-md">
          <button
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateUser.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            {updateUser.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
