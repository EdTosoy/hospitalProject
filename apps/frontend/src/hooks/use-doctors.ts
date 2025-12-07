import { apiAuthFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface Doctor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: () => apiAuthFetch<Doctor[]>("/users/doctors"),
  });
}
