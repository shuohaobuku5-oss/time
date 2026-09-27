import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=['index.html','style.css','app.js','vendor/gsap.min.js','vendor/three.module.js','vendor/three.core.js',...['sunset','golden','blue','night','stars'].map(name=>`assets/${name}.jpg`)];
for(const file of files){
  const path=resolve(root,'dist',file);
  if(!(await stat(path)).isFile())throw new Error(`Missing deployment asset: ${file}`);
  if(file.endsWith('.js')){
    const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:await readFile(path),encoding:'utf8'});
    if(result.status!==0)throw new Error(`Invalid JavaScript in ${file}: ${result.stderr}`);
  }
  if(file.endsWith('.jpg')){
    const data=await readFile(path);
    if(data[0]!==0xff||data[1]!==0xd8)throw new Error(`Invalid JPEG: ${file}`);
  }
}
const html=await readFile(resolve(root,'dist/index.html'),'utf8');
for(const [,ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(ref.startsWith('data:')||ref==='./')continue;
  await stat(resolve(root,'dist',ref));
}
const config=JSON.parse(await readFile(resolve(root,'vercel.json'),'utf8'));
if(config.outputDirectory!=='dist')throw new Error('Vercel must serve the existing dist directory.');
console.log(`Build check passed: ${files.length} local assets, JavaScript syntax, JPEG headers, and HTML asset paths.`);
