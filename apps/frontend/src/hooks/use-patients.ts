import { apiAuthFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Patient {
  id: string;
  userId: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  address: string;
  emergencyContact: string;
}

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
