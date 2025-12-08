import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useMutation } from "@tanstack/react-query";

interface UpdateUserInput {
  name?: string;
  email?: string;
}

interface UpdateUserResponse {
  id: string;
  name: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "NURSE" | "FRONT_DESK" | "BILLING";
}

export function useUpdateUser() {
  const { user, token, setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdateUserInput) =>
      apiFetch<UpdateUserResponse>(`/users/${user?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedUser: UpdateUserResponse) => {
      if (token) {
        setUser(updatedUser);
      }
    },
  });
}
