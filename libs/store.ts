import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: { id: number; email: string; name?: string } | null;
  setAuth: (token: string, user: { id: number; email: string; name?: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  clearAuth: () => set({ token: null, user: null }),
}));

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: false,
  toggle: () => set({ dark: !get().dark }),
}));    