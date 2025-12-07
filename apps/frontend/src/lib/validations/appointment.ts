import { z } from "zod";

export const appointmentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  reason: z.string().min(1, "Reason is required"),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
