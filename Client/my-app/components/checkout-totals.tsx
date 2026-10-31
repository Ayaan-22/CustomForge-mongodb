import type { CartResponse } from '@/services/cart-service';
import { formatPrice } from '@/lib/format';
import { hasCheckoutTotals } from '@/lib/checkout-summary';

export function CheckoutTotals({ totals }: { totals: CartResponse['totals'] | undefined }) {
  if (!hasCheckoutTotals(totals)) return <p role="status">Loading shipping, tax and total…</p>;
  return <dl className="space-y-2" aria-live="polite">
    <div className="flex justify-between gap-4 text-sm"><dt>Subtotal</dt><dd>{formatPrice(totals.subtotal)}</dd></div>
    {totals.discount > 0 && <div className="flex justify-between gap-4 text-sm"><dt>Coupon discount</dt><dd>−{formatPrice(totals.discount)}</dd></div>}
    <div className="flex justify-between gap-4 text-sm"><dt>Shipping</dt><dd>{formatPrice(totals.shipping)}</dd></div>
    <div className="flex justify-between gap-4 text-sm"><dt>Tax</dt><dd>{formatPrice(totals.tax)}</dd></div>
    <div className="flex justify-between gap-4 border-t pt-3 text-lg font-semibold"><dt>Total</dt><dd>{formatPrice(totals.total)}</dd></div>
  </dl>;
}
