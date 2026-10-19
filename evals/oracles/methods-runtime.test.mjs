import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createApp} from '../server/app.mjs';
import * as platform from '../server/platform.mjs';

async function nativePurchase(quoteFails) {
 let commits=0;
 const handler=createApp({
  ...platform,
  purchase:async()=>{commits++;return {id:'confirmed-purchase'};},
  getQuote:async()=>{
   if(quoteFails)throw Error('private-refresh-failure');
   return {sku:'sku1',name:'Steel mug',price:12.5,currency:'USD',description:'<p>Steel</p>',validUntil:platform.now()+1000};
  },
 });
 const server=http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(()=>res.writeHead(500).end('Unhandled error')));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/buy',{method:'POST',headers:{cookie:'session=a',accept:'text/html'}});
  return {commits,status:response.status,body:await response.text()};
 }finally{await new Promise(resolve=>server.close(resolve));}
}

test('native purchase exposes the confirmed result when quote refresh succeeds',async()=>{
 const result=await nativePurchase(false);
 assert.equal(result.commits,1);assert.match(result.body,/Purchase accepted/i);
});
test('a later quote failure cannot hide an already confirmed native purchase',async()=>{
 const result=await nativePurchase(true);
 assert.equal(result.commits,1);
 assert.match(result.body,/Purchase accepted/i,'The receipt must survive a secondary quote read failure');
 assert.doesNotMatch(result.body,/private-refresh-failure/);
});
