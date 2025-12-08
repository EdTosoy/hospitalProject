import { apiAuthFetch } from "@/lib/api";
import { Appointment } from "@hospital/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: () => apiAuthFetch<Appointment[]>("/appointments"),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Appointment, "id">) =>
      apiAuthFetch<Appointment>("/appointments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
      });
    },
  });
}
