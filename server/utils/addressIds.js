import {createHash} from 'node:crypto';
import mongoose from 'mongoose';

// The old schema stored addresses without _id. Supply a stable compatibility ID
// without writing during GET; an eventual address edit persists that same ID.
export function ensureAddressIds(user){
  user.addresses.forEach((address,index)=>{
    if(address.$isDefault('_id')){
      const id=createHash('sha256').update(`${user._id}:address:${index}:${address.fullName}:${address.address}`).digest('hex').slice(0,24);
      address._id=new mongoose.Types.ObjectId(id);
    }
  });return user;
}
