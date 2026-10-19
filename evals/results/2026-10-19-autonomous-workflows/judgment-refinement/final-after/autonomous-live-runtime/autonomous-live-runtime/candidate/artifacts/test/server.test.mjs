import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {createApp} from '../server/app.mjs';import * as services from '../server/platform.mjs';
async function app(run,overrides={}){services.reset();const handler=createApp({...services,...overrides});const server=http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(()=>res.writeHead(500).end('Unhandled application error')));await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;try{await run(url);}finally{await new Promise(r=>server.close(r));}}
const options=id=>({headers:{cookie:'session='+id}});
const price=html=>Number(html.match(/<([a-z][\w-]*)\b[^>]*data-testid=["']price["'][^>]*>([\s\S]*?)<\/\1>/i)?.[2].replace(/<[^>]*>/g,'').replace(/[^\d.]/g,''));
test('identity and expiry scope quote cache',()=>app(async url=>{
 assert.equal((await fetch(url+'/products/sku1')).status,401);
 const a=await(await fetch(url+'/products/sku1',options('a'))).text();assert.equal(price(a),12.5);
 const b=await(await fetch(url+'/products/sku1',options('b'))).text();assert.equal(price(b),27);
 await fetch(url+'/products/sku1?user=user-b',options('a'));assert.equal(services.quoteCalls('user-a'),1);assert.equal(services.quoteCalls('user-b'),1);
 services.advance(1001);await fetch(url+'/products/sku1',options('a'));assert.equal(services.quoteCalls('user-a'),2);
}));
test('server permission and mutation invalidation do not depend on browser fields',()=>app(async url=>{
 await fetch(url+'/products/sku1',options('a'));await fetch(url+'/products/sku1',options('b'));
 const post=id=>fetch(url+'/api/buy',{method:'POST',headers:{cookie:'session='+id,accept:'application/json','content-type':'application/x-www-form-urlencoded'},body:'sku=sku1&allowed=yes'});
 assert.equal((await post('v')).status,403);assert.equal((await post('none')).status,401);
 assert.equal((await post('a')).status,200);
 assert.equal(price(await(await fetch(url+'/products/sku1',options('a'))).text()),13.5);
 assert.equal(price(await(await fetch(url+'/products/sku1',options('b'))).text()),27);
 assert.equal(services.quoteCalls('user-b'),1);
}));
test('only selected safe data crosses to the browser',()=>app(async url=>{
 const response=await fetch(url+'/products/sku1',options('a'));const html=await response.text();
 assert.doesNotMatch(html,/qa-service-private-token|internalCost|serviceToken/);
 assert.match(html,/<strong>Steel<\/strong>/);assert.doesNotMatch(html,/<img\s|<script>window\.__pwned/);
 const client=await(await fetch(url+'/src/app.mjs')).text();assert.doesNotMatch(client,/qa-service-private-token|internalCost/);
 assert.notEqual((await fetch(url+'/server/platform.mjs',options('a'))).status,200);
}));
test('upstream failure remains a failure without leaking its private details',()=>app(async url=>{
 const response=await fetch(url+'/products/sku1',options('a'));assert.equal(response.status,502);const body=await response.text();assert.match(body,/unavailable|failed/i);assert.doesNotMatch(body,/private-backend-debug/);
},{getQuote:async()=>{throw Error('private-backend-debug');}}));
