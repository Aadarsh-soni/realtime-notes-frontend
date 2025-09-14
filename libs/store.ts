import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoading: false,
      setAuth: (token, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        set({ token, user, isLoading: false });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
        set({ token: null, user: null, isLoading: false });
      },
      setLoading: (isLoading) => set({ isLoading }),
      initializeAuth: () => {
        if (typeof window === 'undefined') {
          set({ token: null, user: null, isLoading: false });
          return;
        }
        
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({ token, user, isLoading: false });
          } catch (error) {
            console.error('Error parsing stored user data:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            set({ token: null, user: null, isLoading: false });
          }
        } else {
          set({ token: null, user: null, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: false,
  toggle: () => set({ dark: !get().dark }),
}));    