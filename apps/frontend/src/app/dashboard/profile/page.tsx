"use client";
import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/care-ui";
import { PatientProfile } from "@/components/patient-profile";
import { roleLabels } from "@/components/workspace-header";
import { useUpdateUser } from "@/hooks/use-update-user";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const update = useUpdateUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const begin = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    update.reset();
    setEditing(true);
  };
  return (
    <div className="workspace">
      <PageHeader
        title="My Profile"
        eyebrow="Account & patient details"
        description="Keep your sign-in information and patient details accurate. Your account role is managed by the care team."
      />
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary"
            >
              {(user?.name || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">
                {user?.name || "Your account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {roleLabels[user?.role || ""]}
              </p>
            </div>
          </div>
          {!editing && (
            <button type="button" className="btn-secondary" onClick={begin}>
              <Pencil className="size-4" />
              Edit Profile
            </button>
          )}
        </div>
        {editing ? (
          <form
            className="mt-5 max-w-2xl space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate(
                { name: name.trim(), email: email.trim() },
                {
                  onSuccess: () => {
                    setEditing(false);
                    toast.success("Profile updated");
                  },
                },
              );
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="account-name"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Name
                </label>
                <input
                  id="account-name"
                  className="field"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="account-email"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id="account-email"
                  type="email"
                  className="field"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            {update.isError && (
              <p role="alert" className="text-sm text-destructive">
                {update.error.message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={update.isPending}
                className="btn-secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={update.isPending || !name.trim()}
                className="btn-primary"
              >
                <Check className="size-4" />
                {update.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium">
                {user?.name || "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all font-medium">{user?.email}</dd>
            </div>
          </dl>
        )}
      </section>
      <PatientProfile />
    </div>
  );
}
