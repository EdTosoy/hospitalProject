"use client";

import { Input } from "@/components/ui/input";
import {
  useAppointments,
  useCreateAppointment,
} from "@/hooks/use-appointments";
import {
  AppointmentInput,
  appointmentSchema,
} from "@/lib/validations/appointment";
import { useAuthStore } from "@/stores/auth-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export default function AppointmentPage() {
  const { data: appointments, isLoading, isError } = useAppointments();
  const createAppointment = useCreateAppointment();
  const user = useAuthStore((state) => state.user);

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
      dateTime: `${data.date}T${data.time}`,
      reason: data.reason,
      status: "PENDING",
    });
    reset();
  };

  if (isLoading) return <div className="p-8">Loading Appointments...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Appointments</h1>
      <form className="flex gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Input type="date" {...register("date")} />
            {errors.date && (
              <p className="text-red-500 text-sm">{errors.date.message}</p>
            )}
          </div>
          <div>
            <Input type="time" {...register("time")} />
            {errors.time && (
              <p className="text-red-500 text-sm">{errors.time.message}</p>
            )}
          </div>
          <div>
            <Input type="text" placeholder="Reason" {...register("reason")} />
            {errors.reason && (
              <p className="text-red-500 text-sm">{errors.reason.message}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={createAppointment.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          {createAppointment.isPending ? "Creating..." : "Create"}
        </button>
      </form>

      <ul className="space-y-2">
        {appointments?.map((appointment) => (
          <li
            key={appointment.id}
            className="border p-4 rounded flex justify-between"
          >
            <div>
              <p className="font-medium">{appointment.reason}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(appointment.dateTime).toLocaleString()}
              </p>
            </div>
            <span className="text-sm">{appointment.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
