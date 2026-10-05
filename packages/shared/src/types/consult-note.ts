import type { User } from "./user";
export interface ConsultNote {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  createdAt: string;
  updatedAt: string;
  doctor?: User;
}
export interface CreateConsultNoteInput {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}
