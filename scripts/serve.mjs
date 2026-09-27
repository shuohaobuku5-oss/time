import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    let filename=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403).end();return;}
    if((await stat(filename)).isDirectory())filename=resolve(filename,'index.html');
    const bytes=await readFile(filename);
    res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404).end('Not found');}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${process.env.PORT||4173}`));
