import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CheckoutTotals } from '@/components/checkout-totals';
import { checkoutSummaryChanged, hasCheckoutTotals } from '@/lib/checkout-summary';
import type { CartResponse } from '@/services/cart-service';

const totals: CartResponse['totals'] = {
  subtotal:383.1,discount:0,finalPrice:383.1,shipping:0,tax:38.31,total:421.41,coupon:null,couponError:null,
  items:[{product:{id:'cpu',name:'Processor'},quantity:1,unitPrice:383.1,lineTotal:383.1}],
};
describe('checkout summary', () => {
  it('renders shipping, tax and the full backend total before submission', () => {
    const html=renderToStaticMarkup(<CheckoutTotals totals={totals} />);
    expect(html).toContain('Shipping'); expect(html).toContain('Tax');
    expect(html).toContain('$38.31'); expect(html).toContain('$421.41');
    expect(html).not.toContain('Estimated'); expect(html).not.toContain('Calculated at payment');
  });
  it('does not label the subtotal as a total when the contract is incomplete', () => {
    expect(hasCheckoutTotals({...totals,total:undefined} as unknown as CartResponse['totals'])).toBe(false);
    expect(hasCheckoutTotals({...totals,total:NaN})).toBe(false);
    const html=renderToStaticMarkup(<CheckoutTotals totals={undefined} />);
    expect(html).toContain('Loading shipping, tax and total'); expect(html).not.toContain('$');
  });
  it('requires review after tax, shipping, discount, price or quantity changes', () => {
    for(const key of ['shipping','tax','discount','total'] as const) {
      expect(checkoutSummaryChanged(totals,{...totals,[key]:totals[key]+1})).toBe(true);
    }
    expect(checkoutSummaryChanged(totals,{...totals,items:[{...totals.items[0],quantity:2}]})).toBe(true);
    expect(checkoutSummaryChanged(totals,{...totals,items:[{...totals.items[0],unitPrice:384}]})).toBe(true);
    expect(checkoutSummaryChanged(totals,{...totals})).toBe(false);
  });
});
