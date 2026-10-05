import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
} from "@hospital/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAuthFetch } from "@/lib/api";

export function useAppointments() {
  return useQuery({
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryKey: ["appointments"],
    queryFn: () => apiAuthFetch<Appointment[]>("/appointments"),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
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
