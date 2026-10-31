import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  order:{type:mongoose.Schema.Types.ObjectId,ref:'Order',required:true,unique:true},
  state:{type:String,enum:['pending','sending','sent'],default:'pending'},
  attempts:{type:Number,default:0},availableAt:{type:Date,default:Date.now},
  leaseUntil:Date,leaseId:String,sentAt:Date,lastError:String,
},{timestamps:true});
schema.index({state:1,availableAt:1});
export default mongoose.model('OrderEmail',schema);
