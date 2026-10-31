import {describe,it,expect} from 'vitest';
import {readCheckoutAttempt,saveCheckoutAttempt,clearCheckoutAttempt} from '@/lib/checkout-attempt';
describe('checkout reload recovery',()=>{
  const values=new Map<string,string>();
  const sessionStorage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)},clear:()=>values.clear()} as Storage;
  it('recovers the exact request after reload and isolates accounts',()=>{
    sessionStorage.clear();
    const request={idempotencyKey:crypto.randomUUID(),shippingAddressId:crypto.randomUUID(),paymentMethod:'stripe' as const};
    saveCheckoutAttempt(sessionStorage,'owner',request);
    expect(readCheckoutAttempt(sessionStorage,'owner')).toEqual(request);
    expect(readCheckoutAttempt(sessionStorage,'other')).toBeNull();
    clearCheckoutAttempt(sessionStorage,'owner');
    expect(readCheckoutAttempt(sessionStorage,'owner')).toBeNull();
  });
  it('does not silently discard corrupted uncertain attempts',()=>{
    sessionStorage.setItem('checkout-attempt:owner','{"paymentMethod":"paypal"}');
    expect(()=>readCheckoutAttempt(sessionStorage,'owner')).toThrow('Previous checkout needs review');
  });
  it('propagates persistence failures before an order can be submitted',()=>{
    const storage={setItem(){throw new Error('Storage unavailable')}} as unknown as Storage;
    expect(()=>saveCheckoutAttempt(storage,'owner',{idempotencyKey:crypto.randomUUID(),shippingAddressId:crypto.randomUUID(),paymentMethod:'cod'})).toThrow('Storage unavailable');
  });
});
