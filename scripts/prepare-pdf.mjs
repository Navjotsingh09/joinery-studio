import {cpSync,mkdirSync} from 'node:fs';
mkdirSync('public/pdf-assets',{recursive:true});
cpSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/pdf-assets/pdf.worker.min.mjs');
for(const folder of ['cmaps','standard_fonts'])cpSync(`node_modules/pdfjs-dist/${folder}`,`public/pdf-assets/${folder}`,{recursive:true});

mkdirSync('public/cad-assets/dist',{recursive:true});
cpSync('node_modules/@mlightcad/libredwg-web/dist/libredwg-web.js','public/cad-assets/dist/libredwg-web.js');
cpSync('node_modules/@mlightcad/libredwg-web/wasm','public/cad-assets/wasm',{recursive:true});
