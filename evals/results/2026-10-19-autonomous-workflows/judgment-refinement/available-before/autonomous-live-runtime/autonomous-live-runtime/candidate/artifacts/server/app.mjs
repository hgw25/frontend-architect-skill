import * as platform from './platform.mjs';
import {readFile} from 'node:fs/promises';
let cached;
export function createApp(services=platform){return async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/src/app.mjs'){res.setHeader('content-type','text/javascript');res.end(await readFile(new URL('../src/app.mjs',import.meta.url)));return;}
 const session=services.readSession(req);
 if(!session){res.writeHead(401).end('Login required');return;}
 if(req.method==='POST'){
  await services.purchase('sku1',session);res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}));return;
 }
 cached ||= await services.getQuote('sku1',session);
 res.setHeader('content-type','text/html');res.end('<!doctype html><html><main><h1>'+cached.name+'</h1><p data-testid="price">'+cached.price+'</p><section aria-label="Description">'+cached.description+'</section><form method="post" action="/api/buy"><input type="hidden" name="sku" value="sku1"><button>Buy</button></form><p role="status"></p><script>window.initial='+JSON.stringify(cached)+'</script><script type="module" src="/src/app.mjs"></script></main></html>');
};}
