export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Patient {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender;
  phone: string;
  address?: string;
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
