"use client";
import { CalendarDays, Clock, Users } from "lucide-react";
import Link from "next/link";
import {
  EmptyState,
  Metric,
  PageHeader,
  QueryState,
  StatusBadge,
  TaskLink,
} from "@/components/care-ui";
import { roleLabels } from "@/components/workspace-header";
import { useAppointments } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { useQueue } from "@/hooks/use-queue";
import { useAuthStore } from "@/stores/auth-store";

export function ClinicalOverview() {
  const user = useAuthStore((state) => state.user);
  const appointments = useAppointments();
  const patients = usePatients();
  const queue = useQueue();
  const queries = [appointments, patients, queue];
  const today = new Date().toDateString();
  const schedule = (appointments.data || [])
    .filter(
      (item) =>
        new Date(item.dateTime).toDateString() === today &&
        ["PENDING", "CONFIRMED"].includes(item.status),
    )
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const waiting = (queue.data || []).filter(
    (item) => item.status === "WAITING",
  );
  const active = (queue.data || []).filter((item) =>
    ["CALLED", "IN_PROGRESS"].includes(item.status),
  );
  const doctor = user?.role === "DOCTOR";
  const nurse = user?.role === "NURSE";
  return (
    <div className="workspace">
      <PageHeader
        title={`Welcome, ${user?.name || "care team"}`}
        eyebrow={roleLabels[user?.role || ""]}
        description={
          doctor
            ? "Your schedule and patient care, in one place."
            : nurse
              ? "Keep patient care moving. Review the queue and consultation records."
              : "Coordinate arrivals, appointments, and the next step in each patient's visit."
        }
        action={
          <Link
            className="btn-primary"
            href={doctor ? "/dashboard/appointment" : "/dashboard/queue"}
          >
            {doctor ? (
              <CalendarDays className="size-4" />
            ) : (
              <Clock className="size-4" />
            )}
            {doctor ? "Open schedule" : "Manage queue"}
          </Link>
        }
      />
      {queries.some((q) => q.isLoading) ? (
        <QueryState loading />
      ) : queries.some((q) => q.isError) ? (
        <QueryState
          message="Unable to load dashboard. Please retry."
          retry={() => {
            for (const q of queries) void q.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Today's appointments"
              value={schedule.length}
              description="Pending and confirmed visits"
            />
            <Metric
              label="Waiting"
              value={waiting.length}
              description="Patients ready to be called"
            />
            <Metric
              label="In care"
              value={active.length}
              description="Called or in progress"
            />
            <Metric
              label="Registered patients"
              value={patients.data?.length || 0}
              description="Records available to your role"
            />
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b p-5">
                <div>
                  <h2 className="font-semibold">Today's schedule</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  className="text-sm font-medium text-primary"
                  href="/dashboard/appointment"
                >
                  View all
                </Link>
              </div>
              {schedule.length ? (
                <ul className="divide-y">
                  {schedule.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-5"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <span className="rounded-lg bg-muted p-2 text-sm font-semibold tabular-nums">
                          {new Date(item.dateTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {item.patient
                              ? `${item.patient.firstName} ${item.patient.lastName}`
                              : "Patient appointment"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.doctor?.name || "Doctor to be assigned"}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center">
                  <CalendarDays className="mx-auto mb-3 size-7 text-primary" />
                  <p className="font-medium">No active appointments today</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Open appointments to review other dates or book a visit.
                  </p>
                </div>
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Your next actions</h2>
              <TaskLink
                href="/dashboard/patients"
                title={
                  doctor || nurse
                    ? "Review patient records"
                    : "Register a patient"
                }
              >
                {doctor || nurse
                  ? "Find a patient and open consultation notes."
                  : "Add walk-in details, then place the patient in the queue."}
              </TaskLink>
              <TaskLink href="/dashboard/queue" title="Coordinate patient flow">
                {waiting.length
                  ? `${waiting.length} waiting. Open the queue to call the next patient.`
                  : "View arrivals and patients currently in care."}
              </TaskLink>
              {user?.role === "ADMIN" && (
                <TaskLink href="/dashboard/billing" title="Review billing">
                  Check pending charges and recorded payments.
                </TaskLink>
              )}
              <div className="flex gap-3 rounded-xl bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
                <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                Open a patient's record only when needed for their care.
                Consultation details stay in the consultation workspace.
              </div>
            </section>
          </div>
          {!patients.data?.length && (
            <EmptyState
              title="Ready for your first patient"
              description="Register a walk-in patient to start the care workflow."
              action={
                <Link href="/dashboard/patients" className="btn-secondary">
                  Open patients
                </Link>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
