export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Patient {
  id: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender;
  phone: string;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender;
  phone: string;
  address?: string;
}

export type PatientSummary = Pick<Patient, "id" | "firstName" | "lastName">;
