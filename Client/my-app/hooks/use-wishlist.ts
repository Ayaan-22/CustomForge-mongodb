"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserService } from '@/services/user-service';
import { useAuth } from '@/lib/auth-context';
import { requireSuccess } from '@/lib/query-result';
import type { WishlistItem } from '@/lib/types';

const useGuestWishlist = create<{ids: string[]; add: (id: string) => void; remove: (id: string) => void}>()(persist(set => ({
  ids: [], add: id => set(s => ({ids: [...new Set([...s.ids, id])]})),
  remove: id => set(s => ({ids: s.ids.filter(value => value !== id)})),
}), {name: 'customforge-guest-wishlist-v2'}));

export function useWishlist() {
  const {isAuthenticated, isEmailVerified, user} = useAuth();
  const guest = useGuestWishlist();
  const query = useQuery({
    queryKey: ['wishlist', user?.id], enabled: isAuthenticated && isEmailVerified,
    queryFn: async () => {
      // Query deduplication runs one merge per account, even when many cards mount.
      for (const id of useGuestWishlist.getState().ids) {
        requireSuccess(await UserService.addToWishlist(id));
        useGuestWishlist.getState().remove(id);
      }
      return requireSuccess(await UserService.wishlist()).data ?? [];
    }, staleTime: 60_000,
  });
  return {...query, data: isAuthenticated ? query.data : guest.ids.map(id => ({id, productId: id} satisfies WishlistItem))};
}

function useWishlistMutation(action: 'add' | 'remove') {
  const qc = useQueryClient();
  const {isAuthenticated} = useAuth();
  return useMutation({mutationKey: ['wishlist', action], scope: {id: 'wishlist-writes'},
    mutationFn: async (id: string) => {
      if (!isAuthenticated) { useGuestWishlist.getState()[action](id); return; }
      requireSuccess(await (action === 'add' ? UserService.addToWishlist(id) : UserService.removeFromWishlist(id)));
    }, onSuccess: () => qc.invalidateQueries({queryKey: ['wishlist']}),
  });
}
export function useAddToWishlist() { return useWishlistMutation('add'); }
export function useRemoveFromWishlist() { return useWishlistMutation('remove'); }
export function useIsInWishlist(id: string) { return useWishlist().data?.some(item => item.productId === id) ?? false; }
export function useToggleWishlist() {
  const add = useAddToWishlist(); const remove = useRemoveFromWishlist();
  return {toggle: (id: string, present: boolean) => (present ? remove : add).mutateAsync(id), isLoading: add.isPending || remove.isPending};
}
