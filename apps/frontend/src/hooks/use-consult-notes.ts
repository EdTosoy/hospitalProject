import { apiAuthFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ConsultNote {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  createdAt: string;
  doctor?: { name: string };
}

export function useConsultNotes(patientId: string) {
  return useQuery({
    queryKey: ["consult-notes", patientId],
    queryFn: () =>
      apiAuthFetch<ConsultNote[]>(`/consult-notes/patient/${patientId}`),
    enabled: !!patientId,
  });
}

export function useCreateConsultNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<ConsultNote, "id" | "createdAt" | "doctor">) =>
      apiAuthFetch<ConsultNote>("/consult-notes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["consult-notes", variables.patientId],
      });
    },
  });
}
