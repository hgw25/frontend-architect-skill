import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=process.cwd();
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  const name=decodeURIComponent(url.pathname)==='/'?'/index.html':decodeURIComponent(url.pathname);
  const file=resolve(root,'.'+name);
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404).end('Not found');}
});
server.listen(Number(process.argv[2]),'127.0.0.1');
