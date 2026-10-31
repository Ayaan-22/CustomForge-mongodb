import AppError from './appError.js';

// Legacy metadata is display-only. Provider tokens belong in the Stripe API.
export function validatePaymentMetadata(body) {
  if (body.cvv !== undefined || body.cvc !== undefined ||
      (body.cardNumber !== undefined && !/^\d{4}$/.test(String(body.cardNumber)))) {
    throw new AppError('Only the last four card digits may be stored. Use secure payment checkout for card details.', 400);
  }
}
export function publicPaymentMetadata(row) {
  if (!row) return row;
  const {cvv, cvc, card_number, ...safe} = row;
  return {...safe, card_number: String(card_number ?? '').replace(/\D/g, '').slice(-4)};
}
