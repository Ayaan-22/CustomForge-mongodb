import type { Product } from "@/lib/types";

/** Display catalog limits without treating missing or malformed stock as zero. */
export function cartStockState(product: Product, quantity: number) {
  const stock =
    typeof product.stock === "number" &&
    Number.isSafeInteger(product.stock) &&
    product.stock >= 0
      ? product.stock
      : undefined;
  const unavailable =
    product.isActive === false ||
    product.availability === "Out of Stock" ||
    stock === 0;
  const exceedsStock = stock !== undefined && quantity > stock;
  return {
    canIncrease: !unavailable && (stock === undefined || quantity < stock),
    blockingMessage: unavailable
      ? "Currently unavailable. Remove this item to continue."
      : exceedsStock
        ? `Only ${stock} available. Reduce your quantity to continue.`
        : null,
    label: unavailable
      ? "Unavailable"
      : product.availability === "Preorder"
        ? "Preorder"
        : stock === undefined
          ? "Stock checked at checkout"
          : quantity >= stock
            ? "Maximum available quantity"
            : "In stock",
  };
}
