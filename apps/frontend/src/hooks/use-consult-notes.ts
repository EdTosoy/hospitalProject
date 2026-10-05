import type { ConsultNote, CreateConsultNoteInput } from "@hospital/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAuthFetch } from "@/lib/api";

export function useConsultNotes(patientId: string) {
  return useQuery({
    refetchOnWindowFocus: true,
    queryKey: ["consult-notes", patientId],
    queryFn: () =>
      apiAuthFetch<ConsultNote[]>(`/consult-notes/patient/${patientId}`),
    enabled: !!patientId,
  });
}

export function useCreateConsultNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConsultNoteInput) =>
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
