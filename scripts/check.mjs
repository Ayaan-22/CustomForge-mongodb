import {spawn} from 'node:child_process';
const command=process.argv[2];
if(!['test','build','typecheck'].includes(command))throw new Error('Unknown check');
const packages=command==='test'?['server','Client/my-app','Admin/customforge-admin']:['Client/my-app','Admin/customforge-admin'];
for(const directory of packages){
  const child=spawn(process.execPath,[process.env.npm_execpath,'--prefix',directory,'run',command,...(command==='test'?['--','--maxWorkers=2']:[])],{stdio:'inherit'});
  const code=await new Promise(resolve=>child.once('exit',resolve));
  if(code!==0)process.exit(code||1);
}
