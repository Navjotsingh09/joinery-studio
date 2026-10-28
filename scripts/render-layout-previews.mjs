// Render the actual editable starter scenes; never substitute unrelated stock images.
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,basename} from 'node:path';
import {unzipSync} from 'fflate';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const args=process.argv.slice(2),index=args.indexOf('--blender'),blender=index<0?'blender':args[index+1],output=resolve('public/showroom/layouts');
const all=['l-shape','straight','island','galley','blank'],selection=args.indexOf('--layouts'),targets=selection<0?all:args[selection+1].split(',');if(targets.some(id=>!all.includes(id)))throw new Error('Unknown preview layout');
const folder=mkdtempSync(join(tmpdir(),'joinery-layouts-')),manifest=existsSync(join(output,'manifest.json'))?JSON.parse(readFileSync(join(output,'manifest.json'),'utf8')).previews:[];mkdirSync(output,{recursive:true});
function run(command,argv,env=process.env){const r=spawnSync(command,argv,{env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error(command+' failed: '+r.status)}
try{
 for(const scenario of targets){
  const work=join(folder,scenario);mkdirSync(work);const capture=join(work,'scene.json'),zip=join(work,'render.zip'),env={...process.env,NODE_ENV:'test',JOINERY_SCENARIO:scenario,JOINERY_CAPTURE:capture};
  run(process.execPath,['node_modules/vite-node/vite-node.mjs','--config','vitest.config.ts','scripts/capture-scene.tsx'],env);
  run(process.execPath,['node_modules/vite-node/vite-node.mjs','--config','vitest.config.ts','scripts/export-captured.ts',capture,zip,'preview'],env);
  for(const [name,bytes] of Object.entries(unzipSync(readFileSync(zip)))){if(basename(name)!==name)throw new Error('Unexpected archive path');writeFileSync(join(work,name),bytes)}
  const settings=JSON.parse(readFileSync(join(work,'settings.json'),'utf8'));settings.aspect=16/9;writeFileSync(join(work,'settings.json'),JSON.stringify(settings));
  // Gallery thumbnails use the same renderer with a smaller output profile.
  let script=readFileSync(join(work,'render.py'),'utf8');const samples='scene.cycles.samples = 96 if profile == "preview" else 256',width='scene.render.resolution_x = 2048 if profile == "preview" else 4096';
  if(!script.includes(samples)||!script.includes(width))throw new Error('Update the gallery profile for the current renderer.');
  script=script.replace(samples,'scene.cycles.samples = 40').replace(width,'scene.render.resolution_x = 1280');writeFileSync(join(work,'thumbnail.py'),script);
  const png=join(work,'preview.png');run(blender,['--background','--disable-autoexec','--threads','8','--python',join(work,'thumbnail.py'),'--',join(work,'scene.glb'),join(work,'settings.json'),png]);
  const image=await loadImage(png),canvas=createCanvas(image.width,image.height);canvas.getContext('2d').drawImage(image,0,0);writeFileSync(join(output,scenario+'.jpg'),canvas.toBuffer('image/jpeg',{quality:92}));
  const data=JSON.parse(readFileSync(capture,'utf8'));const previous=manifest.findIndex(p=>p.id===scenario);if(previous>=0)manifest.splice(previous,1);manifest.push({id:scenario,title:data.project.name,width:image.width,height:image.height,items:data.project.items.length,roomMm:[data.project.roomWidth,data.project.roomHeight,data.project.roomDepth]});
  console.log('Finished starter preview: '+scenario);
 }
 writeFileSync(join(output,'manifest.json'),JSON.stringify({generator:'scripts/render-layout-previews.mjs',previews:manifest.sort((a,b)=>all.indexOf(a.id)-all.indexOf(b.id))},null,2)+'\n');
}finally{rmSync(folder,{recursive:true,force:true})}
