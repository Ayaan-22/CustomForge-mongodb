import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {createApp} from '../app.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import OrderEmail from '../models/OrderEmail.js';
import Email from '../utils/email.js';
import {signToken,verifyJWT} from '../utils/generateToken.js';
import {logger} from '../middleware/logger.js';
import {getStripe} from '../controllers/paymentController.js';
import {processOrderEmails} from '../utils/orderEmailOutbox.js';

const app=createApp(),password='TestPassword123!';
const address={fullName:'Test Customer',address:'123 Test Street',city:'Karachi',state:'Sindh',postalCode:'75500',country:'Pakistan',phoneNumber:'+923001234567'};
let database,users,product;
let emails=[];
vi.spyOn(Email.prototype,'send').mockImplementation(async function(template){emails.push({template,url:this.url,to:this.to});});
beforeAll(async()=>{
  database=await MongoMemoryReplSet.create({binary:{...(process.env.MONGOMS_SYSTEM_BINARY?{systemBinary:process.env.MONGOMS_SYSTEM_BINARY}:{})},replSet:{count:1,storageEngine:'wiredTiger',configSettings:{electionTimeoutMillis:10000,heartbeatIntervalMillis:2000}}});
  await connectDB(database.getUri('customforge_isolated_test'));
  await Promise.all(Object.values(mongoose.models).map(model=>model.init()));
  users=await User.create([{name:'First Customer',email:'first@example.test',password,isEmailVerified:true},{name:'Second Customer',email:'second@example.test',password,isEmailVerified:true},{name:'Store Admin',email:'admin@example.test',password,isEmailVerified:true,role:'admin'}]);
});
afterAll(async()=>{await mongoose.disconnect();await database?.stop();logger.close();});
beforeEach(async()=>{
  emails=[];
  await Promise.all([Product.deleteMany({}),Cart.deleteMany({}),Coupon.deleteMany({}),Order.deleteMany({}),OrderEmail.deleteMany({})]);
  await User.deleteMany({_id:{$nin:users.map(user=>user._id)}});
  await User.updateMany({},{$set:{addresses:[],wishlist:[],active:true,twoFactorEnabled:false}});
  await User.updateMany({_id:{$in:users.slice(0,2).map(user=>user._id)}},{$set:{role:'user'}});
  await User.updateOne({_id:users[2]._id},{$set:{role:'admin'}});
  product=await Product.create({name:'Test Graphics Card',brand:'CustomForge',category:'GPU',sku:'TEST-GPU',originalPrice:19.99,discountPercentage:10,stock:10,images:['/graphics-card-gpu.jpg'],description:'A test graphics card',isActive:true,isFeatured:true});
});
function customer(index=0){return {agent:request.agent(app),token:signToken(String(users[index]._id),users[index].role,'15m')};}
async function write(client,method,url,body={}){
  const csrf=await client.agent.get('/api/v1/auth/csrf-token');
  return client.agent[method]('/api/v1'+url).set('x-csrf-token',csrf.body.data.csrfToken).set('Authorization',`Bearer ${client.token}`).send(body);
}
async function add(client,quantity=1){return write(client,'post','/cart/add',{productId:String(product._id),quantity});}
async function checkout(client,key='checkout-test-key'){return write(client,'post','/orders',{shippingAddress:address,paymentMethod:'cod',idempotencyKey:key});}

describe('MongoDB customer and commerce contracts',()=>{
  it('serves a ready API and a public catalog with ObjectId IDs',async()=>{
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    const response=await request(app).get('/api/v1/products');
    expect(response.status).toBe(200);expect(response.body.data[0]).toMatchObject({id:String(product._id),finalPrice:17.99});
    expect(response.body.total).toBe(1);expect(response.body.data[0]).not.toHaveProperty('salesCount');
    for(const sort of ['-created_at','final_price','-discount_percentage'])expect((await request(app).get('/api/v1/products').query({sort})).status).toBe(200);
  });
  it('rejects malformed filters and treats search syntax as literal text',async()=>{
    expect((await request(app).get('/api/v1/products?minPrice=no')).status).toBe(400);
    expect((await request(app).get('/api/v1/products?category[$ne]=GPU')).status).toBe(400);
    expect((await request(app).get('/api/v1/products?q=%28.%2A%29')).body.total).toBe(0);
    expect((await request(app).get('/api/v1/products/not-an-id')).status).toBe(400);
  });
  it('requires both authentication and a bound CSRF token on mutations',async()=>{
    expect((await request(app).post('/api/v1/cart/add').send({})).status).toBe(403);
    expect((await write({agent:request.agent(app),token:'invalid'},'post','/cart/add',{})).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/products')).status).toBe(401);
    expect((await request(app).get('/api/v1/admin/products').set('Authorization',`Bearer ${customer().token}`)).status).toBe(403);
  });
  it('registers, verifies an email, signs in and rotates a refresh session',async()=>{
    const client=customer(),email='new@example.test';
    const registered=await write(client,'post','/auth/register',{name:'New Customer',email,password,passwordConfirm:password});
    expect(registered.status).toBe(201);expect(emails.at(-1)?.url).toContain('/verify-email/');
    const token=emails.at(-1).url.split('/').at(-1);
    const verified=await write(client,'post',`/auth/verify-email/${token}`);
    expect(verified.status).toBe(200);expect(verified.body.data.user.isEmailVerified).toBe(true);
    expect((await write(client,'post',`/auth/verify-email/${token}`)).status).toBe(400);
    const output=JSON.stringify(verified.body);expect(output).not.toContain('refreshTokenHash');expect(output).not.toContain('emailVerificationToken');
    const refreshed=await write(client,'post','/auth/refresh');expect(refreshed.status).toBe(200);
    expect(verifyJWT(refreshed.body.token).tokenUse).toBe('access');
    const me=await client.agent.get('/api/v1/users/me').set('Authorization',`Bearer ${refreshed.body.token}`);
    expect(me.body.data.email).toBe(email);
  });
  it('persists addresses with stable IDs, enforces ownership and default selection',async()=>{
    const first=customer(),second=customer(1);
    const added=await write(first,'post','/users/addresses',address);expect(added.status).toBe(201);
    const saved=added.body.data.address;expect(saved.id).toMatch(/^[a-f\d]{24}$/);expect(saved.isDefault).toBe(true);
    expect((await write(second,'patch',`/users/addresses/${saved.id}`,{city:'Lahore'})).status).toBe(404);
    const orderClient=first;await add(orderClient);
    const order=await write(orderClient,'post','/orders',{shippingAddressId:saved.id,paymentMethod:'cod',idempotencyKey:'address-checkout-key'});
    expect(order.status).toBe(201);expect(order.body.data.address.city).toBe('Karachi');
  });
  it('persists wishlist items in the current storefront shape',async()=>{
    const client=customer();expect((await write(client,'post',`/users/wishlist/${product._id}`)).status).toBe(200);
    const result=await client.agent.get('/api/v1/users/wishlist').set('Authorization',`Bearer ${client.token}`);
    expect(result.body.data).toEqual([{id:String(product._id),productId:String(product._id)}]);
  });
  it('uses integer-cent totals consistently from cart through checkout',async()=>{
    const client=customer(),added=await add(client);
    expect(added.body.data.totals).toMatchObject({subtotal:17.99,tax:1.8,shipping:10,total:29.79});
    const result=await checkout(client);expect(result.status).toBe(201);
    expect(result.body.data).toMatchObject({subtotal:17.99,tax:1.8,shipping:10,total:29.79,isPaid:false,paymentMethod:'cod'});
    expect((await Product.findById(product._id)).stock).toBe(9);expect(await OrderEmail.countDocuments()).toBe(1);
    expect((await Cart.findOne({user:users[0]._id})).items).toHaveLength(0);
  });
  it('rejects fractional, negative, excessive and oversold cart quantities',async()=>{
    const client=customer();for(const quantity of [0,-1,1.5,11])expect((await add(client,quantity)).status).toBe(400);
    await Product.updateOne({_id:product._id},{$set:{stock:1}});expect((await add(client,2)).status).toBe(409);
    const productId=String(product._id).toUpperCase();
    expect((await write(client,'post','/cart/add',{productId,quantity:1})).status).toBe(200);
    expect((await write(client,'patch','/cart/update',{productId,quantity:1})).status).toBe(200);
  });
  it('makes checkout retries idempotent without leaking another customer order',async()=>{
    const first=customer(),second=customer(1);await add(first);await add(second);
    const initial=await checkout(first,'shared-checkout-key');const retry=await checkout(first,'shared-checkout-key');
    expect(initial.status).toBe(201);expect(retry.status).toBe(200);expect(retry.body.data.id).toBe(initial.body.data.id);
    const other=await checkout(second,'shared-checkout-key');expect(other.status).toBe(201);expect(other.body.data.id).not.toBe(initial.body.data.id);
    expect((await Product.findById(product._id)).stock).toBe(8);
    expect((await write(first,'post','/orders',{shippingAddress:{...address,city:'Lahore'},paymentMethod:'cod',idempotencyKey:'shared-checkout-key'})).status).toBe(409);
  });
  it('prevents concurrent customers from buying the final unit twice',async()=>{
    await Product.updateOne({_id:product._id},{$set:{stock:1}});
    const first=customer(),second=customer(1);await add(first);await add(second);
    const responses=await Promise.all([checkout(first,'race-customer-one'),checkout(second,'race-customer-two')]);
    expect(responses.map(result=>result.status).sort()).toEqual([201,409]);
    expect(await Order.countDocuments()).toBe(1);expect((await Product.findById(product._id)).stock).toBe(0);
  });
  it('rolls back stock and preserves the cart if strict coupon validation fails',async()=>{
    const client=customer();await add(client);
    const coupon=await Coupon.create({code:'EXPIRED',discountType:'percent',discountValue:10,validFrom:new Date(Date.now()-86400000),validTo:new Date(Date.now()-1000)});
    await Cart.updateOne({user:users[0]._id},{$set:{coupon:coupon._id}});
    expect((await checkout(client)).status).toBe(400);expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(product._id)).stock).toBe(10);expect((await Cart.findOne({user:users[0]._id})).items).toHaveLength(1);
  });
  it('releases inventory and coupon usage exactly once on cancellation',async()=>{
    const client=customer();await add(client);
    const coupon=await Coupon.create({code:'SAVE10',discountType:'percent',discountValue:10,validTo:new Date(Date.now()+86400000),usageLimit:1});
    expect((await write(client,'post','/cart/coupon',{code:'SAVE10'})).status).toBe(200);
    const order=await checkout(client);expect(order.status).toBe(201);expect(order.body.data.discount).toBe(1.8);
    expect((await Coupon.findById(coupon._id)).timesUsed).toBe(1);
    expect((await write(client,'post',`/orders/cancel/${order.body.data.id}`)).status).toBe(200);
    expect((await write(client,'post',`/orders/cancel/${order.body.data.id}`)).status).toBe(200);
    expect((await Product.findById(product._id)).stock).toBe(10);expect((await Coupon.findById(coupon._id)).timesUsed).toBe(0);
  });
  it('keeps order history and individual order access scoped to their owner',async()=>{
    const first=customer(),second=customer(1);await add(first);const order=await checkout(first);
    expect((await second.agent.get(`/api/v1/orders/${order.body.data.id}`).set('Authorization',`Bearer ${second.token}`)).status).toBe(404);
    const history=await first.agent.get('/api/v1/orders').set('Authorization',`Bearer ${first.token}`);
    expect(history.body.total).toBe(1);expect(history.body.data[0].items[0].productId).toBe(String(product._id));
  });
  it('supports the COD fulfillment sequence and counts sales once',async()=>{
    const buyer=customer(),admin=customer(2);await add(buyer);const order=await checkout(buyer),id=order.body.data.id;
    expect((await write(admin,'patch',`/admin/orders/${id}/update-status`,{status:'processing'})).status).toBe(200);
    expect((await write(admin,'patch',`/admin/orders/${id}/update-status`,{status:'shipped'})).status).toBe(200);
    expect((await write(admin,'patch',`/admin/orders/${id}/mark-delivered`)).status).toBe(409);
    expect((await write(admin,'patch',`/admin/orders/${id}/mark-paid`)).status).toBe(200);
    expect((await write(admin,'patch',`/admin/orders/${id}/mark-paid`)).status).toBe(200);
    expect((await write(admin,'patch',`/admin/orders/${id}/mark-delivered`)).status).toBe(200);
    expect((await Product.findById(product._id)).salesCount).toBe(1);
    expect((await write(buyer,'post',`/orders/cancel/${id}`)).status).toBe(409);
    for(const search of [id,String(users[0]._id)]){
      const result=await admin.agent.get('/api/v1/admin/orders').query({search}).set('Authorization',`Bearer ${admin.token}`);
      expect(result.status).toBe(200);expect(result.body.count).toBe(1);
    }
    for(const period of ['daily','weekly','monthly']){
      const result=await admin.agent.get('/api/v1/admin/analytics/sales').query({period}).set('Authorization',`Bearer ${admin.token}`);
      expect(result.status).toBe(200);expect(result.body.data.totalOrders).toBe(1);
      expect(result.body.data.revenueData[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.body.data.customerStats).toEqual({totalCustomers:1,newCustomers:1,returningCustomers:0});
    }
  });
  it('serves admin catalog, users, orders and all six analytics contracts',async()=>{
    const admin=customer(2);for(const route of ['products','users','orders','coupons','reviews','analytics/overview','analytics/sales','analytics/products','analytics/users','analytics/orders','analytics/inventory']){
      const response=await admin.agent.get(`/api/v1/admin/${route}`).set('Authorization',`Bearer ${admin.token}`);expect(response.status,route).toBe(200);expect(response.body).toHaveProperty('data');
    }
  });
  it('reports unavailable integrations and never accepts a fabricated payment',async()=>{
    const client=customer();await add(client);
    const capabilities=await request(app).get('/api/v1/payment/capabilities');expect(capabilities.body.data).toMatchObject({cod:true,stripe:false,savedCards:false});
    expect((await write(client,'post','/orders',{shippingAddress:address,paymentMethod:'stripe',idempotencyKey:'unconfigured-stripe'})).status).toBe(503);
    expect((await write(client,'post','/payment/process',{orderId:String(product._id),isPaid:true})).status).toBe(503);
    expect(await Order.countDocuments()).toBe(0);expect((await Product.findById(product._id)).stock).toBe(10);
  });
  it('collapses concurrent retries of the same checkout into one durable order',async()=>{
    const client=customer();await add(client);
    const csrf=await request(app).get('/api/v1/auth/csrf-token');
    const cookie=csrf.headers['set-cookie'].map(value=>value.split(';')[0]);
    const payload={shippingAddress:address,paymentMethod:'cod',idempotencyKey:'concurrent-identical-key'};
    const responses=await Promise.all([1,2].map(()=>request(app).post('/api/v1/orders').set('Cookie',cookie).set('x-csrf-token',csrf.body.data.csrfToken).set('Authorization',`Bearer ${client.token}`).send(payload)));
    expect(responses.every(response=>[200,201].includes(response.status))).toBe(true);
    expect(new Set(responses.map(response=>response.body.data.id)).size).toBe(1);
    expect(await Order.countDocuments()).toBe(1);expect((await Product.findById(product._id)).stock).toBe(9);
  });
  it('enforces a global coupon limit under concurrent purchases',async()=>{
    const first=customer(),second=customer(1);await add(first);await add(second);
    const coupon=await Coupon.create({code:'ONCE',discountType:'fixed',discountValue:1,validTo:new Date(Date.now()+86400000),usageLimit:1});
    await Cart.updateMany({},{$set:{coupon:coupon._id}});
    const responses=await Promise.all([checkout(first,'coupon-first-buyer'),checkout(second,'coupon-second-buyer')]);
    expect(responses.filter(response=>response.status===201)).toHaveLength(1);
    expect(await Order.countDocuments()).toBe(1);expect((await Coupon.findById(coupon._id)).timesUsed).toBe(1);
    expect((await Product.findById(product._id)).stock).toBe(9);
  });
  it('never allows a customer to change their role or deactivate the last admin',async()=>{
    const client=customer(),admin=customer(2);
    expect((await write(client,'patch','/users/profile',{name:'Customer Name',role:'admin',isEmailVerified:true})).status).toBe(200);
    expect((await User.findById(users[0]._id)).role).toBe('user');
    expect((await write(admin,'delete','/users/delete-account')).status).toBe(409);
    expect((await write(admin,'patch',`/admin/users/${users[2]._id}`,{role:'user'})).status).toBe(409);
  });
  it('prevents two administrators from concurrently removing one another',async()=>{
    await User.updateOne({_id:users[0]._id},{$set:{role:'admin'}});
    const first=customer(),second=customer(2);
    const responses=await Promise.all([write(first,'patch',`/admin/users/${users[2]._id}`,{role:'user'}),write(second,'patch',`/admin/users/${users[0]._id}`,{role:'user'})]);
    expect(responses.filter(response=>response.status===200)).toHaveLength(1);
    expect(await User.countDocuments({role:'admin',active:true})).toBe(1);
  });
  it('persists product edits and recomputes prices instead of trusting caller totals',async()=>{
    const admin=customer(2);
    const response=await write(admin,'patch',`/admin/products/${product._id}`,{originalPrice:100,discountPercentage:25,finalPrice:0});
    expect(response.status).toBe(200);expect(response.body.data.final_price).toBe(75);
    expect((await request(app).get(`/api/v1/products/${product._id}`)).body.data.finalPrice).toBe(75);
    expect((await write(admin,'delete',`/admin/products/${product._id}`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/products/${product._id}`)).status).toBe(404);
  });
  it('creates, edits and hides reviews without exposing customer identities publicly',async()=>{
    const client=customer(),other=customer(1);
    const created=await write(client,'post',`/products/${product._id}/reviews`,{rating:4,title:'Useful upgrade',comment:'Works as expected.'});
    expect(created.status).toBe(201);const id=created.body.data.id;
    const publicReviews=await request(app).get(`/api/v1/products/${product._id}/reviews`);
    expect(publicReviews.body.data[0]).toMatchObject({rating:4,user:null});
    expect(JSON.stringify(publicReviews.body)).not.toContain('first@example.test');
    expect((await write(other,'patch',`/reviews/${id}`,{rating:1})).status).toBe(404);
    expect((await write(client,'patch',`/reviews/${id}`,{rating:5})).status).toBe(200);
    expect((await write(client,'delete',`/reviews/${id}`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/products/${product._id}/reviews`)).body.data).toHaveLength(0);
  });
  it('creates one Stripe session and settles only a signed matching webhook',async()=>{
    process.env.STRIPE_SECRET_KEY='sk_test_isolated';process.env.STRIPE_WEBHOOK_SECRET='whsec_isolated';
    const stripe=getStripe();let session;
    const create=vi.spyOn(stripe.checkout.sessions,'create').mockImplementation(async params=>{
      session={id:'cs_test_isolated',mode:'payment',metadata:params.metadata,currency:'usd',amount_total:params.line_items[0].price_data.unit_amount,status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/test',payment_intent:'pi_test_isolated'};return session;
    });
    const retrieve=vi.spyOn(stripe.checkout.sessions,'retrieve').mockImplementation(async()=>session);
    try{
      const client=customer();await add(client);
      const result=await write(client,'post','/orders',{shippingAddress:address,paymentMethod:'stripe',idempotencyKey:'stripe-checkout-test'});
      expect(result.status).toBe(201);const id=result.body.data.id;
      expect((await write(client,'post','/payment/create-stripe-session',{orderId:id})).status).toBe(200);
      expect((await write(client,'post','/payment/create-stripe-session',{orderId:id})).status).toBe(200);expect(create).toHaveBeenCalledTimes(1);
      expect((await Order.findById(id)).isPaid).toBe(false);
      const wrong=await request(app).post('/api/v1/payment/webhook').set('Content-Type','application/json').set('stripe-signature','invalid').send('{}');expect(wrong.status).toBe(400);
      session={...session,status:'complete',payment_status:'paid'};
      const payload=JSON.stringify({id:'evt_isolated',type:'checkout.session.completed',data:{object:session}});
      const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
      for(let i=0;i<2;i++)expect((await request(app).post('/api/v1/payment/webhook').set('Content-Type','application/json').set('stripe-signature',signature).send(payload)).status).toBe(200);
      expect((await Order.findById(id)).isPaid).toBe(true);expect((await Product.findById(product._id)).salesCount).toBe(1);
    }finally{create.mockRestore();retrieve.mockRestore();process.env.STRIPE_SECRET_KEY='';process.env.STRIPE_WEBHOOK_SECRET='';}
  });
  it('keeps older embedded addresses stable across reads and saved-address checkout',async()=>{
    await User.collection.updateOne({_id:users[0]._id},{$set:{addresses:[{...address,label:'Home',isDefault:true}]}});
    const client=customer();
    const read=()=>client.agent.get('/api/v1/users/addresses').set('Authorization',`Bearer ${client.token}`);
    const first=await read(),second=await read();expect(first.body.data[0].id).toBe(second.body.data[0].id);
    await add(client);
    const order=await write(client,'post','/orders',{shippingAddressId:first.body.data[0].id,paymentMethod:'cod',idempotencyKey:'legacy-address-checkout'});
    expect(order.status).toBe(201);expect(order.body.data.address.address).toBe(address.address);
    expect((await write(client,'patch',`/users/addresses/${first.body.data[0].id}`,{city:'Lahore'})).status).toBe(200);
    expect((await read()).body.data[0].id).toBe(first.body.data[0].id);
  });
  it('does not expose unknown legacy payment data in identity or admin responses',async()=>{
    await User.collection.updateOne({_id:users[0]._id},{$set:{paymentMethods:[{cardNumber:'4242424242424242',cvv:'123'}],legacySecret:'legacy-secret'}});
    const client=customer(),admin=customer(2);
    const me=await client.agent.get('/api/v1/users/me').set('Authorization',`Bearer ${client.token}`);
    const listed=await admin.agent.get('/api/v1/admin/users').set('Authorization',`Bearer ${admin.token}`);
    for(const response of [me,listed]){expect(response.status).toBe(200);expect(JSON.stringify(response.body)).not.toContain('4242424242424242');expect(JSON.stringify(response.body)).not.toContain('legacy-secret');}
  });
  it('allows only one concurrent refresh to consume a refresh token',async()=>{
    const client=customer();const login=await write(client,'post','/auth/login',{email:users[0].email,password});expect(login.status).toBe(200);
    const cookies=login.headers['set-cookie'].map(value=>value.split(';')[0]);
    const csrf=await request(app).get('/api/v1/auth/csrf-token').set('Cookie',cookies);
    const refresh=()=>request(app).post('/api/v1/auth/refresh').set('Cookie',cookies).set('x-csrf-token',csrf.body.data.csrfToken).send({});
    const responses=await Promise.all([refresh(),refresh()]);expect(responses.map(response=>response.status).sort()).toEqual([200,401]);
    expect((await refresh()).status).toBe(401);
    const refreshCookie=cookies.find(value=>value.startsWith('refresh_token='));
    expect(()=>verifyJWT(decodeURIComponent(refreshCookie.slice('refresh_token='.length)))).toThrow();
  });
  it('uses one-time reset links and revokes old access after a password change',async()=>{
    const account=await User.create({name:'Recovery Customer',email:'recovery@example.test',password,isEmailVerified:true});
    const client={agent:request.agent(app),token:signToken(String(account._id),'user','15m')};
    expect((await write(client,'post','/auth/forgot-password',{email:account.email})).status).toBe(200);
    const token=emails.at(-1).url.split('/').at(-1),nextPassword='ReplacementPassword123!';
    const reset=await write(client,'post',`/auth/reset-password/${token}`,{password:nextPassword,passwordConfirm:nextPassword});expect(reset.status).toBe(200);
    expect((await write(client,'post',`/auth/reset-password/${token}`,{password:nextPassword,passwordConfirm:nextPassword})).status).toBe(400);
    expect((await client.agent.get('/api/v1/users/me').set('Authorization',`Bearer ${client.token}`)).status).toBe(401);
    expect((await write(client,'post','/auth/login',{email:account.email,password:nextPassword})).status).toBe(200);
  });
  it('retries durable order confirmations after a transport failure',async()=>{
    const client=customer();await add(client);const created=await checkout(client);expect(created.status).toBe(201);
    Email.prototype.send.mockRejectedValueOnce(new Error('Temporary SMTP failure'));
    await processOrderEmails();let job=await OrderEmail.findOne();expect(job.state).toBe('pending');expect(job.attempts).toBe(1);
    await OrderEmail.updateOne({_id:job._id},{$set:{availableAt:new Date(Date.now()-1000)}});
    await processOrderEmails();job=await OrderEmail.findById(job._id);expect(job.state).toBe('sent');expect(job.attempts).toBe(2);
    await processOrderEmails();expect((await OrderEmail.findById(job._id)).attempts).toBe(2);
  });
});
