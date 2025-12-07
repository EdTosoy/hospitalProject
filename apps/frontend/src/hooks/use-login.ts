import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useMutation } from "@tanstack/react-query";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: "PATIENT" | "DOCTOR" | "NURSE" | "FRONT_DESK" | "BILLING";
  };
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (credentials: LoginRequest) =>
      apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
    },
  });
}
