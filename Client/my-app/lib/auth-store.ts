import { create } from "zustand";
import type { User } from "./types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,

  setAuth: (token: string, user: User) => {
    set({ accessToken: token, user });
  },

  clearAuth: () => {
    set({ accessToken: null, user: null });
  },

  updateUser: (user: User) => {
    set({ user });
  },

  isAuthenticated: () => {
    return !!get().accessToken && !!get().user;
  },
}));

// Convenience getters for use outside React components
export const getAccessToken = () => useAuthStore.getState().accessToken;
export const getUser = () => useAuthStore.getState().user;
export const isAuthenticated = () => useAuthStore.getState().isAuthenticated();
