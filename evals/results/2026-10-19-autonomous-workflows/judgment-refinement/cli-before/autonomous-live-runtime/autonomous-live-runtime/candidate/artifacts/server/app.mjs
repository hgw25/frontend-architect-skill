import * as platform from './platform.mjs';
import {readFile} from 'node:fs/promises';

const PRODUCT_SKU='sku1';
const SUPPORTED_LOCALES=new Set(['en-US','fr-FR']);

function wantsJson(req){
 return String(req.headers.accept||'').includes('application/json');
}

function localeFor(url){
 const locale=url.searchParams.get('lang');
 return SUPPORTED_LOCALES.has(locale)?locale:'en-US';
}

function cacheKey(session,sku){
 return [session.tenantId,session.userId,sku].join(':');
}

function formatPrice(quote,locale){
 return new Intl.NumberFormat(locale,{style:'currency',currency:quote.currency}).format(quote.price);
}

function toPublicQuote(quote,locale){
 return {
  name:String(quote.name),
  price:formatPrice(quote,locale),
  description:String(quote.description),
 };
}

function page({services,quote,locale,canPurchase,status='',statusKind='success'}){
 const product=toPublicQuote(quote,locale);
 const escape=services.escapeHtml;
 const action='/api/buy?lang='+encodeURIComponent(locale);
 const disabled=canPurchase?'':' disabled aria-disabled="true"';
 const message=status?`<p role="status" data-kind="${statusKind}">${escape(status)}</p>`:'<p role="status" aria-live="polite"></p>';
 return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(product.name)}</title><main><h1>${escape(product.name)}</h1><p data-testid="price">${escape(product.price)}</p><section aria-label="Description">${services.descriptionHtml(product.description)}</section><form method="post" action="${action}"><input type="hidden" name="sku" value="${PRODUCT_SKU}"><button${disabled}>Buy</button></form>${message}<script type="module" src="/src/app.mjs"></script></main></html>`;
}

function sendJson(res,status,body){
 res.writeHead(status,{'content-type':'application/json'}).end(JSON.stringify(body));
}

function sendFailure(res,req,status,message){
 if(wantsJson(req)) return sendJson(res,status,{ok:false,message});
 res.writeHead(status,{'content-type':'text/html; charset=utf-8'}).end(`<!doctype html><main><p role="status">${message}</p></main>`);
}

export function createApp(services=platform){
 const quotes=new Map();
 async function loadQuote(sku,session){
  const key=cacheKey(session,sku);
  const cached=quotes.get(key);
  if(cached&&cached.validUntil>services.now()) return cached;
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
  if(!session) return sendFailure(res,req,401,'Login required');
  if(url.pathname==='/api/buy'&&req.method==='POST'){
   if(!services.canBuy(session)) return sendFailure(res,req,403,'Purchase is not available for this account');
   try{
    await services.purchase(PRODUCT_SKU,session);
    quotes.delete(cacheKey(session,PRODUCT_SKU));
    if(wantsJson(req)) return sendJson(res,200,{ok:true,message:'Purchase accepted'});
    const quote=await loadQuote(PRODUCT_SKU,session);
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(page({services,quote,locale:localeFor(url),canPurchase:true,status:'Purchase accepted'}));
   }catch{
    sendFailure(res,req,502,'Purchase failed. Please try again.');
   }
   return;
  }
  if(url.pathname!=='/products/'+PRODUCT_SKU||req.method!=='GET') return sendFailure(res,req,404,'Not found');
  try{
   const locale=localeFor(url);
   const quote=await loadQuote(PRODUCT_SKU,session);
   res.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(page({services,quote,locale,canPurchase:services.canBuy(session)}));
  }catch{
   sendFailure(res,req,502,'Quote unavailable. Please try again.');
  }
 };
}
