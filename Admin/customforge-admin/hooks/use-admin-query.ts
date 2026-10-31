"use client";
import {useQuery, type QueryKey} from '@tanstack/react-query';
import {useAuthStore} from '@/lib/auth-store';
export function useAdminQuery<T>(key: QueryKey, queryFn: () => Promise<T>, options: {enabled?: boolean} = {}) {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.accessToken);
  const twoFactorToken = useAuthStore(state => state.twoFactorToken);
  return useQuery({queryKey: ['admin', user?.id, ...key], queryFn,
    enabled: options.enabled !== false && !!token && user?.role === 'admin' && (!user.twoFactorEnabled || !!twoFactorToken),
  });
}
