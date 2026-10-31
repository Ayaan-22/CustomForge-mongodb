import type { CartResponse } from '@/services/cart-service';

type Totals = CartResponse['totals'];

// Rendering/contract guards only. Pricing rules stay on the backend.
export function hasCheckoutTotals(totals: Totals | undefined): totals is Totals {
  return !!totals && ['subtotal', 'discount', 'shipping', 'tax', 'total'].every(key => {
    const value = totals[key as keyof Totals];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }) && Array.isArray(totals.items);
}

export function checkoutSummaryChanged(shown: Totals, fresh: Totals): boolean {
  const snapshot = (totals: Totals) => JSON.stringify({
    subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping,
    tax: totals.tax, total: totals.total, coupon: totals.coupon?.code ?? null,
    items: totals.items.map(item => [item.product.id, item.quantity, item.unitPrice, item.lineTotal])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  });
  return snapshot(shown) !== snapshot(fresh);
}
