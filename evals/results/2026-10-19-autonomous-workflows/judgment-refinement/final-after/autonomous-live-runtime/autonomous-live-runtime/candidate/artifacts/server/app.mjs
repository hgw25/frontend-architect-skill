import * as platform from './platform.mjs';
import {readFile} from 'node:fs/promises';

const productSku='sku1';

function quoteCacheKey(session,sku){
 return `${session.tenantId}:${session.userId}:${sku}`;
}

function requestLocale(url){
 return url.searchParams.get('lang')==='fr-FR'?'fr-FR':'en-US';
}

function formatPrice(quote,locale){
 return new Intl.NumberFormat(locale,{style:'currency',currency:quote.currency}).format(quote.price);
}

function wantsJson(req){
 return String(req.headers.accept||'').includes('application/json');
}

function sendHtml(res,status,html){
 res.writeHead(status,{'content-type':'text/html; charset=utf-8'}).end(html);
}

function sendJson(res,status,payload){
 res.writeHead(status,{'content-type':'application/json; charset=utf-8'}).end(JSON.stringify(payload));
}

function renderFailure(message){
 return `<!doctype html><html lang="en"><main><p role="status">${message}</p></main></html>`;
}

function renderProductPage(services,quote,session,locale,status=''){
 const purchaseDisabled=!services.canBuy(session);
 const purchaseControl=purchaseDisabled
  ? '<button type="submit" disabled aria-describedby="purchase-help">Buy</button><p id="purchase-help">You do not have permission to buy this product.</p>'
  : '<button type="submit">Buy</button>';
 const statusMessage=status?`<p role="status" aria-live="polite">${status}</p>`:'<p role="status" aria-live="polite"></p>';
 return `<!doctype html><html lang="${locale}"><main><h1>${services.escapeHtml(quote.name)}</h1><p data-testid="price">${services.escapeHtml(formatPrice(quote,locale))}</p><section aria-label="Description">${services.descriptionHtml(quote.description)}</section><form method="post" action="/api/buy?lang=${locale}">${purchaseControl}</form>${statusMessage}<script type="module" src="/src/app.mjs"></script></main></html>`;
}

export function createApp(services=platform){
 const quoteCache=new Map();

 async function quoteFor(session){
  const key=quoteCacheKey(session,productSku);
  const cached=quoteCache.get(key);
  if(cached?.validUntil>services.now()) return cached;
  const quote=await services.getQuote(productSku,session);
  quoteCache.set(key,quote);
  return quote;
 }

 function invalidateQuote(session){
  quoteCache.delete(quoteCacheKey(session,productSku));
 }

 return async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/src/app.mjs'){
   res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'}).end(await readFile(new URL('../src/app.mjs',import.meta.url)));
   return;
  }

  const session=services.readSession(req);
  if(!session){
   if(wantsJson(req)) sendJson(res,401,{error:'Login required'});
   else sendHtml(res,401,renderFailure('Login required'));
   return;
  }

  if(req.method==='POST'&&url.pathname==='/api/buy'){
   if(!services.canBuy(session)){
    if(wantsJson(req)) sendJson(res,403,{error:'Purchase is not permitted'});
    else sendHtml(res,403,renderFailure('Purchase is not permitted'));
    return;
   }
   try{
    await services.purchase(productSku,session);
    invalidateQuote(session);
    if(wantsJson(req)) sendJson(res,200,{ok:true});
    else sendHtml(res,200,renderProductPage(services,await quoteFor(session),session,requestLocale(url),'Purchase accepted'));
   }catch{
    if(wantsJson(req)) sendJson(res,502,{error:'Purchase failed'});
    else sendHtml(res,502,renderFailure('Purchase failed. Please try again.'));
   }
   return;
  }

  if(req.method!=='GET'||url.pathname!==`/products/${productSku}`){
   sendHtml(res,404,renderFailure('Not found'));
   return;
  }

  try{
   const locale=requestLocale(url);
   sendHtml(res,200,renderProductPage(services,await quoteFor(session),session,locale));
  }catch{
   sendHtml(res,502,renderFailure('Quote unavailable. Please try again.'));
  }
 };
}
