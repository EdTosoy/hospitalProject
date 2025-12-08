import { z } from "zod";

export const registerPatientSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  address: z.string().optional(),
});

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
