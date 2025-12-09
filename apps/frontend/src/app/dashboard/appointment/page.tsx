"use client";

import { Input } from "@/components/ui/input";
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointmentStatus,
} from "@/hooks/use-appointments";
import { useDoctors } from "@/hooks/use-doctors";
import {
  AppointmentInput,
  appointmentSchema,
} from "@/lib/validations/appointment";
import { useAuthStore } from "@/stores/auth-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "CONFIRMED":
      return "bg-primary/10 text-primary";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "NO_SHOW":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function AppointmentPage() {
  const { data: appointments, isLoading, isError } = useAppointments();
  const user = useAuthStore((state) => state.user);
  const { data: doctors } = useDoctors();
  const createAppointment = useCreateAppointment();
  const updateStatus = useUpdateAppointmentStatus();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
  });

  const onSubmit = (data: AppointmentInput) => {
    createAppointment.mutate({
      patientId: user?.id || "",
      doctorId: data.doctorId || undefined,
      dateTime: `${data.date}T${data.time}`,
      reason: data.reason,
      status: "PENDING",
    });
    reset();
  };

  if (isLoading) return <div className="p-8">Loading Appointments...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-muted-foreground">
          {appointments?.length || 0} appointments
        </p>
      </div>

      <form
        className="border rounded-lg p-4 space-y-4 bg-card"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h2 className="font-semibold">Book New Appointment</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Date
            </label>
            <Input type="date" {...register("date")} />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Time
            </label>
            <Input type="time" {...register("time")} />
            {errors.time && (
              <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Reason
            </label>
            <Input
              type="text"
              placeholder="Reason for visit"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-red-500 text-sm mt-1">
                {errors.reason.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Doctor
            </label>
            <select
              {...register("doctorId")}
              className="w-full p-2 border rounded-lg bg-background"
            >
              <option value="">Any Available</option>
              {doctors?.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name || doctor.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={createAppointment.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {createAppointment.isPending ? "Booking..." : "Book Appointment"}
        </button>
      </form>

      {appointments?.length === 0 && (
        <div className="text-center py-12 border rounded-lg text-muted-foreground">
          No appointments scheduled
        </div>
      )}

      <div className="space-y-3">
        {appointments?.map((appointment) => (
          <div
            key={appointment.id}
            className="border p-4 rounded-lg flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {new Date(appointment.dateTime).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(appointment.dateTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.reason}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  appointment.status
                )}`}
              >
                {appointment.status}
              </span>
              {user?.role === "DOCTOR" && appointment.status === "PENDING" && (
                <>
                  <button
                    onClick={() =>
                      updateStatus.mutate(
                        { id: appointment.id, status: "CONFIRMED" },
                        {
                          onSuccess: () =>
                            toast.success("Appointment confirmed"),
                        }
                      )
                    }
                    disabled={updateStatus.isPending}
                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() =>
                      updateStatus.mutate(
                        { id: appointment.id, status: "CANCELLED" },
                        { onSuccess: () => toast.info("Appointment cancelled") }
                      )
                    }
                    disabled={updateStatus.isPending}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
