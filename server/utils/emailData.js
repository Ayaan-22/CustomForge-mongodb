import AppError from './appError.js';
import { htmlToText } from 'html-to-text';

export function emailPlainText(html) {
  return htmlToText(html, {
    wordwrap: 100,
    selectors: [
      { selector: '.preheader', format: 'skip' },
      { selector: '.accent-bar', format: 'skip' },
      { selector: 'table.items-table', format: 'dataTable', options: { colSpacing: 3, maxColumnWidth: 40 } },
      { selector: 'table.totals-table', format: 'dataTable', options: { colSpacing: 3 } },
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
    ],
  });
}

// Email must never invent a zero total or interpolate an unsafe action URL.
export function safeEmailUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new AppError('Invalid email action URL', 500); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new AppError('Email action URL must use HTTPS', 500);
  }
  return url.href;
}

function amount(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    throw new AppError('Missing order amount for email', 500);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new AppError('Invalid order amount for email', 500);
  return number;
}

// Consume persisted order snapshots (checkout RPC / mapper), never cart totals.
export function orderEmailData(order) {
  const orderId = order?.id ?? order?._id;
  if (typeof orderId !== 'string' || !orderId.trim()) throw new AppError('Missing order ID for email', 500);
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount(value));
  const total = money(order.total_price ?? order.totalPrice ?? order.total);
  const paid = (order.is_paid ?? order.isPaid) === true;
  const method = order.payment_method ?? order.paymentMethod;
  const rawItems = order.items ?? order.orderItems ?? [];
  if (!Array.isArray(rawItems)) throw new AppError('Invalid order items for email', 500);
  const items = rawItems.map(item => {
    if (typeof item.name !== 'string' || !item.name.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new AppError('Invalid order item for email', 500);
    }
    return { name: item.name, quantity: item.quantity, unitPrice: money(item.price) };
  });
  const totals = [
    ['Subtotal', order.items_price ?? order.subtotal],
    ['Discount', order.discount_amount ?? order.discount],
    ['Shipping', order.shipping_price ?? order.shipping],
    ['Tax', order.tax_price ?? order.tax],
  ].filter(([, value]) => value !== undefined && value !== null)
    .map(([label, value]) => ({ label, value: `${label === 'Discount' && amount(value) > 0 ? '−' : ''}${money(value)}` }));
  return {
    orderId, shortOrderId: orderId.slice(0, 8).toUpperCase(), total, totals, items,
    paymentLabel: method === 'cod' ? 'Cash on delivery' : method === 'stripe' ? 'Card · Stripe' : 'See order details',
    paymentStatus: paid ? 'Payment confirmed' : method === 'cod' ? 'Due on delivery' : 'Awaiting payment',
    paymentNote: paid ? 'Your payment is confirmed. View your order for the latest fulfillment status.'
      : method === 'cod' ? 'Your order is received. Payment is due on delivery.'
        : 'Your order is received, but payment is not yet confirmed. Open your order to complete payment or check its status.',
  };
}
