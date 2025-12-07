import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
interface User {
  id: string;
  name: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "NURSE" | "FRONT_DESK" | "BILLING";
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        token: null,
        user: null,
        setAuth: (token, user) => set({ token, user }),
        logout: () => set({ token: null, user: null }),
        isAuthenticated: () => get().token !== null,
      }),
      { name: "auth-storage" }
    )
  )
);
