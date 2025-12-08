import type { Patient } from "./patient";

export type QueueStatus =
  | "WAITING"
  | "CALLED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW";

export interface QueueEntry {
  id: string;
  patientId: string;
  patient?: Patient;
  queueNumber: number;
  status: QueueStatus;
  notes?: string;
  createdAt: string;
  calledAt?: string;
}
