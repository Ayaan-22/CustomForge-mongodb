import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AdminOrder } from '@/types/admin';

const fixture=vi.hoisted(()=>({expanded:false,order:{id:'00000000-0000-4000-8000-000000000001',user_id:'customer',status:'payment_review',is_paid:true,total_price:10,items_price:10,tax_price:0,shipping_price:0,discount_amount:0,payment_method:'stripe',created_at:'2026-10-08T00:00:00Z',return_status:'requested',shipping_address:{},items:[]} as AdminOrder}));
vi.mock('react',async original=>{
  const react=await original<typeof import('react')>();
  return {...react,useState:(initial:unknown)=>{
    const value=initial===null&&!fixture.expanded?(fixture.expanded=true,fixture.order.id):initial;
    return react.useState(value);
  }};
});
vi.mock('@/hooks/use-url-state',()=>({useUrlState:(key:string)=>[{page:1,limit:10,searchTerm:'',statusFilter:'all'}[key as 'page'],vi.fn()]}));
vi.mock('@/hooks/use-debounced-value',()=>({useDebouncedValue:(value:unknown)=>value}));
vi.mock('@/hooks/use-admin-query',()=>({useAdminQuery:(key:string[])=>({data:key[0]==='orders'?{data:[fixture.order],pages:1,count:1}:undefined,isLoading:false,isFetching:false,error:null,refetch:vi.fn()})}));
vi.mock('@/hooks/use-admin-mutation',()=>({useAdminMutation:()=>vi.fn()}));
vi.mock('@/hooks/use-confirmation',()=>({useConfirmation:()=>({confirm:vi.fn(),confirmationDialog:null})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
import OrdersPage from '@/app/admin/orders/page';
beforeEach(()=>{fixture.expanded=false;fixture.order.status='payment_review';});
describe('admin captured payment review',()=>{
  it('shows the captured payment and reconciliation instructions while hiding fulfillment/return controls',()=>{
    const html=renderToStaticMarkup(<OrdersPage/>);
    expect(html).toContain('Payment needs review');
    expect(html).toContain('Fulfillment is paused. Reconcile the payment with Stripe');
    expect(html).not.toContain('Mark as processing');
    expect(html).not.toContain('Approve return');
    expect(html).not.toContain('Record cash payment');
  });
  it('retains processing for a regular paid order',()=>{
    fixture.order.status='paid';
    expect(renderToStaticMarkup(<OrdersPage/>)).toContain('Mark as processing');
  });
});
