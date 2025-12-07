import { apiAuthFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface QueueEntry {
  id: string;
  patientId: string;
  queueNumber: number;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: string;
}

export function useQueue() {
  return useQuery({
    queryKey: ["queue"],
    queryFn: () => apiAuthFetch<QueueEntry[]>("/queue"),
  });
}

export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: QueueEntry["status"];
    }) =>
      apiAuthFetch(`/queue/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["queue"],
      });
    },
  });
}
