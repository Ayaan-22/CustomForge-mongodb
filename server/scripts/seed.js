import mongoose from 'mongoose';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import {demoProducts} from './data/demo-catalog.js';

export async function localCredentials(){
  const file=new URL('../../.local/demo-access.json',import.meta.url);
  try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const credentials={adminEmail:'admin@customforge.local',adminPassword:`Forge-${randomBytes(12).toString('base64url')}!`,customerEmail:'customer@customforge.local',customerPassword:`Forge-${randomBytes(12).toString('base64url')}!`};
  await mkdir(new URL('../../.local/',import.meta.url),{recursive:true});await writeFile(file,JSON.stringify(credentials,null,2)+'\n',{flag:'wx',mode:0o600});return credentials;
}
export async function seedLocal(uri){
  const target=new URL(uri);
  if(target.protocol!=='mongodb:'||!['127.0.0.1','localhost'].includes(target.hostname)||target.pathname!=='/customforge_local')throw new Error('Demo seeding is restricted to the local customforge_local database');
  const credentials=await localCredentials();
  await connectDB(uri);
  await Promise.all([Product.init(),User.init()]);
  let added=0;
  for(const row of demoProducts){
    if(await Product.exists({sku:row.sku}))continue;
    await Product.create({name:row.name,category:row.category,brand:row.brand,sku:row.sku,description:row.description,
      originalPrice:row.original_price,discountPercentage:row.discount_percentage,stock:row.stock,
      images:row.images,features:row.features,warranty:row.warranty,isActive:row.is_active,isFeatured:row.is_featured,
      specifications:Object.entries(row.specifications||{}).map(([key,value])=>({key:key.replaceAll('_',' '),value:String(value)}))});added++;
  }
  for(const [email,password,role,name]of[[credentials.adminEmail,credentials.adminPassword,'admin','Local Store Admin'],[credentials.customerEmail,credentials.customerPassword,'user','Local Customer']]){
    if(!await User.exists({email}))await User.create({name,email,password,role,isEmailVerified:true});
  }
  await mongoose.disconnect();return {added,credentials};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(!process.argv.includes('--local'))throw new Error('Use npm run seed:local; the configured Atlas database is never seeded implicitly');
  const result=await seedLocal('mongodb://127.0.0.1:27127/customforge_local?replicaSet=customforge-local');
  console.log(`Added ${result.added} demo products. Local credentials are in .local/demo-access.json.`);
}
