import type {
  CreatePatientInput,
  Patient,
  PatientSummary,
} from "@hospital/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAuthFetch } from "@/lib/api";

export function usePatients() {
  return useQuery({
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryKey: ["patients"],
    queryFn: () => apiAuthFetch<Patient[]>("/patients"),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePatientInput) =>
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
    mutationFn: (data: CreatePatientInput) =>
      apiAuthFetch<Patient>("/patients/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<CreatePatientInput>) =>
      apiAuthFetch<Patient>(`/patients/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function usePatientSelectors() {
  return useQuery({
    queryKey: ["patient-selectors"],
    queryFn: () => apiAuthFetch<PatientSummary[]>("/patients"),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}
