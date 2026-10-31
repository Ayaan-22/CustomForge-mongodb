import mongoose from 'mongoose';
import User from '../models/User.js';

mongoose.set('strictQuery', true);
mongoose.set('bufferTimeoutMS', 10000);
export const getUserRepository = () => User;
export default async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI must be configured');
  await mongoose.connect(uri, {serverSelectionTimeoutMS:10000, maxPoolSize:20});
  const hello = await mongoose.connection.db.admin().command({hello:1});
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error('MongoDB must run as a replica set or sharded cluster for atomic checkout. See README.md.');
  }
  return mongoose.connection;
}
