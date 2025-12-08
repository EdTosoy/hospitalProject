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

export function useCallNext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiAuthFetch<QueueEntry>("/queue/call-next", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["queue"],
      });
    },
  });
}

export function useCompleteQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiAuthFetch<QueueEntry>(`/queue/${id}/complete`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["queue"],
      });
    },
  });
}

export function useAddToQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { patientId: string; notes?: string }) => {
      return apiAuthFetch<QueueEntry>("/queue/add-to-queue", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}
