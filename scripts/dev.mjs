import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,readdir,access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const isolated=process.argv.includes('--isolated');
const local=isolated||process.argv.includes('--local');
if(!local&&!process.argv.includes('--configured'))throw new Error('Select --local, --isolated or --configured');
const children=[];let database,stopping=false;
async function stop(code=0){
  if(stopping)return;stopping=true;
  for(const child of children)child.kill();
  await Promise.all(children.map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,10000).unref();})));
  await database?.stop({doCleanup:false});process.exit(code);
}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try{
  const env={...process.env};
  let storePort=3000,adminPort=3001;
  if(local){
    const {MongoMemoryReplSet}=await import('../server/node_modules/mongodb-memory-server/index.js');
    let binary=env.MONGOMS_SYSTEM_BINARY;
    if(!binary&&process.platform==='win32'){
      const directory=path.join(process.env.ProgramFiles||'C:/Program Files','MongoDB/Server');
      const versions=await readdir(directory).catch(()=>[]);
      for(const version of versions.sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))){const candidate=path.join(directory,version,'bin/mongod.exe');try{await access(candidate);binary=candidate;break;}catch{}}
    }
    await mkdir(path.join(root,'.local'),{recursive:true});
    const runtime=isolated?await mkdtemp(path.join(root,'.local/verification-')):path.join(root,'.local');
    const directory=path.join(runtime,'mongodb');await mkdir(directory,{recursive:true});
    process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK='false';
    database=await MongoMemoryReplSet.create({binary:{...(binary?{systemBinary:binary}:{})},instanceOpts:[{...(isolated?{}:{port:27127}),dbPath:directory}],
      replSet:{name:'customforge-local',count:1,storageEngine:'wiredTiger',configSettings:{electionTimeoutMillis:10000,heartbeatIntervalMillis:2000}}});
    const uri=database.getUri('customforge_local');
    const {seedLocal}=await import('../server/scripts/seed.js');await seedLocal(uri,{credentialsFile:path.join(runtime,'demo-access.json')});
    const secretFile=path.join(runtime,'session-secrets.json');let secrets;
    try{secrets=JSON.parse(await readFile(secretFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;secrets={jwt:randomBytes(48).toString('hex'),csrf:randomBytes(48).toString('hex')};await writeFile(secretFile,JSON.stringify(secrets),{flag:'wx',mode:0o600});}
    storePort=isolated?3300:3200;adminPort=isolated?3301:3201;
    const apiPort=isolated?5200:5100;
    Object.assign(env,{MONGO_URI:uri,NODE_ENV:'development',PORT:String(apiPort),CLIENT_URL:`http://localhost:${storePort}`,ADMIN_URL:`http://127.0.0.1:${adminPort}`,
      API_BACKEND_URL:`http://localhost:${apiPort}`,JWT_SECRET:secrets.jwt,CSRF_SECRET:secrets.csrf,
      EMAIL_MODE:'preview',EMAIL_PREVIEW_DIR:path.join(runtime,'mailbox'),EMAIL_USERNAME:'',EMAIL_PASSWORD:'',
      STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:'',CLOUDINARY_CLOUD_NAME:'',CLOUDINARY_API_KEY:'',CLOUDINARY_API_SECRET:'',REDIS_URL:'',
      LOG_DIR:path.join(runtime,'logs'),LOG_LEVEL_CONSOLE:'warn',NEXT_TELEMETRY_DISABLED:'1'});
    console.log(`Local MongoDB is ready${isolated?' (fresh isolated verification instance)':''}. Credentials and development emails: ${runtime}`);
  }
  const launches=[['API','server',['--watch','server.js']],['Storefront','Client/my-app',['node_modules/next/dist/bin/next','dev','--port',String(storePort)]],['Admin','Admin/customforge-admin',['node_modules/next/dist/bin/next','dev','--port',String(adminPort)]]];
  for(const [name,directory,args]of launches){
    const child=spawn(process.execPath,args,{cwd:path.join(root,directory),env,stdio:'inherit'});children.push(child);
    child.once('error',error=>{console.error(`${name}: ${error.message}`);void stop(1);});
    child.once('exit',code=>{if(!stopping){console.error(`${name} exited (${code})`);void stop(code||1);}});
  }
  console.log(`Storefront: http://localhost:${storePort}\nAdmin: http://${local?'127.0.0.1':'localhost'}:${adminPort}`);
}catch(error){console.error(error.message);await stop(1);}
