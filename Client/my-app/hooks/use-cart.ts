"use client";
import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useCartStore, type CartStoreItem } from '@/lib/cart-store';
import { CartService, type CartProduct } from '@/services/cart-service';
import { requireSuccess } from '@/lib/query-result';
import type { Product } from '@/lib/types';
import { toast } from 'sonner';

function productDto(p: CartProduct): Product {
  return {id: p.id, name: p.name || 'Unavailable product', images: p.images || [],
    originalPrice: Number(p.original_price ?? 0), finalPrice: Number(p.final_price ?? p.original_price ?? 0),
    stock: p.stock, availability: p.is_active && (p.stock ?? 0) > 0 ? 'In Stock' : 'Out of Stock',
    brand: '', category: '', sku: '', description: '', ratings: {average: 0, totalReviews: 0}};
}
export function useCart() {
  const {user, isAuthenticated, isEmailVerified, isLoading: authLoading} = useAuth();
  const guest = useCartStore();
  const qc = useQueryClient();
  const key = ['cart', user?.id];
  const pending = useIsMutating({mutationKey: ['cart']}) > 0;
  const query = useQuery({
    queryKey: key,
    enabled: isAuthenticated && isEmailVerified,
    queryFn: async () => {
      let response = requireSuccess(await CartService.get());
      const guestItems = useCartStore.getState().items;
      if (guestItems.length) {
        for (const item of guestItems) {
          const saved = response.data?.cart.items.find(i => i.product?.id === item.id);
          requireSuccess(saved ? await CartService.updateItem(item.id, {quantity: Math.max(saved.quantity, item.quantity)})
            : await CartService.add({productId: item.id, quantity: item.quantity}));
        }
        useCartStore.getState().clear();
        response = requireSuccess(await CartService.get());
      }
      return response;
    },
  });
  const mutation = useMutation({
    mutationKey: ['cart'], scope: {id: 'cart-writes'},
    mutationFn: async (action: {type: 'add' | 'update' | 'remove' | 'clear'; id?: string; product?: Product; quantity?: number}) => {
      if (!isAuthenticated) {
        if (action.type === 'add') guest.add(action.product!, action.quantity!);
        if (action.type === 'update') guest.update(action.id!, action.quantity!);
        if (action.type === 'remove') guest.remove(action.id!);
        if (action.type === 'clear') guest.clear();
        return;
      }
      const result = action.type === 'add' ? await CartService.add({productId: action.product!.id, quantity: action.quantity!})
        : action.type === 'update' ? await CartService.updateItem(action.id!, {quantity: action.quantity!})
        : action.type === 'remove' ? await CartService.removeItem(action.id!) : await CartService.clear();
      requireSuccess<unknown>(result);
    },
    onSuccess: () => qc.invalidateQueries({queryKey: ['cart']}),
    onError: error => toast.error(error.message),
  });
  const items: CartStoreItem[] = isAuthenticated ? (query.data?.data?.cart.items ?? [])
    .filter(i => !!i.product).map(i => ({id: i.product.id, product: productDto(i.product), quantity: i.quantity})) : guest.items;
  const subtotal = isAuthenticated ? Number(query.data?.data?.totals.subtotal ?? 0)
    : items.reduce((sum, i) => sum + Number(i.product.finalPrice ?? i.product.originalPrice) * i.quantity, 0);
  const addToCart = (product: Product, quantity = 1) => mutation.mutateAsync({type: 'add', product, quantity});
  const addItem = (product: Product, quantity = 1) => mutation.mutate({type: 'add', product, quantity});
  const remove = (id: string) => mutation.mutate({type: 'remove', id});
  const update = (id: string, quantity: number) => mutation.mutate({type: quantity > 0 ? 'update' : 'remove', id, quantity});
  const clear = () => mutation.mutate({type: 'clear'});
  return {items, subtotal, count: items.reduce((sum, i) => sum + i.quantity, 0),
    addToCart, addItem, removeItem: remove, removeFromCart: remove, updateQty: update, updateQuantity: update,
    clear, clearCart: clear, getTotalPrice: () => subtotal,
    acceptCheckout: () => { guest.clear(); qc.removeQueries({queryKey: ['cart']}); qc.invalidateQueries({queryKey: ['orders']}); },
    isPending: (_id?: string) => pending, isLoading: authLoading || (isAuthenticated && query.isLoading),
    error: query.error, retry: query.refetch, isRefreshing: query.isFetching, totals: query.data?.data?.totals,
  };
}
