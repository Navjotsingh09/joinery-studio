import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {installNodeGraphics} from './render/node-graphics';
import {CapturedScene,hydrateCapturedScene} from './render/captured-scene';
import {exportRenderPackage} from '../lib/sceneExport';
const [capture,output,quality='preview']=process.argv.slice(2);if(!capture||!output)throw new Error('Expected captured scene JSON, output ZIP and preview/customer quality.');
installNodeGraphics();const data=JSON.parse(readFileSync(capture,'utf8')) as CapturedScene;const {model,camera}=await hydrateCapturedScene(data,resolve('public'));
const bytes=await exportRenderPackage({project:data.project,model,camera,aspect:camera.aspect,quality:quality==='customer'?'customer':'preview',readAsset:async path=>new Uint8Array(readFileSync(resolve('public','.'+path)))});
mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,bytes);console.log(`Exported actual scene, camera and embedded textures: ${bytes.length} bytes.`);
