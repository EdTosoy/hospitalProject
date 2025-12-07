"use client";

import { Input } from "@/components/ui/input";
import {
  useAppointments,
  useCreateAppointment,
} from "@/hooks/use-appointments";
import { FormEvent, useState } from "react";

export default function AppointmentPage() {
  const { data: appointments, isLoading, isError } = useAppointments();
  const createAppointment = useCreateAppointment();

  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createAppointment.mutate({
      patientId: "temp-patient-id",
      doctorId: "temp-doctor-id",
      dateTime: `${date}T${time}`,
      reason,
      status: "PENDING",
    });

    setReason("");
    setDate("");
    setTime("");
  };

  if (isLoading) return <div className="p-8">Loading Appointments...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Appointments</h1>
      <form className="flex gap-4" onSubmit={handleCreate}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
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
