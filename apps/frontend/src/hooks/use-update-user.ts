import type { User } from "@hospital/shared";
import { useMutation } from "@tanstack/react-query";
import { apiAuthFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface UpdateUserInput {
  name?: string;
  email?: string;
}

export function useUpdateUser() {
  const { user, setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdateUserInput) =>
      apiAuthFetch<User>(`/users/${user?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedUser: User) => {
      setUser(updatedUser);
    },
  });
}
