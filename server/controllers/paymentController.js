import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import Stripe from 'stripe';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AppError from '../utils/appError.js';
import {requireId} from '../utils/serialize.js';
import {releaseOrder} from './orderController.js';
import {logger} from '../middleware/logger.js';

let stripe;
export function getStripe(){
  if(!process.env.STRIPE_SECRET_KEY)throw new AppError('Stripe is not configured. Use cash on delivery.',503);
  stripe ||= new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:15000,maxNetworkRetries:1});return stripe;
}
export function verifySession(session,order){
  const attempt=order.stripeAttempt;
  if(!attempt?.attemptId||session.mode!=='payment'||session.metadata?.orderId!==String(order._id)||session.metadata?.userId!==String(order.user)
    ||session.metadata?.attemptId!==attempt.attemptId||session.currency!=='usd'||session.amount_total!==Math.round(order.totalPrice*100)
    ||(attempt.sessionId&&session.id!==attempt.sessionId))throw new AppError('Payment does not match its order reservation',409);
  return session;
}
export const createStripeSession=asyncHandler(async(req,res)=>{
  const provider=getStripe(),orderId=requireId(req.body.orderId);
  let order=await Order.findOne({_id:orderId,user:req.user.id});
  if(!order)throw new AppError('Order not found',404);
  if(order.paymentMethod!=='stripe'||order.isPaid||order.status!=='pending')throw new AppError('Order is not awaiting a Stripe payment',409);
  if(!order.stripeAttempt?.attemptId){
    if(!order.paymentExpiresAt||order.paymentExpiresAt.getTime()-Date.now()<31*60000)throw new AppError('The payment window has expired. Cancel this order and check out again.',409);
    order=await Order.findOneAndUpdate({_id:orderId,user:req.user.id,status:'pending',isPaid:false,'stripeAttempt.attemptId':{$exists:false}},
      {$set:{stripeAttempt:{attemptId:randomUUID(),createdAt:new Date()}}},{new:true})||await Order.findById(orderId);
  }
  if(order.status!=='pending'||order.isPaid)throw new AppError('Order is no longer awaiting payment',409);
  let session;
  if(order.stripeAttempt.sessionId)session=await provider.checkout.sessions.retrieve(order.stripeAttempt.sessionId);
  else {
    if(order.paymentExpiresAt.getTime()-Date.now()<31*60000)throw new AppError('Payment reservation requires reconciliation. Check your order history shortly.',409);
    const origin=(process.env.CLIENT_URL||'http://localhost:3000').replace(/\/$/,'');
    const metadata={orderId:String(order._id),userId:String(order.user),attemptId:order.stripeAttempt.attemptId};
    session=await provider.checkout.sessions.create({mode:'payment',payment_method_types:['card'],
      line_items:[{price_data:{currency:'usd',product_data:{name:`CustomForge order ${order._id}`},unit_amount:Math.round(order.totalPrice*100)},quantity:1}],
      success_url:`${origin}/orders/${order._id}?success=true`,cancel_url:`${origin}/orders/${order._id}?canceled=true`,
      expires_at:Math.floor(order.paymentExpiresAt.getTime()/1000),metadata,payment_intent_data:{metadata}},
    {idempotencyKey:`customforge-checkout-${order.stripeAttempt.attemptId}`});
  }
  verifySession(session,order);
  const written=await Order.updateOne({_id:order._id,status:'pending',isPaid:false,'stripeAttempt.attemptId':order.stripeAttempt.attemptId},
    {$set:{'stripeAttempt.sessionId':session.id,'stripeAttempt.checkoutUrl':session.url}});
  if(!written.matchedCount)throw new AppError('Payment state changed. Check your order history.',409);
  if(session.status!=='open'||!session.url)throw new AppError('Payment session is no longer open. Check your order status.',409);
  res.json({success:true,data:{sessionId:session.id,url:session.url}});
});
export async function settleSession(session){
  const orderId=requireId(session.metadata?.orderId);
  return mongoose.connection.transaction(async transaction=>{
    const order=await Order.findById(orderId).session(transaction);
    if(!order)throw new AppError('Payment order not found',409);
    verifySession(session,order);
    if(session.payment_status!=='paid')return order;
    if(order.isPaid)return order;
    if(order.status!=='pending'){
      order.status='payment_review';order.paymentResult={id:session.id,status:'requires_reconciliation'};
      await order.save({session:transaction});return order;
    }
    order.isPaid=true;order.paidAt=new Date();order.status='paid';
    order.stripeAttempt.sessionId=session.id;order.stripeAttempt.paymentIntentId=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
    order.paymentResult={id:session.id,status:'succeeded',method:'stripe'};
    await order.save({session:transaction});
    for(const item of order.orderItems)await Product.updateOne({_id:item.product},{$inc:{salesCount:item.quantity}},{session:transaction});
    return order;
  });
}
export const handleWebhook=asyncHandler(async(req,res)=>{
  const provider=getStripe();
  if(!process.env.STRIPE_WEBHOOK_SECRET)throw new AppError('Stripe webhooks are not configured',503);
  let event;
  try{event=provider.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);}catch{throw new AppError('Invalid webhook signature',400);}
  if(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired'].includes(event.type)){
    const incoming=event.data.object;
    if(incoming.metadata?.orderId){
      const session=await provider.checkout.sessions.retrieve(incoming.id);
      if(event.type==='checkout.session.expired'){
        const order=await Order.findById(requireId(session.metadata.orderId));
        if(!order)throw new AppError('Payment order not found',409);
        verifySession(session,order);
        if(session.payment_status==='paid')await settleSession(session);
        else if(session.status==='expired')await releaseOrder(String(order._id),{stripeConfirmedExpired:true});
      }else await settleSession(session);
    }
  }
  res.json({received:true});
});
export async function recoverStripeReservations(){
  const orders=await Order.find({paymentMethod:'stripe',status:'pending',isPaid:false,paymentExpiresAt:{$lt:new Date(Date.now()-5*60000)}}).sort('paymentExpiresAt').limit(20);
  for(const order of orders)try{
    if(!order.stripeAttempt?.attemptId){await releaseOrder(String(order._id));continue;}
    const provider=getStripe();let sessions=[];
    if(order.stripeAttempt.sessionId)sessions=[await provider.checkout.sessions.retrieve(order.stripeAttempt.sessionId)];
    else {
      let after,complete=false;
      for(let page=0;page<20;page++){
        const result=await provider.checkout.sessions.list({created:{gte:Math.floor(order.stripeAttempt.createdAt.getTime()/1000)-60},limit:100,...(after?{starting_after:after}:{})});
        sessions.push(...result.data.filter(row=>row.metadata?.orderId===String(order._id)));
        if(!result.has_more){complete=true;break;}after=result.data.at(-1)?.id;
      }
      if(!complete)throw new Error('Stripe discovery is incomplete');
    }
    for(const session of sessions)verifySession(session,order);
    if(sessions.some(session=>session.payment_status==='paid')){await settleSession(sessions.find(session=>session.payment_status==='paid'));continue;}
    for(const session of sessions)if(session.status==='open')await provider.checkout.sessions.expire(session.id);
    if(sessions.some(session=>session.status==='complete'))continue;
    await releaseOrder(String(order._id),{stripeConfirmedExpired:true});
  }catch(error){logger.warn('Stripe reservation retained for reconciliation',{orderId:String(order._id),message:error.message});}
}
export const getPaymentMethods=asyncHandler(async(req,res)=>res.json({success:true,data:[]}));
export const unavailable=(req,res,next)=>next(new AppError('This payment operation is unavailable. Use Stripe Checkout or cash on delivery.',503));
export const paymentCapabilities=(req,res)=>res.json({success:true,data:{cod:true,stripe:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET),savedCards:false,paypal:false}});
