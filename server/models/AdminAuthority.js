import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,revision:{type:Number,default:0}});
export default mongoose.model('AdminAuthority',schema);
