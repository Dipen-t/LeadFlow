import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  brokerageId: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        window.location.href = '/login'; // Force redirect to clear app state safely
      },

      fetchProfile: async () => {
        try {
          const res = await api.get('/auth/me');
          if (res.data.status === 'success') {
            set({ user: res.data.data.user });
          }
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage', // saves to local storage
    }
  )
);
