import {describe,it,expect} from 'vitest';
import {safeRedirect} from '@/lib/safe-redirect';
describe('safe login and address return paths',()=>{
 it.each([null,'','javascript:alert(1)','https://evil.test','//evil.test','/\\evil.test','/\n/evil.test'])('returns home for missing or unsafe redirect %s',value=>expect(safeRedirect(value)).toBe('/'));
 it('preserves local route and query',()=>expect(safeRedirect('/orders/order?tab=payment')).toBe('/orders/order?tab=payment'));
});
