import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Game from '../models/Game.js';
import PrebuiltPc from '../models/PrebuiltPc.js';
import Order from '../models/Order.js';
import AppError from '../utils/appError.js';
import {requireId,publicProduct,entity,pagination} from '../utils/serialize.js';
import {parseCatalogFilters,matchesSpecFilters,buildCatalogFacets,FACET_CANDIDATE_LIMIT} from '../utils/catalogFacets.js';

const escapeRegex = value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function catalogQuery(filters,{includeBrands=true}={}) {
  const query={isActive:true};
  if(filters.category)query.category=filters.category;
  if(includeBrands&&filters.brands.length)query.brand={$in:filters.brands};
  if(filters.availability)query.availability=filters.availability;
  if(filters.isFeatured!==null)query.isFeatured=filters.isFeatured;
  if(filters.discounted)query.discountPercentage={$gt:0};
  for(const [field,min,max] of [['finalPrice',filters.minPrice,filters.maxPrice],['ratings.average',filters.minRating,filters.maxRating]]) {
    if(min!==null||max!==null) query[field]={...(min!==null?{$gte:min}:{}),...(max!==null?{$lte:max}:{})};
  }
  if(filters.q&&filters.q.length>=2)query.$or=['name','brand','description'].map(field=>({[field]:{$regex:escapeRegex(filters.q),$options:'i'}}));
  if(filters.features.length)query.features={$all:filters.features};
  return query;
}
const sortOptions = {price:'finalPrice','-price':'-finalPrice',price_asc:'finalPrice',price_desc:'-finalPrice',rating:'-ratings.average','-ratings.average':'-ratings.average',newest:'-createdAt',createdAt:'createdAt','-createdAt':'-createdAt',created_at:'createdAt','-created_at':'-createdAt',updated_at:'updatedAt','-updated_at':'-updatedAt',name:'name','-name':'-name',finalPrice:'finalPrice','-finalPrice':'-finalPrice',final_price:'finalPrice','-final_price':'-finalPrice',original_price:'originalPrice','-original_price':'-originalPrice',discount_percentage:'discountPercentage','-discount_percentage':'-discountPercentage'};
export const getAllProducts=asyncHandler(async(req,res)=>{
  const filters=parseCatalogFilters({...req.query,...(req.params.category?{category:req.params.category}:{})});
  const {page,limit,skip}=pagination(req.query);
  const query=catalogQuery(filters);
  if(Object.keys(filters.specs).length) {
    const count=await Product.countDocuments(query);
    if(count>FACET_CANDIDATE_LIMIT)throw new AppError('Narrow the category, search or budget before filtering specifications',422);
    const matches=(await Product.find(query).lean()).filter(row=>matchesSpecFilters(row,filters.specs)).map(row=>row._id);
    query._id={$in:matches};
  }
  const sort=sortOptions[req.query.sort||'-createdAt'];
  if(!sort)throw new AppError('Invalid catalog sorting',400);
  const [rows,total]=await Promise.all([Product.find(query).sort(sort+' _id').skip(skip).limit(limit).lean(),Product.countDocuments(query)]);
  res.json({success:true,data:rows.map(publicProduct),total,page,limit,results:rows.length});
});
export const getCatalogFacets=asyncHandler(async(req,res)=>{
  const filters=parseCatalogFilters(req.query),query=catalogQuery(filters,{includeBrands:false});
  const total=await Product.countDocuments(query);
  const available=total<=FACET_CANDIDATE_LIMIT;
  const rows=available?await Product.find(query).select('category brand specifications').lean():[];
  res.json({success:true,data:{available,candidateLimit:FACET_CANDIDATE_LIMIT,scopeTotal:total,scope:'Category, search, budget, stock, rating and deals before brand and specifications',reason:available?null:'Narrow the catalog to see complete filters',...(available?buildCatalogFacets(rows,filters.category):{brands:[],specs:[]})}});
});
export const getProduct=asyncHandler(async(req,res)=>{
  const row=await Product.findOne({_id:requireId(req.params.id),isActive:true}).lean();
  if(!row)throw new AppError('Product not found',404);
  const [game,pc,reviews]=await Promise.all([Game.findOne({product:row._id}).lean(),PrebuiltPc.findOne({product:row._id}).lean(),Review.find({product:row._id,isActive:true}).sort('-createdAt').limit(20).lean()]);
  res.json({success:true,data:{...publicProduct(row),gameDetails:entity(game),pcDetails:entity(pc),reviews:reviews.map(publicReview)}});
});
const publicReview=row=>({id:String(row._id),rating:row.rating,title:row.title,comment:row.comment,createdAt:row.createdAt,verifiedPurchase:row.verifiedPurchase,helpfulVotes:row.helpfulVotes,user:null});
export const getProductReviews=asyncHandler(async(req,res)=>{
  const {page,limit,skip}=pagination(req.query),query={product:requireId(req.params.id),isActive:true};
  const [rows,total]=await Promise.all([Review.find(query).sort('-createdAt').skip(skip).limit(limit).lean(),Review.countDocuments(query)]);
  res.json({success:true,data:rows.map(publicReview),total,page,limit});
});
export const getTopProducts=asyncHandler(async(req,res)=>res.json({success:true,data:(await Product.find({isActive:true}).sort('-ratings.average').limit(8).lean()).map(publicProduct)}));
export const getFeaturedProducts=asyncHandler(async(req,res)=>res.json({success:true,data:(await Product.find({isActive:true,isFeatured:true}).limit(12).lean()).map(publicProduct)}));
export const getCategories=asyncHandler(async(req,res)=>res.json({success:true,data:(await Product.distinct('category',{isActive:true})).sort()}));
export const getBrands=asyncHandler(async(req,res)=>res.json({success:true,data:(await Product.distinct('brand',{isActive:true})).sort()}));
export const getRelatedProducts=asyncHandler(async(req,res)=>{
  const product=await Product.findOne({_id:requireId(req.params.id),isActive:true}).lean();
  if(!product)throw new AppError('Product not found',404);
  res.json({success:true,data:(await Product.find({isActive:true,category:product.category,_id:{$ne:product._id}}).limit(8).lean()).map(publicProduct)});
});
const reviewRow=row=>({...entity(row),product_id:String(row.product),created_at:row.createdAt,updated_at:row.updatedAt,is_active:row.isActive});
export const createProductReview=asyncHandler(async(req,res)=>{
  const productId=requireId(req.params.id);
  if(!await Product.exists({_id:productId,isActive:true}))throw new AppError('Product not found',404);
  const {rating,title,comment}=req.body;
  if(!Number.isInteger(rating)||rating<1||rating>5||typeof title!=='string'||!title.trim()||typeof comment!=='string'||!comment.trim())throw new AppError('Rating, title and comment are required',400);
  const verifiedPurchase=Boolean(await Order.exists({user:req.user.id,'orderItems.product':productId,isDelivered:true}));
  const row=await Review.create({user:req.user.id,product:productId,rating,title,comment,verifiedPurchase});
  res.status(201).json({success:true,data:reviewRow(row)});
});
export const getOwnReview=asyncHandler(async(req,res)=>{
  const row=await Review.findOne({user:req.user.id,product:requireId(req.params.productId),isActive:true}).lean();
  res.json({success:true,data:row?{...publicReview(row),productId:String(row.product),isActive:row.isActive}:null});
});
export const updateReview=asyncHandler(async(req,res)=>{
  const row=await Review.findOne({_id:requireId(req.params.id),user:req.user.id,isActive:true});
  if(!row)throw new AppError('Review not found',404);
  for(const key of ['rating','title','comment'])if(req.body[key]!==undefined)row[key]=req.body[key];
  await row.save();res.json({success:true,data:reviewRow(row)});
});
export const deleteReview=asyncHandler(async(req,res)=>{
  const row=await Review.findOne({_id:requireId(req.params.id),user:req.user.id,isActive:true});
  if(!row)throw new AppError('Review not found',404);
  row.isActive=false;await row.save();res.json({success:true,data:null});
});
