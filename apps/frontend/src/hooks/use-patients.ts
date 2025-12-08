import { apiAuthFetch } from "@/lib/api";
import type { Gender, Patient } from "@hospital/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: () => apiAuthFetch<Patient[]>("/patients"),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Patient, "id">) =>
      apiAuthFetch<Patient>("/patients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patients"],
      });
    },
  });
}

export function useRegisterPatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName: string;
      dob: string;
      gender: Gender;
      phone: string;
      address?: string;
    }) =>
      apiAuthFetch<Patient>("/patients/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
