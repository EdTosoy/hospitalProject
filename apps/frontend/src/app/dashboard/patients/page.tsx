"use client";
import { FileText, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AddPatientModal } from "@/components/add-patient-modal";
import {
  EmptyState,
  PageHeader,
  QueryState,
  RecordToolbar,
} from "@/components/care-ui";
import { usePatients } from "@/hooks/use-patients";
import { useAddToQueue } from "@/hooks/use-queue";
import { useAuthStore } from "@/stores/auth-store";

export default function PatientsPage() {
  const patients = usePatients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const add = useAddToQueue();
  const user = useAuthStore((state) => state.user);
  const filtered = (patients.data || [])
    .filter((item) =>
      `${item.firstName} ${item.lastName} ${item.phone}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  return (
    <div className="workspace">
      <PageHeader
        title="Patients"
        eyebrow="Patient directory"
        description="Find a registered patient, coordinate their arrival, or open a consultation record."
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="size-4" />
            Add Patient
          </button>
        }
      />
      {patients.isLoading ? (
        <QueryState loading message="Loading patients…" />
      ) : patients.isError ? (
        <QueryState
          message="Unable to load patients."
          retry={() => {
            void patients.refetch();
          }}
        />
      ) : (
        <>
          <RecordToolbar
            label="Search patient name or phone"
            query={query}
            onQueryChange={setQuery}
            count={filtered.length}
          />
          {add.isError && (
            <p role="alert" className="panel p-4 text-sm text-destructive">
              {add.error.message}
            </p>
          )}
          {!filtered.length && (
            <EmptyState
              title={
                patients.data?.length
                  ? "No matching patients"
                  : "No patients registered yet"
              }
              description={
                patients.data?.length
                  ? "Try a different name or phone number."
                  : "Register a walk-in patient to begin their visit."
              }
            />
          )}
          <div className="space-y-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                data-testid="patient-record"
                className="panel p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary"
                      aria-hidden="true"
                    >
                      <UserRound className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold">
                        {item.firstName} {item.lastName}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Patient record · {item.id.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={add.isPending}
                      onClick={() =>
                        add.mutate(
                          { patientId: item.id },
                          {
                            onSuccess: () =>
                              toast.success(`${item.firstName} added to queue`),
                          },
                        )
                      }
                    >
                      {add.isPending && add.variables?.patientId === item.id
                        ? "Adding…"
                        : "Add to Queue"}
                    </button>
                    {["DOCTOR", "NURSE"].includes(user?.role || "") && (
                      <Link
                        href={`/dashboard/consult/${item.id}`}
                        className="btn-primary"
                      >
                        <FileText className="size-4" />
                        Consult
                      </Link>
                    )}
                  </div>
                </div>
                <details className="mt-4 border-t pt-3">
                  <summary className="w-fit cursor-pointer text-xs font-medium text-muted-foreground">
                    View contact and demographic details
                  </summary>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Phone</dt>
                      <dd className="mt-1">{item.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Date of birth
                      </dt>
                      <dd className="mt-1">
                        {new Date(item.dob).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Gender</dt>
                      <dd className="mt-1 capitalize">
                        {item.gender.toLowerCase()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Address</dt>
                      <dd className="mt-1 break-words">
                        {item.address || "Not provided"}
                      </dd>
                    </div>
                  </dl>
                </details>
              </article>
            ))}
          </div>
        </>
      )}
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
