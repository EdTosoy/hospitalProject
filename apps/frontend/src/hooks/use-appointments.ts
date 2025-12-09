import { apiAuthFetch } from "@/lib/api";
import { Appointment, AppointmentStatus } from "@hospital/shared";
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

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      apiAuthFetch(`/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
