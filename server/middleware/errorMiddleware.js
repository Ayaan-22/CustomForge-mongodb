import AppError from '../utils/appError.js';
import {logger} from './logger.js';
export function errorHandler(error,req,res,next){
  if(res.headersSent)return next(error);
  let safe=error;
  if(error.code===11000)safe=new AppError('This value is already in use',409);
  if(error.name==='ValidationError')safe=new AppError(Object.values(error.errors).map(item=>item.message).join('; '),400);
  if(error.name==='CastError')safe=new AppError('Invalid resource ID',400);
  if(error.name==='VersionError')safe=new AppError('This record changed. Refresh and try again.',409);
  if(error.type==='entity.parse.failed')safe=new AppError('Invalid JSON body',400);
  if(error.type==='entity.too.large'||error.code==='LIMIT_FILE_SIZE')safe=new AppError('Upload or request is too large',413);
  logger.error('Request failed',{requestId:req.requestId,status:safe.statusCode||500,message:safe.message});
  res.status(safe.statusCode||500).json({success:false,status:'error',message:safe.isOperational?safe.message:'The service is unavailable. Please try again.',
    ...(safe.code?{code:safe.code}:{}),requestId:req.requestId});
}
