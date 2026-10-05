import { useAuthStore } from "@/stores/auth-store";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    if (res.status === 401) useAuthStore.getState().logout();
    const message = error?.message;
    throw new ApiError(
      Array.isArray(message)
        ? message.join(". ")
        : message || `API request failed (${res.status})`,
      res.status,
    );
  }

  return res.json();
}

export async function apiAuthFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  return apiFetch<T>(endpoint, options);
}
