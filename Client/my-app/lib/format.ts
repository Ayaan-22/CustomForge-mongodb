export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function finalPrice(originalPrice: number, discountPercentage?: number) {
  if (!discountPercentage) return originalPrice;
  return Number((originalPrice * (1 - discountPercentage / 100)).toFixed(2));
}
