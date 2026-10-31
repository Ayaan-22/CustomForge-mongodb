"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./types";

export const BUILD_SLOTS = [
  "CPU",
  "GPU",
  "Motherboard",
  "RAM",
  "Storage",
  "Power Supply",
  "Cooler",
  "Case",
] as const;
export type BuildSlot = (typeof BUILD_SLOTS)[number];
type ForgeStore = {
  comparison: Product[];
  build: Partial<Record<BuildSlot, Product>>;
  toggleCompare: (product: Product) => void;
  clearComparison: () => void;
  selectPart: (slot: BuildSlot, product?: Product) => void;
  clearBuild: () => void;
};

// Public catalog snapshots are local shopping intent. Prices are fetched again
// before buying; authenticated cart and account data remain in existing services.
export const useForgeStore = create<ForgeStore>()(
  persist(
    (set) => ({
      comparison: [],
      build: {},
      toggleCompare: (product) =>
        set((state) => ({
          comparison: state.comparison.some((p) => p.id === product.id)
            ? state.comparison.filter((p) => p.id !== product.id)
            : state.comparison.length < 4
              ? [...state.comparison, product]
              : state.comparison,
        })),
      clearComparison: () => set({ comparison: [] }),
      selectPart: (slot, product) =>
        set((state) => ({ build: { ...state.build, [slot]: product } })),
      clearBuild: () => set({ build: {} }),
    }),
    { name: "customforge-loadout-v1", skipHydration: true },
  ),
);
