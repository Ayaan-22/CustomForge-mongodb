"use client";
import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {UserService} from '@/services/user-service';
import {AuthService} from '@/services/auth-service';
import {useAuthStore} from '@/lib/auth-store';
import {requireSuccess} from '@/lib/query-result';
import type {User} from '@/lib/types';
import {toast} from 'sonner';

type AuthContextType = {user: User | null; isAuthenticated: boolean; isEmailVerified: boolean; isLoading: boolean; refetchUser: () => void; logout: () => Promise<void>};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({children}: {children: React.ReactNode}) {
  const queryClient = useQueryClient();
  const {user, accessToken, clearAuth} = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    AuthService.refreshToken().finally(() => {if (active) setInitializing(false);});
    return () => {active = false;};
  }, []);
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (previous.user && !state.user) queryClient.clear();
    });
    return unsubscribe;
  }, [clearAuth, queryClient]);
  useEffect(() => {
    if (previousUser.current && previousUser.current !== user?.id) queryClient.clear();
    previousUser.current = user?.id ?? null;
  }, [user?.id, queryClient]);
  const me = useQuery({
    queryKey: ['me', user?.id],
    queryFn: () => UserService.me().then(requireSuccess),
    enabled: !initializing && !!accessToken,
    retry: false,
    staleTime: 300_000,
  });
  useEffect(() => {
    if (me.data?.data && me.data.data.id === useAuthStore.getState().user?.id) useAuthStore.getState().updateUser(me.data.data);
  }, [me.data, clearAuth]);
  const logout = async () => {
    const result = await AuthService.logout();
    if (result.error) {toast.error('Sign out failed. Please retry to end your server session.'); return;}
    queryClient.clear();
    window.location.assign('/login');
  };
  return <AuthContext.Provider value={{user, isAuthenticated: !!user && !!accessToken,
    isEmailVerified: !!user?.isEmailVerified, isLoading: initializing || me.isLoading,
    refetchUser: () => {void me.refetch();}, logout}}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
