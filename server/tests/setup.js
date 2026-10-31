import {existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

if(!process.env.MONGOMS_SYSTEM_BINARY&&process.platform==='win32'){
  const directory=path.join(process.env.ProgramFiles||'C:/Program Files','MongoDB/Server');
  if(existsSync(directory))for(const version of readdirSync(directory).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))){
    const binary=path.join(directory,version,'bin/mongod.exe');if(existsSync(binary)){process.env.MONGOMS_SYSTEM_BINARY=binary;break;}
  }
}
Object.assign(process.env,{
  NODE_ENV:'test',NODE_TLS_REJECT_UNAUTHORIZED:'1',JWT_SECRET:'isolated-integration-jwt-secret-never-production',
  CSRF_SECRET:'isolated-integration-csrf-secret-never-production',MONGO_URI:'mongodb://127.0.0.1:1/never-use-configured-database',
  EMAIL_USERNAME:'',EMAIL_PASSWORD:'',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:'',
  CLOUDINARY_CLOUD_NAME:'',CLOUDINARY_API_KEY:'',CLOUDINARY_API_SECRET:'',
  REDIS_URL:'',TRUST_PROXY:'false',CLIENT_URL:'http://localhost:3000',ADMIN_URL:'http://localhost:3001',
  RATE_LIMIT_ENABLED:'false',LOG_LEVEL_CONSOLE:'error',LOG_DIR:fileURLToPath(new URL('../../.local/test-logs/',import.meta.url)),
  MONGOMS_SYSTEM_BINARY_VERSION_CHECK:'false',MONGOMS_DISABLE_POSTINSTALL:'1',
});
