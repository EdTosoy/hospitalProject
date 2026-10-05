"use client";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import {
  EmptyState,
  Metric,
  PageHeader,
  QueryState,
  StatusBadge,
  TaskLink,
} from "@/components/care-ui";
import { useAppointments } from "@/hooks/use-appointments";
import { usePatients } from "@/hooks/use-patients";
import { useAuthStore } from "@/stores/auth-store";

export default function PatientDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const appointments = useAppointments();
  const patients = usePatients();
  const upcoming = (appointments.data || [])
    .filter(
      (item) =>
        ["PENDING", "CONFIRMED"].includes(item.status) &&
        new Date(item.dateTime).getTime() >= Date.now(),
    )
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const next = upcoming[0];
  const ready = !!patients.data?.length;
  return (
    <div className="workspace">
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
        eyebrow="Your patient portal"
        description="A clear view of your appointments and the next step in your care."
        action={
          <Link
            href={ready ? "/dashboard/appointment" : "/dashboard/profile"}
            className="btn-primary"
          >
            {ready ? "Book a visit" : "Complete your profile"}
            <ArrowRight className="size-4" />
          </Link>
        }
      />
      {appointments.isLoading || patients.isLoading ? (
        <QueryState loading />
      ) : appointments.isError || patients.isError ? (
        <QueryState
          message="Unable to load appointments or patient profile. Please retry."
          retry={() => {
            void appointments.refetch();
            void patients.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Upcoming visits"
              value={upcoming.length}
              description="Pending and confirmed appointments"
            />
            <Metric
              label="Completed visits"
              value={
                (appointments.data || []).filter(
                  (item) => item.status === "COMPLETED",
                ).length
              }
              description="Your appointment history"
            />
            <Metric
              label="Patient profile"
              value={ready ? "Ready" : "Incomplete"}
              description={
                ready
                  ? "You can book your next visit"
                  : "Complete it before booking"
              }
            />
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
            <section>
              <h2 className="mb-3 text-sm font-semibold">
                Your next appointment
              </h2>
              {next ? (
                <div className="panel overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b bg-primary/5 p-5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <CalendarDays className="size-5" />
                      Upcoming visit
                    </span>
                    <StatusBadge status={next.status} />
                  </div>
                  <div className="p-6">
                    <p className="text-2xl font-semibold">
                      {new Date(next.dateTime).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      {new Date(next.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {next.doctor?.name || "Doctor to be assigned"}
                    </p>
                    <p className="mt-5 text-sm text-muted-foreground">
                      {next.status === "PENDING"
                        ? "Your request is awaiting confirmation from the care team."
                        : "Your appointment has been confirmed by the care team."}
                    </p>
                    <Link
                      href="/dashboard/appointment"
                      className="btn-secondary mt-6"
                    >
                      View appointment details
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No upcoming appointments"
                  description={
                    ready
                      ? "When you book a visit, its details and confirmation status will appear here."
                      : "Start by completing your patient profile. Then you can request an appointment."
                  }
                  action={
                    <Link
                      href={
                        ready ? "/dashboard/appointment" : "/dashboard/profile"
                      }
                      className="btn-primary"
                    >
                      {ready
                        ? "Book an appointment"
                        : "Complete patient profile"}
                    </Link>
                  }
                />
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Care essentials</h2>
              <TaskLink href="/dashboard/appointment" title="My Appointments">
                Book a visit, check its status, or cancel a request.
              </TaskLink>
              <TaskLink href="/dashboard/profile" title="My Profile">
                Keep your account and patient contact details up to date.
              </TaskLink>
              <div className="rounded-xl bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4 text-primary" />
                  Before your visit
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Check that your patient profile is complete and review your
                  appointment status before arriving.
                </p>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
