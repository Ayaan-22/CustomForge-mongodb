import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Product from '../models/Product.js';
import AppError from '../utils/appError.js';
import {publicUser} from '../utils/publicUser.js';
import {entity,requireId} from '../utils/serialize.js';
import {addressSchema,updateAddressSchema} from '../validation/addressSchemas.js';
import {ensureAddressIds} from '../utils/addressIds.js';

export const getMe=asyncHandler(async(req,res)=>res.json({success:true,data:req.user?publicUser(entity(req.user)):null}));
export const updateMe=asyncHandler(async(req,res)=>{
  const updates={};
  for(const key of ['name','avatar','phone','address'])if(req.body[key]!==undefined){
    if(typeof req.body[key]!=='string'||req.body[key].length>500)throw new AppError('Invalid profile field',400);
    updates[key]=req.body[key].trim();
  }
  const row=await User.findByIdAndUpdate(req.user.id,{$set:updates},{new:true,runValidators:true}).lean();
  res.json({success:true,data:publicUser(entity(row))});
});
export const deleteMe=asyncHandler(async(req,res)=>{
  if(req.user.role==='admin')throw new AppError('Administrator accounts must be managed by another administrator',409);
  await User.updateOne({_id:req.user.id},{$set:{active:false,refreshTokenHash:null,refreshTokenExpires:null}});
  res.clearCookie('refresh_token',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production'});
  res.clearCookie('csrf_token');res.json({success:true,message:'Account deactivated'});
});
export const getWishlist=asyncHandler(async(req,res)=>{
  const user=await User.findById(req.user.id).select('wishlist').lean();
  const products=await Product.find({_id:{$in:user.wishlist},isActive:true}).select('_id').lean();
  res.json({success:true,data:products.map(product=>({id:String(product._id),productId:String(product._id)}))});
});
export const addToWishlist=asyncHandler(async(req,res)=>{
  const id=requireId(req.params.productId);
  if(!await Product.exists({_id:id,isActive:true}))throw new AppError('Product not found',404);
  await User.updateOne({_id:req.user.id},{$addToSet:{wishlist:id}});
  res.json({success:true,message:'Product saved'});
});
export const removeFromWishlist=asyncHandler(async(req,res)=>{
  await User.updateOne({_id:req.user.id},{$pull:{wishlist:requireId(req.params.productId)}});
  res.json({success:true,message:'Product removed from saved items'});
});
const addressDTO=(row,userId)=>({...entity(row),userId,line1:row.address,line2:''});
export const getAddresses=asyncHandler(async(req,res)=>{
  const user=ensureAddressIds(await User.findById(req.user.id).select('addresses'));
  res.json({success:true,data:user.addresses.map(row=>addressDTO(row,req.user.id)).sort((a,b)=>Number(b.isDefault)-Number(a.isDefault))});
});
export const addAddress=asyncHandler(async(req,res)=>{
  const parsed=addressSchema.safeParse(req.body);if(!parsed.success)throw new AppError('Please provide a complete shipping address',400);
  const user=ensureAddressIds(await User.findById(req.user.id));
  if(user.addresses.length>=20)throw new AppError('A maximum of 20 addresses can be saved',400);
  const data=parsed.data;
  if(!user.addresses.length)data.isDefault=true;
  if(data.isDefault)for(const row of user.addresses)row.isDefault=false;
  user.addresses.push(data);await user.save();
  res.status(201).json({success:true,data:{address:addressDTO(user.addresses.at(-1),req.user.id)}});
});
export const updateAddress=asyncHandler(async(req,res)=>{
  const parsed=updateAddressSchema.safeParse(req.body);if(!parsed.success)throw new AppError('Invalid address',400);
  const user=ensureAddressIds(await User.findById(req.user.id)),address=user.addresses.id(requireId(req.params.id));
  if(!address)throw new AppError('Address not found',404);
  if(parsed.data.isDefault)for(const row of user.addresses)row.isDefault=false;
  Object.assign(address,parsed.data);await user.save();res.json({success:true,data:{address:addressDTO(address,req.user.id)}});
});
export const setDefaultAddress=asyncHandler(async(req,res)=>{
  const user=ensureAddressIds(await User.findById(req.user.id)),address=user.addresses.id(requireId(req.params.id));
  if(!address)throw new AppError('Address not found',404);
  for(const row of user.addresses)row.isDefault=String(row._id)===String(address._id);
  await user.save();res.json({success:true,data:{address:addressDTO(address,req.user.id)}});
});
export const deleteAddress=asyncHandler(async(req,res)=>{
  const user=ensureAddressIds(await User.findById(req.user.id)),address=user.addresses.id(requireId(req.params.id));
  if(!address)throw new AppError('Address not found',404);
  const wasDefault=address.isDefault;address.deleteOne();
  if(wasDefault&&user.addresses.length)user.addresses[0].isDefault=true;
  await user.save();res.json({success:true,message:'Address deleted'});
});
export const getPaymentMethods=asyncHandler(async(req,res)=>res.json({success:true,data:[]}));
export const unavailablePaymentMethod=(req,res,next)=>next(new AppError('Saved-card enrollment is unavailable. Use secure Stripe Checkout or cash on delivery.',503));
