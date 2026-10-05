import type { User } from "@hospital/shared";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  setAuth: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  setUser: (user: User) => void;
}
// Credentials live exclusively in the server's HttpOnly cookie. No persisted auth data.
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setAuth: (user) => set({ user }),
  logout: () => set({ user: null }),
  isAuthenticated: () => get().user !== null,
  setUser: (user) => set({ user }),
}));
