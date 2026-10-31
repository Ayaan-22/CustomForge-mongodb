import asyncHandler from 'express-async-handler';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import AppError from '../utils/appError.js';
import {requireId,productRow,entity} from '../utils/serialize.js';
import {cents,totals,couponDiscount} from '../utils/commerce.js';

export async function loadCart(userId,session=null) {
  return Cart.findOne({user:userId}).populate('items.product').populate('coupon').session(session).lean();
}
export function computeCartTotals(cart) {
  let subtotal=0,discount=0,couponError=null;
  const items=[],warnings=[];
  for(const item of cart?.items||[]) {
    const p=item.product;
    if(!p?.isActive){warnings.push({message:'A product is no longer available',productId:p?String(p._id):null});continue;}
    const unit=cents(p.finalPrice),line=unit*item.quantity;subtotal+=line;
    items.push({product:{id:String(p._id),name:p.name,image:p.images?.[0]},quantity:item.quantity,unitPrice:unit/100,lineTotal:line/100});
    if(p.stock<item.quantity)warnings.push({message:`Only ${p.stock} available for ${p.name}`,productId:String(p._id)});
  }
  if(cart?.coupon)try{discount=couponDiscount(cart.coupon,subtotal,items.map(item=>item.product.id));}catch(error){couponError=error.message;}
  const prices=totals(subtotal,discount,items.length);
  return {items,subtotal:prices.itemsPrice,discount:prices.discountAmount,finalPrice:(subtotal-discount)/100,
    shipping:prices.shippingPrice,tax:prices.taxPrice,total:prices.totalPrice,coupon:cart?.coupon&&!couponError?{code:cart.coupon.code}:null,couponError,warnings};
}
const cartDTO=cart=>cart?{id:String(cart._id),items:cart.items.map(item=>({quantity:item.quantity,product:item.product?productRow(item.product):null})),coupon:cart.coupon?entity(cart.coupon):null}:{items:[],coupon:null};
const sendCart=async(req,res)=>{
  const cart=await loadCart(req.user.id);res.json({success:true,data:{cart:cartDTO(cart),totals:computeCartTotals(cart)}});
};
export const getCart=asyncHandler(sendCart);
const quantity=value=>{if(!Number.isInteger(value)||value<1||value>10)throw new AppError('Quantity must be an integer from 1 to 10',400);return value;};
async function editCart(userId,action) {
  // Optimistic concurrency retries reload the latest cart before applying intent.
  for(let attempt=0;attempt<5;attempt++) {
    let cart=await Cart.findOne({user:userId});
    if(!cart)try{cart=await Cart.create({user:userId});}catch(error){if(error.code===11000)continue;throw error;}
    await action(cart);
    try{await cart.save();return;}catch(error){if(error.name==='VersionError')continue;throw error;}
  }
  throw new AppError('Cart changed while updating. Please retry.',409);
}
export const addToCart=asyncHandler(async(req,res)=>{
  const id=requireId(req.body.productId),amount=quantity(req.body.quantity);
  const product=await Product.findOne({_id:id,isActive:true}).lean();
  if(!product)throw new AppError('Product not found',404);
  await editCart(req.user.id,cart=>{
    const item=cart.items.find(item=>String(item.product)===id),next=(item?.quantity||0)+amount;
    quantity(next);if(next>product.stock)throw new AppError('Requested quantity exceeds available stock',409);
    if(item)item.quantity=next;else{if(cart.items.length>=50)throw new AppError('Cart has reached its item limit',400);cart.items.push({product:id,quantity:amount});}
  });await sendCart(req,res);
});
export const updateCartItem=asyncHandler(async(req,res)=>{
  const id=requireId(req.body.productId||req.params.productId),amount=quantity(req.body.quantity);
  const product=await Product.findOne({_id:id,isActive:true}).lean();
  if(!product||amount>product.stock)throw new AppError('Requested stock is unavailable',409);
  await editCart(req.user.id,cart=>{const item=cart.items.find(item=>String(item.product)===id);if(!item)throw new AppError('Cart item not found',404);item.quantity=amount;});
  await sendCart(req,res);
});
export const removeFromCart=asyncHandler(async(req,res)=>{
  const id=requireId(req.params.productId);await editCart(req.user.id,cart=>{cart.items=cart.items.filter(item=>String(item.product)!==id);});await sendCart(req,res);
});
export const clearCart=asyncHandler(async(req,res)=>{await editCart(req.user.id,cart=>{cart.items=[];cart.coupon=null;});await sendCart(req,res);});
export const applyCoupon=asyncHandler(async(req,res)=>{
  if(typeof req.body.code!=='string'||req.body.code.length>50)throw new AppError('Enter a valid coupon code',400);
  const coupon=await Coupon.findOne({code:req.body.code.trim().toUpperCase()}).lean();
  if(!coupon)throw new AppError('Coupon not found',404);
  const cart=await loadCart(req.user.id);if(!cart?.items.length)throw new AppError('Add products before applying a coupon',400);
  const subtotal=computeCartTotals({...cart,coupon:null}).subtotal;
  couponDiscount(coupon,cents(subtotal),cart.items.map(item=>String(item.product?._id)));
  await editCart(req.user.id,row=>{row.coupon=coupon._id;});await sendCart(req,res);
});
export const removeCoupon=asyncHandler(async(req,res)=>{await editCart(req.user.id,cart=>{cart.coupon=null;});await sendCart(req,res);});
