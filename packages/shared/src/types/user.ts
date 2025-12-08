export type Role =
  | "ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "FRONT_DESK"
  | "BILLING"
  | "PATIENT";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}
