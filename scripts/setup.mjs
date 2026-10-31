import {spawn} from 'node:child_process';
const packages=['server','Client/my-app','Admin/customforge-admin'];
for(const directory of packages){
  const child=spawn(process.execPath,[process.env.npm_execpath,'--prefix',directory,'ci','--no-audit','--no-fund'],{stdio:'inherit',env:{...process.env,MONGOMS_DISABLE_POSTINSTALL:'1'}});
  const code=await new Promise(resolve=>child.once('exit',resolve));
  if(code!==0)process.exit(code||1);
}
