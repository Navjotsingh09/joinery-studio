import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import {unzipSync} from 'fflate';
const args=process.argv.slice(2),get=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1]};
const quality=get('--quality','draft');if(!['draft','customer'].includes(quality))throw new Error('Choose --quality draft or customer.');
const folder=mkdtempSync(join(tmpdir(),'joinery-render-')),capture=join(folder,'scene.json'),zip=join(folder,'render.zip'),output=resolve(get('--output','customer-render.png')),env={...process.env,NODE_ENV:'test',JOINERY_CAPTURE:capture};
if(get('--design'))env.JOINERY_DESIGN=resolve(get('--design'));
env.JOINERY_PROJECT_INDEX=get('--project-index','0');
function run(command,argv,options={}){const r=spawnSync(command,argv,{stdio:'inherit',...options});if(r.error)throw new Error('Could not start '+command+'. Install Blender 4.x or pass --blender /path/to/blender.',{cause:r.error});if(r.status!==0)process.exit(r.status??1)}
run(process.execPath,['node_modules/vite-node/vite-node.mjs','--config','vitest.config.ts','scripts/capture-scene.tsx'],{env});
run(process.execPath,['node_modules/vite-node/vite-node.mjs','--config','vitest.config.ts','scripts/export-captured.ts',capture,zip,quality==='customer'?'customer':'preview'],{env});
for(const [name,bytes] of Object.entries(unzipSync(readFileSync(zip)))){if(basename(name)!==name)throw new Error('Unexpected render package path.');writeFileSync(join(folder,name),bytes)}
mkdirSync(dirname(output),{recursive:true});const packagePath=join(dirname(output),basename(output).replace(/\.[^.]+$/,'')+'-render.zip');writeFileSync(packagePath,readFileSync(zip));
run(get('--blender',process.env.JOINERY_BLENDER??'blender'),['--background','--threads',get('--threads','0'),'--disable-autoexec','--python',join(folder,'render.py'),'--',join(folder,'scene.glb'),join(folder,'settings.json'),output]);
rmSync(folder,{recursive:true,force:true});console.log('Rendered '+output+'; reusable package '+packagePath);
