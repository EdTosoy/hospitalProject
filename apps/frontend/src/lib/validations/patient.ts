import { z } from "zod";
import { isBirthDate } from "@/lib/birth-date";

export const registerPatientSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(200, "First name must be at most 200 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(200, "Last name must be at most 200 characters"),
  dob: z
    .string()
    .refine(isBirthDate, "Enter a valid birth date no later than today (UTC)"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .max(64, "Phone must be at most 64 characters"),
  address: z
    .string()
    .max(1000, "Address must be at most 1000 characters")
    .optional(),
});

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
