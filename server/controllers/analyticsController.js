import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import AppError from '../utils/appError.js';
import {productRow} from '../utils/serialize.js';

function range(query){
  const days=query.days===undefined?30:Number(query.days);
  if(!Number.isInteger(days)||days<1||days>366)throw new AppError('Days must be between 1 and 366',400);
  return {start:new Date(Date.now()-days*86400000),end:new Date()};
}
const dateGroup=(date,format='%Y-%m-%d')=>({$dateToString:{format,date,timezone:'UTC'}});
export const getDashboardOverview=asyncHandler(async(req,res)=>{
  const [users,products,lowStock,orders,paid,revenue]=await Promise.all([User.countDocuments(),Product.countDocuments(),Product.countDocuments({stock:{$gte:1,$lte:5}}),Order.countDocuments(),Order.countDocuments({isPaid:true,status:{$nin:['refunded','cancelled']}}),Order.aggregate([{$match:{isPaid:true,status:{$nin:['refunded','cancelled']}}},{$group:{_id:null,total:{$sum:'$totalPrice'}}}])]);
  res.json({success:true,data:{users:{total:users},products:{total:products,lowStock},orders:{total:orders,paid,revenue:revenue[0]?.total||0}}});
});
export const getProductStats=asyncHandler(async(req,res)=>{
  const [totalProducts,activeProducts,lowStock,outOfStock]=await Promise.all([Product.countDocuments(),Product.countDocuments({isActive:true}),Product.countDocuments({stock:{$gte:1,$lte:5}}),Product.countDocuments({stock:0})]);
  res.json({success:true,data:{totalProducts,activeProducts,lowStock,outOfStock,growth:null}});
});
export const getUserAnalytics=asyncHandler(async(req,res)=>{
  const {start}=range(req.query);
  const [totalUsers,activeUsers,verifiedUsers,newUsers,adminUsers,groups]=await Promise.all([User.countDocuments(),User.countDocuments({active:true}),User.countDocuments({isEmailVerified:true}),User.countDocuments({createdAt:{$gte:start}}),User.countDocuments({role:'admin'}),User.aggregate([{$match:{createdAt:{$gte:start}}},{$group:{_id:dateGroup('$createdAt'),count:{$sum:1}}},{$sort:{_id:1}}])]);
  res.json({success:true,data:{totalUsers,activeUsers,verifiedUsers,newUsers,adminUsers,growth:null,userGrowth:groups.map(row=>({date:row._id,count:row.count}))}});
});
export const getSalesAnalytics=asyncHandler(async(req,res)=>{
  const {start,end}=range(req.query),period=req.query.period||'daily';
  if(!['daily','weekly','monthly'].includes(period))throw new AppError('Invalid sales grouping',400);
  const match={isPaid:true,status:{$nin:['refunded','cancelled']},paidAt:{$gte:start,$lte:end}};
  const bucket={$dateTrunc:{date:'$paidAt',unit:period==='monthly'?'month':period==='weekly'?'week':'day',timezone:'UTC',...(period==='weekly'?{startOfWeek:'monday'}:{})}};
  const [summary,revenue,products,customers]=await Promise.all([
    Order.aggregate([{$match:match},{$group:{_id:null,totalRevenue:{$sum:'$totalPrice'},totalOrders:{$sum:1},avgOrderValue:{$avg:'$totalPrice'}}}]),
    Order.aggregate([{$match:match},{$group:{_id:dateGroup(bucket),orders:{$sum:1},revenue:{$sum:'$totalPrice'},avgOrderValue:{$avg:'$totalPrice'}}},{$sort:{_id:1}}]),
    Order.aggregate([{$match:match},{$unwind:'$orderItems'},{$group:{_id:'$orderItems.product',name:{$first:'$orderItems.name'},totalQuantity:{$sum:'$orderItems.quantity'},totalRevenue:{$sum:{$multiply:['$orderItems.quantity','$orderItems.priceSnapshot']}}}},{$sort:{totalRevenue:-1}},{$limit:10}]),
    Order.aggregate([{$match:{isPaid:true,status:{$nin:['refunded','cancelled']}}},{$group:{_id:'$user',firstAt:{$min:'$paidAt'},lastAt:{$max:'$paidAt'}}},{$match:{lastAt:{$gte:start,$lte:end}}}]),
  ]);
  res.json({success:true,data:{totalRevenue:summary[0]?.totalRevenue||0,totalOrders:summary[0]?.totalOrders||0,avgOrderValue:summary[0]?.avgOrderValue||0,growth:null,
    revenueData:revenue.map(row=>({date:row._id,orders:row.orders,revenue:row.revenue,avgOrderValue:row.avgOrderValue})),
    topProducts:products.map(row=>({productId:String(row._id),name:row.name,totalQuantity:row.totalQuantity,totalRevenue:row.totalRevenue})),
    customerStats:{totalCustomers:customers.length,newCustomers:customers.filter(row=>row.firstAt>=start).length,returningCustomers:customers.filter(row=>row.firstAt<start).length},period,range:{startDate:start.toISOString(),endDate:end.toISOString()}}});
});
export const getOrderAnalytics=asyncHandler(async(req,res)=>{
  const {start}=range(req.query),match={createdAt:{$gte:start}};
  const [summary,statuses,dates,recent]=await Promise.all([
    Order.aggregate([{$match:match},{$group:{_id:null,totalOrders:{$sum:1},paidOrders:{$sum:{$cond:['$isPaid',1,0]}},totalRevenue:{$sum:{$cond:[{$and:['$isPaid',{$not:[{$in:['$status',['refunded','cancelled']]}]}]},'$totalPrice',0]}}}}]),
    Order.aggregate([{$match:match},{$group:{_id:'$status',count:{$sum:1}}}]),
    Order.aggregate([{$match:match},{$group:{_id:dateGroup('$createdAt'),orders:{$sum:1},delivered:{$sum:{$cond:['$isDelivered',1,0]}}}},{$sort:{_id:1}}]),
    Order.find(match).populate('user','name').sort('-createdAt').limit(10).lean(),
  ]);
  res.json({success:true,data:{totalOrders:summary[0]?.totalOrders||0,paidOrders:summary[0]?.paidOrders||0,totalRevenue:summary[0]?.totalRevenue||0,growth:null,
    statusCounts:Object.fromEntries(statuses.map(row=>[row._id,row.count])),ordersData:dates.map(row=>({date:row._id,orders:row.orders,delivered:row.delivered})),
    recentOrders:recent.map(row=>({id:String(row._id),customer:row.user?.name||'Customer',amount:row.totalPrice,status:row.status}))}});
});
export const getInventoryAnalytics=asyncHandler(async(req,res)=>{
  const [summary,categories,low,out,top]=await Promise.all([
    Product.aggregate([{$group:{_id:null,totalStock:{$sum:'$stock'},avgStock:{$avg:'$stock'},inStock:{$sum:{$cond:[{$gt:['$stock',0]},1,0]}},lowStock:{$sum:{$cond:[{$and:[{$gt:['$stock',0]},{$lte:['$stock',5]}]},1,0]}},outOfStock:{$sum:{$cond:[{$eq:['$stock',0]},1,0]}}}}]),
    Product.aggregate([{$group:{_id:'$category',totalStock:{$sum:'$stock'},productCount:{$sum:1},avgStock:{$avg:'$stock'},lowStockCount:{$sum:{$cond:[{$and:[{$gt:['$stock',0]},{$lte:['$stock',5]}]},1,0]}}}},{$sort:{_id:1}}]),
    Product.find({stock:{$gte:1,$lte:5}}).sort('stock').limit(20).lean(),Product.find({stock:0}).limit(20).lean(),Product.find({salesCount:{$gt:0}}).sort('-salesCount').limit(10).lean(),
  ]);
  res.json({success:true,data:{stockLevels:summary[0]||{totalStock:0,avgStock:0,inStock:0,lowStock:0,outOfStock:0},categoryStock:categories.map(row=>({...row,category:row._id})),lowStockProducts:low.map(productRow),outOfStockProducts:out.map(productRow),topSellingProducts:top.map(productRow)}});
});
