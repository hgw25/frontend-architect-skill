import * as platform from './platform.mjs';import {readFile} from 'node:fs/promises';
export function createApp(s=platform){const cache=new Map();return async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/src/app.mjs'){res.setHeader('content-type','text/javascript');res.end(await readFile(new URL('../src/app.mjs',import.meta.url)));return;}
 if(!['/products/sku1','/api/buy'].includes(u.pathname)){res.writeHead(404).end('Not found');return;}
 const session=s.readSession(req);if(!session){res.writeHead(401).end('Login required');return;}
 const key=JSON.stringify([session.tenantId,session.userId,'sku1']);let message='';
 if(req.method==='POST'&&u.pathname==='/api/buy'){
  if(!s.canBuy(session)){res.writeHead(403).end('Not allowed');return;}
  await s.purchase('sku1',session);cache.delete(key);
  if(req.headers.accept?.includes('application/json')){res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true}));return;}
  message='Purchase accepted';
 }else if(req.method!=='GET'||u.pathname!=='/products/sku1'){res.writeHead(405).end();return;}
 try{
  let q=cache.get(key);if(!q||q.validUntil<=s.now()){q=await s.getQuote('sku1',session);cache.set(key,q);}
  const locale=u.searchParams.get('lang')==='fr-FR'?'fr-FR':'en-US';const amount=new Intl.NumberFormat(locale,{style:'currency',currency:q.currency}).format(q.price);
  const esc=s.escapeHtml;
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html lang="'+locale+'"><meta charset="utf-8"><main><h1>'+esc(q.name)+'</h1><p data-testid="price">'+esc(amount)+'</p><section aria-label="Description">'+s.descriptionHtml(q.description)+'</section><form method="post" action="/api/buy"><input type="hidden" name="sku" value="sku1"><button'+(s.canBuy(session)?'':' disabled')+'>Buy</button></form><p role="status">'+esc(message)+'</p><script type="module" src="/src/app.mjs"></script></main></html>');
 }catch{res.writeHead(502,{'content-type':'text/plain'}).end('Quote unavailable');}
};}
