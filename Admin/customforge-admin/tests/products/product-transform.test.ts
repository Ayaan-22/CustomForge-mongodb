import {describe,it,expect} from 'vitest';
import {productFromRow,type ProductRow} from '@/lib/product-transform';
describe('admin product contract',()=>{it('preserves price, zero stock, inactive flags and editable specifications',()=>{
  const product=productFromRow({id:'product',name:'CPU',category:'CPU',brand:'Brand',sku:'SKU',description:'Product',features:[],images:[],availability:'Out of Stock',sales_count:0,original_price:100,final_price:80,discount_percentage:20,stock:0,is_active:false,is_featured:false,specifications:{Memory:'32 GB'},ratings:{average:4,total_reviews:2}});
  expect(product).toMatchObject({originalPrice:100,finalPrice:80,stock:0,isActive:false,isFeatured:false,specifications:[{key:'Memory',value:'32 GB'}],ratings:{average:4,totalReviews:2}});
});});
