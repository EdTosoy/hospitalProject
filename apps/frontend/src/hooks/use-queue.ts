import { apiAuthFetch } from "@/lib/api";
import { QueueEntry } from "@hospital/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
