import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import cloudinary from './cloudinary.js';
import AppError from './appError.js';

export async function uploadImages(files=[]){
  const images=[];
  for(const file of files){
    const buffer=file.buffer;
    const extension=buffer.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP'?'webp':null;
    if(!extension)throw new AppError('Upload a valid JPEG, PNG or WebP image',400);
    if(process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET){
      const result=await new Promise((resolve,reject)=>{
        const stream=cloudinary.uploader.upload_stream({folder:'customforge/products',resource_type:'image'},(error,result)=>error?reject(error):resolve(result));stream.end(buffer);
      });images.push(result.secure_url);
    }else{
      if(process.env.NODE_ENV==='production')throw new AppError('Configure Cloudinary to enable production image uploads',503);
      const directory=fileURLToPath(new URL('../public/uploads/',import.meta.url));await mkdir(directory,{recursive:true});
      const filename=`${randomUUID()}.${extension}`;await writeFile(`${directory}${filename}`,buffer,{flag:'wx'});images.push(`/api/v1/media/${filename}`);
    }
  }
  return images;
}
