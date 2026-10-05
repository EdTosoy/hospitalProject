import type { PatientSummary } from "./patient";
export type BillingStatus = "PENDING" | "PAID" | "CANCELLED" | "OVERDUE";
export interface Bill {
  id: string;
  patientId: string;
  patient: PatientSummary;
  amount: number;
  amountMinor: number | null;
  currency: "PHP" | null;
  legacyAmount: number;
  requiresReview: boolean;
  description: string;
  status: BillingStatus;
  paidAt: string | null;
}
export interface CreateBillInput {
  patientId: string;
  amount: number;
  description: string;
  currency?: "PHP";
  status?: BillingStatus;
}
