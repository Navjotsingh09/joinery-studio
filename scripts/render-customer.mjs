import {spawnSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
const args=process.argv.slice(2),get=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1]};
const capture=join(mkdtempSync(join(tmpdir(),'joinery-render-')),'scene.json'),env={...process.env,NODE_ENV:'test',JOINERY_CAPTURE:capture};
if(get('--design'))env.JOINERY_DESIGN=resolve(get('--design'));
env.JOINERY_PROJECT_INDEX=get('--project-index','0');
function run(command,argv,options={}){const r=spawnSync(command,argv,{stdio:'inherit',...options});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1)}
run(process.execPath,['node_modules/vite-node/vite-node.mjs','--config','vitest.config.ts','scripts/capture-scene.tsx'],{env});
run(get('--blender',process.env.JOINERY_BLENDER??'blender'),['--background','--threads',get('--threads','2'),'--disable-autoexec','--python',resolve('scripts/render-captured.py'),'--',capture,resolve('public'),resolve(get('--output','customer-render.png')),get('--quality','draft')]);
