import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import AdminAuthority from '../models/AdminAuthority.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Review from '../models/Review.js';
import AppError from '../utils/appError.js';
import {entity,productRow,requireId,pagination} from '../utils/serialize.js';
import {publicUser} from '../utils/publicUser.js';
import {releaseOrder} from './orderController.js';
import {uploadImages} from '../utils/uploads.js';

const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const search=query=>{
  if(query.search===undefined)return null;
  if(typeof query.search!=='string'||query.search.length>200)throw new AppError('Invalid search',400);
  return {$regex:escapeRegex(query.search.trim()),$options:'i'};
};
const bool=value=>{if(!['true','false',true,false].includes(value))throw new AppError('Invalid boolean filter',400);return value===true||value==='true';};
const number=value=>{if(typeof value==='object'||!Number.isFinite(Number(value)))throw new AppError('Invalid numeric value',400);return Number(value);};
const sortFor=(query,allowed)=>{
  const field=query.sortBy||'created_at';if(!allowed[field])throw new AppError('Invalid sorting',400);
  if(query.sortOrder&&!['asc','desc'].includes(query.sortOrder))throw new AppError('Invalid sort direction',400);
  return {[allowed[field]]:query.sortOrder==='asc'?1:-1,_id:1};
};
function dates(query,filter){
  if(query.createdFrom||query.createdTo){filter.createdAt={};for(const [key,op]of[['createdFrom','$gte'],['createdTo','$lte']])if(query[key]){
    const value=new Date(query[key]);if(Number.isNaN(value.getTime()))throw new AppError('Invalid date filter',400);filter.createdAt[op]=value;
  }}return filter;
}
async function pageResult(model,filter,req,res,map,sort){
  const {page,limit,skip}=pagination(req.query);
  const [rows,count]=await Promise.all([model.find(filter).sort(sort||{createdAt:-1,_id:1}).skip(skip).limit(limit).lean(),model.countDocuments(filter)]);
  res.json({success:true,data:rows.map(map),count,total:count,page,limit,pages:Math.ceil(count/limit)});
}
const userRow=row=>({...publicUser(entity(row)),is_email_verified:row.isEmailVerified,two_factor_enabled:row.twoFactorEnabled,created_at:row.createdAt});
async function changeAccess(actor,id,updates){
  return mongoose.connection.transaction(async session=>{
    // Serialize role changes through one record to prevent last-admin write skew.
    await AdminAuthority.updateOne({_id:'roles'},{$inc:{revision:1}},{upsert:true,session});
    if(!await User.exists({_id:actor,role:'admin',active:true}).session(session))throw new AppError('Administrator access changed. Sign in again.',403);
    const user=await User.findById(id).session(session);if(!user)throw new AppError('User not found',404);
    if(user.role==='admin'&&user.active&&(updates.role==='user'||updates.active===false)){
      if(await User.countDocuments({role:'admin',active:true}).session(session)<=1)throw new AppError('At least one active administrator must remain',409);
    }
    Object.assign(user,updates);
    if(updates.active===false){user.refreshTokenHash=null;user.refreshTokenExpires=null;}
    await user.save({session});return user.toObject();
  });
}
export const getAllUsers=asyncHandler(async(req,res)=>{
  const query={},text=search(req.query);if(text)query.$or=[{name:text},{email:text}];
  if(req.query.role)query.role=req.query.role;
  if(req.query.isActive!==undefined)query.active=bool(req.query.isActive);
  await pageResult(User,dates(req.query,query),req,res,userRow,sortFor(req.query,{created_at:'createdAt',name:'name',email:'email',role:'role'}));
});
export const getUserById=asyncHandler(async(req,res)=>{
  const row=await User.findById(requireId(req.params.id)).lean();if(!row)throw new AppError('User not found',404);
  res.json({success:true,data:{...userRow(row),addresses:row.addresses.map(address=>({...entity(address),userId:String(row._id)})),paymentMethods:[]}});
});
export const createUser=asyncHandler(async(req,res)=>{
  const {name,email,password,role='user'}=req.body;
  if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8||password.length>128)throw new AppError('Provide a valid email and an 8 to 128 character password',400);
  const row=await User.create({name,email,password,role,isEmailVerified:true});res.status(201).json({success:true,data:userRow(row.toObject())});
});
export const updateUser=asyncHandler(async(req,res)=>{
  const id=requireId(req.params.id),updates={};
  for(const key of ['name','email','role','active'])if(req.body[key]!==undefined)updates[key]=req.body[key];
  if(updates.active!==undefined&&typeof updates.active!=='boolean')throw new AppError('Invalid active state',400);
  if(updates.email!==undefined&&(typeof updates.email!=='string'||!/^\S+@\S+\.\S+$/.test(updates.email)))throw new AppError('Invalid email',400);
  if(id===req.user.id&&(updates.role&&updates.role!=='admin'||updates.active===false))throw new AppError('You cannot revoke your own administrator access',409);
  const row=await changeAccess(req.user.id,id,updates);
  res.json({success:true,data:userRow(row)});
});
export const deleteUser=asyncHandler(async(req,res)=>{
  const id=requireId(req.params.id);if(id===req.user.id)throw new AppError('You cannot deactivate your own administrator account',409);
  await changeAccess(req.user.id,id,{active:false});
  res.json({success:true,message:'User deactivated'});
});
export const getAllProducts=asyncHandler(async(req,res)=>{
  const query={},text=search(req.query);if(text)query.$or=[{name:text},{sku:text},{brand:text}];
  for(const key of ['category','brand','availability'])if(req.query[key]){if(typeof req.query[key]!=='string')throw new AppError('Invalid filter',400);query[key]=req.query[key];}
  for(const key of ['isActive','isFeatured'])if(req.query[key]!==undefined)query[key]=bool(req.query[key]);
  for(const [field,min,max] of [['finalPrice','minPrice','maxPrice'],['stock','minStock','maxStock']])if(req.query[min]!==undefined||req.query[max]!==undefined)query[field]={...(req.query[min]!==undefined?{$gte:number(req.query[min])}:{}),...(req.query[max]!==undefined?{$lte:number(req.query[max])}:{})};
  await pageResult(Product,dates(req.query,query),req,res,productRow,sortFor(req.query,{created_at:'createdAt',createdAt:'createdAt',name:'name',stock:'stock',final_price:'finalPrice',finalPrice:'finalPrice',sales_count:'salesCount'}));
});
export const getProduct=asyncHandler(async(req,res)=>{const row=await Product.findById(requireId(req.params.id)).lean();if(!row)throw new AppError('Product not found',404);res.json({success:true,data:productRow(row)});});
async function productPayload(req){
  const updates={};
  for(const key of ['name','category','brand','originalPrice','discountPercentage','stock','images','description','features','specifications','warranty','weight','dimensions','sku','isActive','isFeatured'])if(req.body[key]!==undefined){
    let value=req.body[key];
    if(['images','features','specifications','dimensions'].includes(key)&&typeof value==='string')try{value=JSON.parse(value);}catch{throw new AppError(`Invalid ${key}`,400);}
    if(['originalPrice','discountPercentage','stock','weight'].includes(key))value=number(value);
    if(['isActive','isFeatured'].includes(key))value=bool(value);
    if(key==='specifications'&&!Array.isArray(value)&&value&&typeof value==='object')value=Object.entries(value).map(([key,value])=>({key,value:String(value)}));
    updates[key]=value;
  }
  const uploaded=await uploadImages(req.files);if(uploaded.length)updates.images=[...(updates.images||[]),...uploaded];
  return updates;
}
export const createProduct=asyncHandler(async(req,res)=>{const row=await Product.create(await productPayload(req));res.status(201).json({success:true,data:productRow(row)});});
export const updateProduct=asyncHandler(async(req,res)=>{
  const row=await Product.findById(requireId(req.params.id));if(!row)throw new AppError('Product not found',404);
  Object.assign(row,await productPayload(req));await row.save();res.json({success:true,data:productRow(row)});
});
export const deleteProduct=asyncHandler(async(req,res)=>{
  const row=await Product.findByIdAndUpdate(requireId(req.params.id),{$set:{isActive:false}},{new:true});if(!row)throw new AppError('Product not found',404);
  res.json({success:true,message:'Product archived'});
});
const orderRow=row=>({...entity(row),user_id:String(row.user?._id||row.user),user:row.user?.name?{name:row.user.name,email:row.user.email}:null,
  total_price:row.totalPrice,items_price:row.itemsPrice,tax_price:row.taxPrice,shipping_price:row.shippingPrice,discount_amount:row.discountAmount,
  payment_method:row.paymentMethod,is_paid:row.isPaid,created_at:row.createdAt,return_status:row.returnStatus,
  payment_result:row.status==='payment_review'?{reconciliationRequired:true}:row.paymentResult,shipping_address:row.shippingAddress,
  items:row.orderItems.map(item=>({id:String(item.product),product_id:String(item.product),name:item.name,price:item.priceSnapshot,quantity:item.quantity,image:item.image}))});
export const getOrders=asyncHandler(async(req,res)=>{
  const query={};if(req.query.status)query.status=req.query.status;
  if(req.query.isPaid!==undefined)query.isPaid=bool(req.query.isPaid);
  if(req.query.minTotal!==undefined||req.query.maxTotal!==undefined)query.totalPrice={...(req.query.minTotal!==undefined?{$gte:number(req.query.minTotal)}:{}),...(req.query.maxTotal!==undefined?{$lte:number(req.query.maxTotal)}:{})};
  const text=search(req.query);if(text){const ids=await User.find({$or:[{name:text},{email:text}]}).distinct('_id');query.$or=[{user:{$in:ids}},{'shippingAddress.fullName':text},...(mongoose.isObjectIdOrHexString(req.query.search)?[{_id:req.query.search},{user:req.query.search}]:[])];}
  const {page,limit,skip}=pagination(req.query);dates(req.query,query);
  const [rows,count]=await Promise.all([Order.find(query).populate('user','name email').sort(sortFor(req.query,{created_at:'createdAt',total_price:'totalPrice',status:'status'})).skip(skip).limit(limit).lean(),Order.countDocuments(query)]);
  res.json({success:true,data:rows.map(orderRow),count,page,limit,pages:Math.ceil(count/limit)});
});
export const getOrder=asyncHandler(async(req,res)=>{const row=await Order.findById(requireId(req.params.id)).populate('user','name email').lean();if(!row)throw new AppError('Order not found',404);res.json({success:true,data:orderRow(row)});});
export const updateOrderStatus=asyncHandler(async(req,res)=>{
  if(req.body.status==='cancelled'){const row=await releaseOrder(req.params.id);res.json({success:true,data:orderRow(row.toObject())});return;}
  const row=await Order.findById(requireId(req.params.id));if(!row)throw new AppError('Order not found',404);
  const next={pending:'processing',paid:'processing',processing:'shipped',shipped:'delivered'}[row.status];
  if(!next||req.body.status!==next||(!row.isPaid&&row.paymentMethod!=='cod')||(next==='delivered'&&!row.isPaid))throw new AppError('Invalid fulfillment transition',409);
  row.status=next;if(next==='delivered'){row.isDelivered=true;row.deliveredAt=new Date();}await row.save();res.json({success:true,data:orderRow(row.toObject())});
});
export const markOrderAsPaid=asyncHandler(async(req,res)=>{
  const row=await mongoose.connection.transaction(async session=>{
    const order=await Order.findById(requireId(req.params.id)).session(session);if(!order)throw new AppError('Order not found',404);
    if(order.paymentMethod!=='cod'||['cancelled','payment_review','refunded','returned'].includes(order.status))throw new AppError('Only active cash on delivery orders can be recorded as paid',409);
    if(order.isPaid)return order;
    order.isPaid=true;order.paidAt=new Date();if(order.status==='pending')order.status='paid';await order.save({session});
    for(const item of order.orderItems)await Product.updateOne({_id:item.product},{$inc:{salesCount:item.quantity}},{session});return order;
  });res.json({success:true,data:orderRow(row.toObject())});
});
export const updateOrderToDelivered=(req,res,next)=>{req.body={status:'delivered'};return updateOrderStatus(req,res,next);};
export const processRefund=(req,res,next)=>next(new AppError('Refunds require provider reconciliation and are unavailable in this release',503));
export const processReturn=asyncHandler(async(req,res)=>{
  const row=await Order.findById(requireId(req.params.id));if(!row)throw new AppError('Order not found',404);
  if(row.status!=='delivered')throw new AppError('Only delivered orders may be returned',409);
  const desired=req.body.returnStatus||'approved';
  if(!({requested:['approved','rejected'],approved:['completed']}[row.returnStatus]||[]).includes(desired))throw new AppError('Invalid return transition',409);
  row.returnStatus=desired;if(desired==='completed')row.status='returned';await row.save();res.json({success:true,data:orderRow(row.toObject())});
});
const couponFields=['code','discountType','discountValue','minPurchase','maxDiscount','validFrom','validTo','isActive','usageLimit','perUserLimit','applicableProducts','excludedProducts','description'];
const couponPayload=body=>Object.fromEntries(couponFields.filter(key=>body[key]!==undefined).map(key=>[key,body[key]]));
export const getCoupons=asyncHandler(async(req,res)=>{
  const query={},text=search(req.query);if(text)query.code=text;if(req.query.isActive!==undefined)query.isActive=bool(req.query.isActive);
  if(req.query.discountType)query.discountType=req.query.discountType;
  await pageResult(Coupon,query,req,res,entity);
});
export const getCoupon=asyncHandler(async(req,res)=>{const row=await Coupon.findById(requireId(req.params.id)).lean();if(!row)throw new AppError('Coupon not found',404);res.json({success:true,data:entity(row)});});
export const createCoupon=asyncHandler(async(req,res)=>{const row=await Coupon.create(couponPayload(req.body));res.status(201).json({success:true,data:entity(row)});});
export const updateCoupon=asyncHandler(async(req,res)=>{const row=await Coupon.findById(requireId(req.params.id));if(!row)throw new AppError('Coupon not found',404);Object.assign(row,couponPayload(req.body));await row.save();res.json({success:true,data:entity(row)});});
export const deleteCoupon=asyncHandler(async(req,res)=>{const row=await Coupon.findByIdAndUpdate(requireId(req.params.id),{$set:{isActive:false}},{new:true});if(!row)throw new AppError('Coupon not found',404);res.json({success:true,message:'Coupon deactivated'});});
export const toggleCoupon=asyncHandler(async(req,res)=>{const row=await Coupon.findById(requireId(req.params.id));if(!row)throw new AppError('Coupon not found',404);row.isActive=!row.isActive;await row.save();res.json({success:true,data:entity(row)});});
const reviewRow=row=>({...entity(row),user_id:String(row.user?._id||row.user),product_id:String(row.product?._id||row.product),
  user:row.user?.name?{name:row.user.name,email:row.user.email}:null,product:row.product?.name?{name:row.product.name}:null,
  verified_purchase:row.verifiedPurchase,helpful_votes:row.helpfulVotes,report_reason:row.reportReason,is_active:row.isActive,created_at:row.createdAt,updated_at:row.updatedAt});
export const getReviews=asyncHandler(async(req,res)=>{
  const query={};if(req.query.rating)query.rating=number(req.query.rating);if(req.query.reported!==undefined)query.reported=bool(req.query.reported);
  const text=search(req.query);if(text)query.$or=[{title:text},{comment:text}];
  const {page,limit,skip}=pagination(req.query);const [rows,count]=await Promise.all([Review.find(query).populate('user','name email').populate('product','name').sort('-createdAt').skip(skip).limit(limit).lean(),Review.countDocuments(query)]);
  res.json({success:true,data:rows.map(reviewRow),count,page,limit,pages:Math.ceil(count/limit)});
});
export const moderateReview=asyncHandler(async(req,res)=>{
  const row=await Review.findById(requireId(req.params.id));if(!row)throw new AppError('Review not found',404);
  row.isActive=req.body.action==='approve'?true:req.body.action==='reject'?false:bool(req.body.isActive);
  await row.save();res.json({success:true,data:reviewRow(row.toObject())});
});
export const deleteReview=asyncHandler(async(req,res)=>{const row=await Review.findById(requireId(req.params.id));if(!row)throw new AppError('Review not found',404);row.isActive=false;await row.save();res.json({success:true,message:'Review removed'});});
