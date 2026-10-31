import {randomUUID} from 'node:crypto';
import OrderEmail from '../models/OrderEmail.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Email from './email.js';
import {orderDTO} from './serialize.js';

export async function processOrderEmails(){
  const now=new Date(),leaseId=randomUUID();
  const job=await OrderEmail.findOneAndUpdate({$or:[{state:'pending',availableAt:{$lte:now}},{state:'sending',leaseUntil:{$lt:now}}]},
    {$set:{state:'sending',leaseId,leaseUntil:new Date(Date.now()+120000)},$inc:{attempts:1}},{new:true,sort:{createdAt:1}});
  if(!job)return;
  try{
    const order=await Order.findById(job.order).lean(),user=order?await User.findById(order.user).lean():null;
    if(!order||!user)throw new Error('Order or recipient is unavailable');
    const url=`${process.env.CLIENT_URL||'http://localhost:3000'}/orders/${order._id}`;
    await new Email(user,url,{order:orderDTO(order),signal:AbortSignal.timeout(60000),messageId:`<order-${order._id}@customforge.local>`}).sendOrderConfirmation(orderDTO(order));
    await OrderEmail.updateOne({_id:job._id,leaseId},{$set:{state:'sent',sentAt:new Date()},$unset:{leaseId:'',leaseUntil:'',lastError:''}});
  }catch(error){
    await OrderEmail.updateOne({_id:job._id,leaseId},{$set:{state:'pending',availableAt:new Date(Date.now()+Math.min(3600000,30000*2**Math.min(job.attempts,7))),lastError:error.message},$unset:{leaseId:'',leaseUntil:''}});
  }
}
