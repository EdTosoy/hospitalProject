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
  doctorId?: string;
  doctor?: User;
  dateTime: string;
  reason: string;
  status: AppointmentStatus;
  createdAt?: string;
  updatedAt?: string;
}
