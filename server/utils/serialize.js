import mongoose from 'mongoose';
import AppError from './appError.js';

export function requireId(value) {
  if (!mongoose.isObjectIdOrHexString(value)) throw new AppError('Invalid resource ID',400);
  return String(value).toLowerCase();
}
export const plain = value => value?.toObject ? value.toObject({virtuals:false}) : value;
export function entity(value) {
  if (!value) return null;
  const object = plain(value);
  const {_id,__v,...rest} = object;
  return {...rest,id:String(_id || rest.id)};
}
export function publicProduct(value) {
  if (!value) return null;
  const row = entity(value);
  const fields = ['id','name','category','brand','specifications','originalPrice','discountPercentage','finalPrice','stock','availability','images','description','ratings','features','warranty','weight','dimensions','sku','isActive','isFeatured','createdAt','updatedAt'];
  return Object.fromEntries(fields.filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));
}
export function productRow(value) {
  const row=entity(value);
  return {...row,original_price:row.originalPrice,discount_percentage:row.discountPercentage,final_price:row.finalPrice,
    is_active:row.isActive,is_featured:row.isFeatured,sales_count:row.salesCount,created_at:row.createdAt,updated_at:row.updatedAt};
}
export function orderDTO(value) {
  const row=entity(value);
  return {id:row.id,userId:String(row.user),status:row.status,isPaid:row.isPaid,paymentMethod:row.paymentMethod,
    paymentExpiresAt:row.paymentExpiresAt,paidAt:row.paidAt,returnStatus:row.returnStatus,
    subtotal:row.itemsPrice,discount:row.discountAmount,shipping:row.shippingPrice,tax:row.taxPrice,total:row.totalPrice,
    address:row.shippingAddress,createdAt:row.createdAt,updatedAt:row.updatedAt,
    items:row.orderItems.map(item=>({productId:String(item.product),name:item.name,price:item.priceSnapshot,quantity:item.quantity,image:item.image}))};
}
export function pagination(query) {
  const page=Number(query.page ?? 1),limit=Number(query.limit ?? 20);
  if (!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(limit)||limit<1||limit>100) throw new AppError('Invalid pagination',400);
  return {page,limit,skip:(page-1)*limit};
}
