export type CheckoutAttempt = { idempotencyKey: string; shippingAddressId: string; paymentMethod: 'stripe' | 'cod' };
const key = (userId: string) => `checkout-attempt:${userId}`;

// Only opaque IDs and the payment choice are stored; never tokens, card data or addresses.
export function readCheckoutAttempt(storage: Storage, userId: string): CheckoutAttempt | null {
  const raw = storage.getItem(key(userId));
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('idempotencyKey' in value) || !('shippingAddressId' in value) || !('paymentMethod' in value)
    || typeof value.idempotencyKey !== 'string' || !/^[\da-f-]{36}$/i.test(value.idempotencyKey)
    || typeof value.shippingAddressId !== 'string' || !/^[\da-f-]{36}$/i.test(value.shippingAddressId)
    || !['stripe', 'cod'].includes(String(value.paymentMethod))) throw new Error('Previous checkout needs review. Open your orders before starting another checkout.');
  return {idempotencyKey:value.idempotencyKey, shippingAddressId:value.shippingAddressId, paymentMethod:value.paymentMethod as 'stripe' | 'cod'};
}
export function saveCheckoutAttempt(storage: Storage, userId: string, value: CheckoutAttempt) {
  storage.setItem(key(userId), JSON.stringify(value));
}
export function clearCheckoutAttempt(storage: Storage, userId: string) { storage.removeItem(key(userId)); }
