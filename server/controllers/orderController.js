import mongoose from 'mongoose';
import {createHash} from 'node:crypto';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import User from '../models/User.js';
import OrderEmail from '../models/OrderEmail.js';
import AppError from '../utils/appError.js';
import {cents,totals,couponDiscount} from '../utils/commerce.js';
import {orderDTO,requireId,pagination} from '../utils/serialize.js';
import {createOrderSchema} from '../validation/orderSchemas.js';
import {ensureAddressIds} from '../utils/addressIds.js';

export const createOrder=asyncHandler(async(req,res)=>{
  const parsed=createOrderSchema.safeParse(req.body);
  if(!parsed.success)throw new AppError('A complete shipping address, payment method and idempotency key are required',400);
  const input=parsed.data,paymentMethod=input.paymentMethod||'cod';
  if(paymentMethod==='paypal')throw new AppError('PayPal is unavailable. Choose cash on delivery or Stripe.',503);
  if(paymentMethod==='stripe'&&(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET))throw new AppError('Stripe is not configured. Choose cash on delivery.',503);
  const fingerprint=createHash('sha256').update(JSON.stringify({address:input.shippingAddress||null,addressId:input.shippingAddressId||null,paymentMethod})).digest('hex');
  let created=false;
  let order;
  try {
    order=await mongoose.connection.transaction(async session=>{
      const existing=await Order.findOne({user:req.user.id,idempotencyKey:input.idempotencyKey}).session(session);
      if(existing){if(existing.requestFingerprint!==fingerprint)throw new AppError('This checkout key belongs to a different request',409);return existing;}
      let address=input.shippingAddress;
      if(input.shippingAddressId){
        const user=ensureAddressIds(await User.findById(req.user.id).session(session));
        const saved=user.addresses.id(input.shippingAddressId);
        if(!saved)throw new AppError('Saved address not found',404);
        const {_id,...rest}=saved.toObject();address=rest;
      }
      const cart=await Cart.findOne({user:req.user.id}).session(session);
      if(!cart?.items.length)throw new AppError('Your cart is empty',400);
      if(cart.items.length>50)throw new AppError('Cart contains too many products',400);
      let subtotal=0;
      const items=[];
      for(const item of cart.items){
        const product=await Product.findById(item.product).session(session);
        if(!product?.isActive)throw new AppError('A cart product is no longer available',409);
        if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>10)throw new AppError('Invalid cart quantity',400);
        if(product.stock<item.quantity)throw new AppError(`Insufficient stock for ${product.name}`,409);
        const unit=cents(product.finalPrice);
        if(!Number.isSafeInteger(unit)||unit<0)throw new AppError('Product price is unavailable',409);
        subtotal+=unit*item.quantity;
        items.push({product:product._id,name:product.name,image:product.images?.[0]||'/placeholder.svg',price:unit/100,priceSnapshot:unit/100,quantity:item.quantity});
        const changed=await Product.updateOne({_id:product._id,isActive:true,stock:{$gte:item.quantity}},{$inc:{stock:-item.quantity},$set:{availability:product.stock-item.quantity>0?'In Stock':'Out of Stock'}},{session});
        if(changed.modifiedCount!==1)throw new AppError('Stock changed. Review your cart and retry.',409);
      }
      const coupon=cart.coupon?await Coupon.findById(cart.coupon).session(session):null;
      if(cart.coupon&&!coupon)throw new AppError('The cart coupon is no longer available',409);
      const discount=couponDiscount(coupon,subtotal,items.map(item=>String(item.product)));
      if(coupon){
        if(coupon.perUserLimit!=null){
          const used=await Order.countDocuments({user:req.user.id,couponId:coupon._id,status:{$nin:['cancelled','refunded']}}).session(session);
          if(used>=coupon.perUserLimit)throw new AppError('You have reached this coupon usage limit',400);
        }
        const updated=await Coupon.updateOne({_id:coupon._id,isActive:true,...(coupon.usageLimit!=null?{timesUsed:{$lt:coupon.usageLimit}}:{})},{$inc:{timesUsed:1}},{session});
        if(updated.modifiedCount!==1)throw new AppError('Coupon is no longer available',409);
      }
      const [result]=await Order.create([{
        user:req.user.id,orderItems:items,shippingAddress:address,paymentMethod,
        ...totals(subtotal,discount,items.length),
        couponId:coupon?._id,couponApplied:coupon?{code:coupon.code,discountType:coupon.discountType,discountValue:coupon.discountValue,discountAmount:discount/100}:undefined,
        idempotencyKey:input.idempotencyKey,requestFingerprint:fingerprint,
        paymentExpiresAt:paymentMethod==='stripe'?new Date(Date.now()+2*60*60*1000):undefined,
      }],{session});
      result.validateTotals();
      cart.items=[];cart.coupon=null;await cart.save({session});
      await OrderEmail.create([{order:result._id}],{session});
      created=true;return result;
    });
  }catch(error){
    if(error.code!==11000)throw error;
    order=await Order.findOne({user:req.user.id,idempotencyKey:input.idempotencyKey});
    if(!order||order.requestFingerprint!==fingerprint)throw new AppError('Checkout changed. Review your order history before retrying.',409);
    created=false;
  }
  res.status(created?201:200).json({success:true,data:orderDTO(order)});
});
export const getOrderById=asyncHandler(async(req,res)=>{
  const order=await Order.findOne({_id:requireId(req.params.id),user:req.user.id}).lean();
  if(!order)throw new AppError('Order not found',404);
  res.json({success:true,data:orderDTO(order)});
});
export const getMyOrders=asyncHandler(async(req,res)=>{
  const {page,limit,skip}=pagination(req.query);
  const [rows,total]=await Promise.all([Order.find({user:req.user.id}).sort('-createdAt').skip(skip).limit(limit).lean(),Order.countDocuments({user:req.user.id})]);
  res.json({success:true,data:rows.map(orderDTO),total,page,limit});
});
export const getPaymentStatus=asyncHandler(async(req,res)=>{
  const order=await Order.findOne({_id:requireId(req.params.id),user:req.user.id}).lean();
  if(!order)throw new AppError('Order not found',404);
  res.json({success:true,data:{isPaid:order.isPaid,status:order.status,paidAt:order.paidAt||null}});
});
export async function releaseOrder(id,{userId,stripeConfirmedExpired=false}={}){
  return mongoose.connection.transaction(async session=>{
    const order=await Order.findOne({_id:requireId(id),...(userId?{user:userId}:{})}).session(session);
    if(!order)throw new AppError('Order not found',404);
    if(order.status==='cancelled')return order;
    if(order.isPaid||order.status!=='pending')throw new AppError('Only unpaid pending orders can be cancelled',409);
    if(order.paymentMethod==='stripe'&&order.stripeAttempt?.attemptId&&!stripeConfirmedExpired)throw new AppError('Stripe payment must expire before this reservation can be cancelled',409);
    for(const item of order.orderItems)await Product.updateOne({_id:item.product},{$inc:{stock:item.quantity},$set:{availability:'In Stock'}},{session});
    if(order.couponId)await Coupon.updateOne({_id:order.couponId,timesUsed:{$gt:0}},{$inc:{timesUsed:-1}},{session});
    order.status='cancelled';await order.save({session});return order;
  });
}
export const cancelOrder=asyncHandler(async(req,res)=>{
  const order=await releaseOrder(req.params.id,{userId:req.user.id});res.json({success:true,data:{id:String(order._id),status:order.status}});
});
export const requestReturn=asyncHandler(async(req,res)=>{
  const order=await Order.findOne({_id:requireId(req.params.id),user:req.user.id});
  if(!order)throw new AppError('Order not found',404);
  if(order.status!=='delivered'||!order.deliveredAt||Date.now()-order.deliveredAt.getTime()>30*86400000)throw new AppError('Returns are available within 30 days after delivery',409);
  if(order.returnStatus!=='none')throw new AppError('A return has already been requested',409);
  order.returnStatus='requested';order.returnRequestedAt=new Date();await order.save();
  res.json({success:true,data:orderDTO(order)});
});
