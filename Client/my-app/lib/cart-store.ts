"use client";
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/lib/types';
export type CartStoreItem = { id: string; product: Product; quantity: number };
type GuestCart = {
  items: CartStoreItem[];
  add: (product: Product, quantity: number) => void;
  remove: (id: string) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
};
// Only anonymous shopping intent is persisted. Authenticated carts live in Query.
export const useCartStore = create<GuestCart>()(persist((set) => ({
  items: [],
  add: (product, quantity) => set(state => ({ items: state.items.some(i => i.id === product.id)
    ? state.items.map(i => i.id === product.id ? {...i, quantity: i.quantity + quantity} : i)
    : [...state.items, {id: product.id, product, quantity}] })),
  remove: id => set(state => ({items: state.items.filter(i => i.id !== id)})),
  update: (id, quantity) => set(state => ({items: state.items.map(i => i.id === id ? {...i, quantity} : i).filter(i => i.quantity > 0)})),
  clear: () => set({items: []}),
}), {name: 'customforge-guest-cart-v2', storage: createJSONStorage(() => localStorage)}));
