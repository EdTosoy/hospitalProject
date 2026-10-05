"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ConfirmAction,
  EmptyState,
  PageHeader,
  QueryRefresh,
  QueryState,
  RecordToolbar,
  StatusBadge,
} from "@/components/care-ui";
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointmentStatus,
} from "@/hooks/use-appointments";
import { useDoctors } from "@/hooks/use-doctors";
import { usePatients } from "@/hooks/use-patients";
import {
  type AppointmentInput,
  appointmentSchema,
} from "@/lib/validations/appointment";
import { useAuthStore } from "@/stores/auth-store";

export default function AppointmentPage() {
  const appointments = useAppointments();
  const doctors = useDoctors();
  const patients = usePatients();
  const user = useAuthStore((state) => state.user);
  const [patientId, setPatientId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const create = useCreateAppointment();
  const update = useUpdateAppointmentStatus();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AppointmentInput>({ resolver: zodResolver(appointmentSchema) });
  const personal = user?.role === "PATIENT";
  const manage = ["DOCTOR", "ADMIN", "FRONT_DESK"].includes(user?.role || "");
  const filtered = (appointments.data || [])
    .filter(
      (item) =>
        (status === "ALL" || item.status === status) &&
        `${item.patient?.firstName || ""} ${item.patient?.lastName || ""} ${item.doctor?.name || ""} ${item.reason}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const queries = [appointments, doctors, patients];
  return (
    <div className="workspace">
      <PageHeader
        title="Appointments"
        eyebrow={personal ? "Your visits" : "Scheduling"}
        description={
          personal
            ? "Book a visit and follow its progress from request to confirmation."
            : "Coordinate visits, confirm requests, and keep each appointment up to date."
        }
        action={
          <a href="#booking-form" className="btn-primary">
            <Plus className="size-4" />
            Book a visit
          </a>
        }
      />
      <QueryRefresh query={appointments} />
      {queries.some((q) => q.isLoading) ? (
        <QueryState loading message="Loading appointments…" />
      ) : queries.some((q) => q.isError) ? (
        <QueryState
          message="Unable to load appointments, patients, or doctors. Please retry."
          retry={() => {
            for (const q of queries) void q.refetch();
          }}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-4">
            <RecordToolbar
              query={query}
              onQueryChange={setQuery}
              label={
                personal
                  ? "Search visits or doctors"
                  : "Search patients, doctors, or visits"
              }
              status={status}
              onStatusChange={setStatus}
              statuses={[
                "PENDING",
                "CONFIRMED",
                "COMPLETED",
                "CANCELLED",
                "NO_SHOW",
              ]}
              count={filtered.length}
            />
            {update.isError && (
              <p role="alert" className="panel p-4 text-sm text-destructive">
                {update.error.message}
              </p>
            )}
            {!filtered.length && (
              <EmptyState
                title={
                  appointments.data?.length
                    ? "No matching appointments"
                    : "No appointments scheduled"
                }
                description={
                  appointments.data?.length
                    ? "Try another search or status filter."
                    : "Use the booking form to request your first visit."
                }
              />
            )}
            {filtered.map((item) => (
              <article
                key={item.id}
                data-testid="appointment-record"
                className="panel p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays className="size-4 text-primary" />
                      {new Date(item.dateTime).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      <span className="mx-1 text-muted-foreground/40">·</span>
                      <Clock className="size-4 text-muted-foreground" />
                      {new Date(item.dateTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">
                      {personal
                        ? item.doctor?.name || "Doctor to be assigned"
                        : item.patient
                          ? `${item.patient.firstName} ${item.patient.lastName}`
                          : "Patient appointment"}
                    </h2>
                    {!personal && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.doctor?.name || "Doctor to be assigned"}
                      </p>
                    )}
                    <p className="mt-3 break-words text-sm text-muted-foreground">
                      {item.reason}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {((manage && ["PENDING", "CONFIRMED"].includes(item.status)) ||
                  (personal &&
                    ["PENDING", "CONFIRMED"].includes(item.status))) && (
                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">
                    {manage && item.status === "PENDING" && (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate(
                            { id: item.id, status: "CONFIRMED" },
                            {
                              onSuccess: () =>
                                toast.success("Appointment confirmed"),
                            },
                          )
                        }
                      >
                        Confirm
                      </button>
                    )}
                    {manage && item.status === "CONFIRMED" && (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate(
                            { id: item.id, status: "COMPLETED" },
                            {
                              onSuccess: () =>
                                toast.success("Appointment completed"),
                            },
                          )
                        }
                      >
                        Complete appointment
                      </button>
                    )}
                    <ConfirmAction
                      label={personal ? "Cancel appointment" : "Cancel"}
                      title="Cancel this appointment?"
                      description={`The visit on ${new Date(item.dateTime).toLocaleString()} will be marked cancelled. You can book another appointment if needed.`}
                      destructive
                      disabled={update.isPending}
                      onConfirm={async () => {
                        await update.mutateAsync({
                          id: item.id,
                          status: "CANCELLED",
                        });
                        toast.success("Appointment cancelled");
                      }}
                    />
                  </div>
                )}
              </article>
            ))}
          </section>
          <form
            id="booking-form"
            className="panel scroll-mt-24 p-5 sm:p-6"
            onSubmit={handleSubmit((data) =>
              create.mutate(
                {
                  patientId: personal
                    ? patients.data?.[0]?.id || ""
                    : patientId,
                  doctorId: data.doctorId || undefined,
                  dateTime: new Date(`${data.date}T${data.time}`).toISOString(),
                  reason: data.reason,
                  status: "PENDING",
                },
                {
                  onSuccess: () => {
                    reset();
                    toast.success("Appointment booked");
                  },
                },
              ),
            )}
          >
            <div className="mb-5 border-b pb-5">
              <p className="eyebrow">New visit</p>
              <h2 className="mt-2 text-xl font-semibold">
                Book New Appointment
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Choose a date and time. Your request will be pending until the
                care team confirms it.
              </p>
            </div>
            {personal && !patients.data?.length && (
              <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Complete your{" "}
                <Link
                  className="font-semibold underline"
                  href="/dashboard/profile"
                >
                  patient profile
                </Link>{" "}
                before booking.
              </p>
            )}
            <div className="space-y-4">
              {!personal && (
                <div>
                  <label
                    htmlFor="booking-patient"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Patient
                  </label>
                  <select
                    id="booking-patient"
                    className="field"
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                  >
                    <option value="">Select a patient</option>
                    {patients.data?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.firstName} {item.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["date", "Date", "date"],
                    ["time", "Time", "time"],
                  ] as const
                ).map(([key, label, type]) => (
                  <div key={key}>
                    <label
                      className="mb-1.5 block text-sm font-medium"
                      htmlFor={`booking-${key}`}
                    >
                      {label}
                    </label>
                    <input
                      id={`booking-${key}`}
                      type={type}
                      className="field"
                      aria-invalid={!!errors[key]}
                      aria-describedby={
                        errors[key] ? `${key}-error` : undefined
                      }
                      {...register(key)}
                    />
                    {errors[key] && (
                      <p
                        id={`${key}-error`}
                        className="mt-1 text-xs text-destructive"
                      >
                        {errors[key]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="booking-doctor"
                >
                  Doctor
                </label>
                <select
                  id="booking-doctor"
                  className="field"
                  {...register("doctorId")}
                >
                  <option value="">No preference</option>
                  {doctors.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || item.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="booking-reason"
                >
                  Reason
                </label>
                <textarea
                  id="booking-reason"
                  placeholder="Briefly describe the reason for your visit"
                  className="field min-h-24"
                  aria-invalid={!!errors.reason}
                  aria-describedby={errors.reason ? "reason-error" : undefined}
                  {...register("reason")}
                />
                {errors.reason && (
                  <p
                    id="reason-error"
                    className="mt-1 text-xs text-destructive"
                  >
                    {errors.reason.message}
                  </p>
                )}
              </div>
              {create.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {create.error.message}
                </p>
              )}
              <button
                type="submit"
                disabled={
                  create.isPending || (personal && !patients.data?.length)
                }
                className="btn-primary w-full"
              >
                {create.isPending ? "Booking…" : "Book Appointment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
