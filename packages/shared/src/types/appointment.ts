import type { Patient } from "./patient";
import type { User } from "./user";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId?: string | null;
  doctor?: User | null;
  dateTime: string;
  reason: string;
  status: AppointmentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId?: string;
  dateTime: string;
  reason: string;
  status?: "PENDING" | "CONFIRMED";
}
