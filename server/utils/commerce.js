import AppError from './appError.js';

export const cents = value => Math.round(Number(value)*100);
export function totals(subtotalCents,discountCents,itemCount) {
  const net=Math.max(0,subtotalCents-discountCents);
  const shipping=itemCount && net<10000 ? 1000:0;
  const tax=Math.round(net/10);
  return {itemsPrice:subtotalCents/100,discountAmount:discountCents/100,shippingPrice:shipping/100,taxPrice:tax/100,totalPrice:(net+shipping+tax)/100};
}
export function couponDiscount(coupon,subtotalCents,productIds,now=new Date()) {
  if(!coupon) return 0;
  if(!coupon.isActive||coupon.validFrom>now||coupon.validTo<now) throw new AppError('Coupon is inactive or expired',400);
  if(coupon.usageLimit!=null&&coupon.timesUsed>=coupon.usageLimit) throw new AppError('Coupon usage limit reached',400);
  if(subtotalCents<cents(coupon.minPurchase||0)) throw new AppError('Minimum purchase for coupon not reached',400);
  const included=coupon.applicableProducts.map(String),excluded=coupon.excludedProducts.map(String);
  if(productIds.some(id=>excluded.includes(id))||(included.length&&productIds.some(id=>!included.includes(id)))) throw new AppError('Coupon does not apply to all products in this cart',400);
  let amount=coupon.discountType==='percent'?Math.round(subtotalCents*coupon.discountValue/100):cents(coupon.discountValue);
  if(coupon.maxDiscount!=null) amount=Math.min(amount,cents(coupon.maxDiscount));
  return Math.min(subtotalCents,Math.max(0,amount));
}
