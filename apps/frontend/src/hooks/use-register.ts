import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}
