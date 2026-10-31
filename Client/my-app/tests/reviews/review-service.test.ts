import { beforeEach, describe, expect, it, vi } from 'vitest';
const fetchApi = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', () => ({ apiFetch: fetchApi }));
import { ReviewService } from '@/services/review-service';

beforeEach(() => fetchApi.mockReset());
describe('review API contracts', () => {
  it('normalizes the database-shaped mutation response without exposing owner IDs', async () => {
    fetchApi.mockResolvedValue({status:201,error:null,data:{id:'review',product_id:'product',user_id:'private',rating:4,title:'Great item',comment:'Works as expected',created_at:'2026-10-03',is_active:false}});
    const response = await ReviewService.addReview('product', {rating:4,title:'Great item',comment:'Works as expected'});
    expect(response.data).toMatchObject({id:'review',productId:'product',createdAt:'2026-10-03',isActive:false});
    expect(response.data).not.toHaveProperty('user_id');
    expect(response.data).not.toHaveProperty('review');
  });
  it('preserves a conflict instead of turning it into a successful review', async () => {
    const failure = {status:409,data:null,error:{status:409,message:'Edit your existing review'}};
    fetchApi.mockResolvedValue(failure);
    expect(await ReviewService.updateReview('review',{rating:5})).toEqual(failure);
  });
  it('uses the anonymous canonical read with backend pagination', async () => {
    const response = {status:200,error:null,data:[],pagination:{page:2,limit:20,total:30}};
    fetchApi.mockResolvedValue(response);
    expect(await ReviewService.getProductReviews('product',{page:2,limit:20})).toEqual(response);
    expect(fetchApi).toHaveBeenCalledWith('/products/product/reviews',{method:'GET',params:{page:2,limit:20},skipAuth:true});
  });
});
