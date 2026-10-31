import { create } from "zustand"

interface AuthState {
  twoFactorToken: string | null
  setTwoFactorToken: (token: string | null) => void
  accessToken: string | null
  user: {
    id: string
    name: string
    email: string
    role: string
    isEmailVerified: boolean
    twoFactorEnabled: boolean
  } | null
  setToken: (token: string) => void
  setUser: (user: AuthState["user"]) => void
  setAuth: (token: string, user: NonNullable<AuthState["user"]>) => void
  clearAuth: () => void
  requiresTwoFactor: boolean
  setRequiresTwoFactor: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  twoFactorToken: null,
  setTwoFactorToken: (twoFactorToken) => set({ twoFactorToken }),
  accessToken: null,
  user: null,
  requiresTwoFactor: false,
  setToken: (token: string) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setAuth: (accessToken, user) => set(state => ({ accessToken, user, requiresTwoFactor: false,
    twoFactorToken: state.user?.id === user.id ? state.twoFactorToken : null })),
  clearAuth: () => set({ accessToken: null, user: null, requiresTwoFactor: false, twoFactorToken: null }),
  setRequiresTwoFactor: (value: boolean) => set({ requiresTwoFactor: value }),
}))
