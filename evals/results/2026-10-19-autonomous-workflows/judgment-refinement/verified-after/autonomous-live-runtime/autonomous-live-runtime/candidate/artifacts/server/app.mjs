import * as platform from './platform.mjs';
import {readFile} from 'node:fs/promises';

const productSku='sku1';

function quoteCacheKey(sku,session){return `${session.tenantId}:${session.userId}:${sku}`;}

function localeFrom(requestUrl){return new URL(requestUrl,'http://localhost').searchParams.get('lang')==='fr-FR'?'fr-FR':'en-US';}

function page({title,content,locale='en-US'}){return `<!doctype html><html lang="${locale}"><main><h1>${title}</h1>${content}</main></html>`;}

function formatPrice(quote,locale){return new Intl.NumberFormat(locale,{style:'currency',currency:quote.currency}).format(quote.price);}

function renderQuotePage(services,quote,locale,canBuy){
 const title=services.escapeHtml(quote.name);
 const description=services.descriptionHtml(quote.description);
 const unavailable=canBuy?'':' disabled aria-describedby="purchase-unavailable"';
 const notice=canBuy?'':'<p id="purchase-unavailable">Purchasing is not available for this account.</p>';
 return page({locale,title,content:`<p data-testid="price">${formatPrice(quote,locale)}</p><section aria-label="Description">${description}</section><form method="post" action="/api/buy"><input type="hidden" name="sku" value="${productSku}"><button${unavailable}>Buy</button></form>${notice}<p role="status" aria-live="polite"></p><script type="module" src="/src/app.mjs"></script>`});
}

function renderConfirmationPage(locale){return page({locale,title:'Purchase complete',content:'<p role="status" aria-live="polite">Purchase accepted</p><p><a href="/products/sku1">Return to product</a></p>'});}

function renderErrorPage(message,status,locale='en-US'){return {status,body:page({locale,title:'Product quote',content:`<p role="status">${message}</p>`})};}

function wantsJson(req){return String(req.headers.accept||'').includes('application/json');}

export function createApp(services=platform){
 const quotes=new Map();

 async function getCachedQuote(sku,session){
  const key=quoteCacheKey(sku,session);
  const cached=quotes.get(key);
  if(cached?.validUntil>services.now())return cached;
  const quote=await services.getQuote(sku,session);
  quotes.set(key,quote);
  return quote;
 }

 return async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/src/app.mjs'){
   res.setHeader('content-type','text/javascript');
   res.end(await readFile(new URL('../src/app.mjs',import.meta.url)));
   return;
  }

  const session=services.readSession(req);
  if(!session){res.writeHead(401).end('Login required');return;}

  if(req.method==='POST'&&url.pathname==='/api/buy'){
   if(!services.canBuy(session)){res.writeHead(403).end('Purchase not allowed');return;}
   await services.purchase(productSku,session);
   quotes.delete(quoteCacheKey(productSku,session));
   if(wantsJson(req)){
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify({ok:true}));
   }else{
    res.setHeader('content-type','text/html');
    res.end(renderConfirmationPage(localeFrom(req.url)));
   }
   return;
  }

  if(req.method!=='GET'||url.pathname!==`/products/${productSku}`){res.writeHead(404).end('Not found');return;}

  const locale=localeFrom(req.url);
  try{
   const quote=await getCachedQuote(productSku,session);
   res.setHeader('content-type','text/html');
   res.end(renderQuotePage(services,quote,locale,services.canBuy(session)));
  }catch{
   const {status,body}=renderErrorPage('Quote unavailable. Please try again.',502,locale);
   res.writeHead(status,{'content-type':'text/html'}).end(body);
  }
 };
}
