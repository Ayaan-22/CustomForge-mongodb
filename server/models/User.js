import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: {type:String, enum:['Home','Work','Other'], default:'Home'},
  fullName: {type:String, required:true, trim:true}, address: {type:String, required:true, trim:true},
  city: {type:String, required:true, trim:true}, state: {type:String, required:true, trim:true},
  postalCode: {type:String, required:true, trim:true}, country: {type:String, required:true, default:'United States'},
  phoneNumber: {type:String, required:true, trim:true}, isDefault: {type:Boolean, default:false},
});
const schema = new mongoose.Schema({
  name: {type:String, required:true, trim:true, minlength:2, maxlength:100},
  email: {type:String, required:true, trim:true, lowercase:true, unique:true},
  password: {type:String, required:true, select:false},
  role: {type:String, enum:['user','admin'], default:'user'},
  avatar: String, phone:String, address:String,
  isEmailVerified: {type:Boolean, default:false},
  emailVerificationToken: {type:String, select:false}, emailVerificationExpires: {type:Date, select:false},
  passwordResetToken: {type:String, select:false}, passwordResetExpires: {type:Date, select:false},
  passwordChangedAt: Date, twoFactorEnabled: {type:Boolean, default:false},
  twoFactorSecret: {type:String, select:false}, active: {type:Boolean, default:true},
  refreshTokenHash: {type:String, select:false}, refreshTokenExpires: {type:Date, select:false},
  stripeCustomerId: {type:String, select:false},
  wishlist: [{type:mongoose.Schema.Types.ObjectId, ref:'Product'}], addresses:[addressSchema],
}, {timestamps:true, optimisticConcurrency:true});
schema.pre('save', async function() {
  if (this.isModified('password')) {
    if (typeof this.password !== 'string' || this.password.length < 8 || this.password.length > 128) throw new Error('Password must contain 8 to 128 characters');
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = new Date();
  }
});
schema.methods.comparePassword = function(password) {return bcrypt.compare(password, this.password);};
const User = mongoose.models.User || mongoose.model('User', schema);
export default User;

const privateSelection = '+password +twoFactorSecret +emailVerificationToken +emailVerificationExpires +passwordResetToken +passwordResetExpires +refreshTokenHash +refreshTokenExpires +stripeCustomerId';
const mapUser = user => user ? {...user, id:String(user._id)} : null;
export const createUser = async (payload, users = User) => mapUser((await users.create(payload)).toObject());
export const findUserByEmail = async (email, options = {}, users = User) => {
  const user = await users.findOne({email:String(email).trim().toLowerCase()}).select(privateSelection).lean();
  if (user && !options.includePassword) delete user.password;
  return mapUser(user);
};
export const findUserById = async (id, options = {}, users = User) => {
  if (!mongoose.isObjectIdOrHexString(id)) return null;
  const user = await users.findById(id).select(privateSelection).lean();
  if (user && !options.includePassword) delete user.password;
  return mapUser(user);
};
export const updateUser = async (id, updates, users = User) => {
  const next = {...updates};
  if (next.password !== undefined) {
    if (typeof next.password !== 'string' || next.password.length < 8 || next.password.length > 128) throw new Error('Invalid password length');
    next.password = await bcrypt.hash(next.password, 12);
    next.passwordChangedAt = new Date();
    next.refreshTokenHash = null;
    next.refreshTokenExpires = null;
  }
  return mapUser(await users.findByIdAndUpdate(id, {$set:next}, {new:true,runValidators:true}).select(privateSelection).lean());
};
export const comparePassword = (candidate, hash) => Boolean(candidate && hash) ? bcrypt.compare(candidate, hash) : false;
export const hashPassword = password => bcrypt.hash(password,12);
export const rotateRefreshSession = async (id, expectedHash, nextHash, expires, users = User, passwordChangedAt) => {
  const result = await users.updateOne({_id:id, active:true, refreshTokenHash:expectedHash,
    refreshTokenExpires:{$gt:new Date()}, passwordChangedAt:passwordChangedAt || null},
  {$set:{refreshTokenHash:nextHash,refreshTokenExpires:expires}});
  return result.modifiedCount === 1;
};
export const revokeRefreshSession = async (id, expectedHash, users = User) => {
  const result = await users.updateOne({_id:id,refreshTokenHash:expectedHash},{$set:{refreshTokenHash:null,refreshTokenExpires:null}});
  return result.modifiedCount === 1;
};
export const consumeAuthToken = async (id, tokenField, expectedHash, expiresField, updates, users = User) => {
  const next={...updates,[tokenField]:null,[expiresField]:null};
  if(next.password!==undefined){
    if(typeof next.password!=='string'||next.password.length<8||next.password.length>128)throw new Error('Invalid password length');
    next.password=await bcrypt.hash(next.password,12);next.passwordChangedAt=new Date();next.refreshTokenHash=null;next.refreshTokenExpires=null;
  }
  return mapUser(await users.findOneAndUpdate({_id:id,active:true,[tokenField]:expectedHash,[expiresField]:{$gt:new Date()}},{$set:next},{new:true,runValidators:true}).select(privateSelection).lean());
};
