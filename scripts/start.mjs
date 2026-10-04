import {cpSync,existsSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const standalone=resolve('.next/standalone');
const entry=resolve(standalone,'server.js');
if(!existsSync(entry))throw new Error('Production build missing. Run npm run build before npm start.');
// Next standalone output excludes assets; include them for a normal Node host.
if(existsSync('public'))cpSync('public',resolve(standalone,'public'),{recursive:true});
mkdirSync(resolve(standalone,'.next'),{recursive:true});
cpSync('.next/static',resolve(standalone,'.next/static'),{recursive:true});
const child=spawn(process.execPath,[entry],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
