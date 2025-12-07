import { apiAuthFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  reason: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
}

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
