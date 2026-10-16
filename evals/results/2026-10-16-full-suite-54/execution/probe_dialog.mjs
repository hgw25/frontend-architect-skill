import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [workspace,kind,output]=process.argv.slice(2);
const {chromium,expect}=await import(pathToFileURL(resolve(workspace,'node_modules/@playwright/test/index.mjs')).href);
const browser=await chromium.launch({headless:true});
const results=[];
for(const intervention of kind==='previous276'?['none','browser-process-env']:['none','cancel-outside-default']){
 const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
 if(intervention==='browser-process-env')await page.evaluate(()=>window.process={env:{NODE_ENV:'production'}});
 if(kind==='previous276'){
  await page.addStyleTag({path:resolve(workspace,'dist/browser-test/fixture.css')});
  await page.addScriptTag({path:resolve(workspace,'dist/browser-test/fixture.iife.js')});
 }else{
  const dir=resolve(workspace,'dist/app/assets'),files=await readdir(dir);
  await page.addStyleTag({path:resolve(dir,files.find(x=>x.endsWith('.css')))});
  await page.addScriptTag({path:resolve(dir,files.find(x=>x.endsWith('.js'))),type:'module'});
 }
 const trigger=page.getByRole('button',{name:'Edit profile',exact:true});
 try{await trigger.waitFor({state:'visible',timeout:4000});}catch{}
 const result={intervention,errors,body:await page.locator('body').innerText()};
 if(await trigger.count()){
  await page.evaluate(()=>{
   window.trace=[];
   const label=n=>n?.tagName+(n?.id?'#'+n.id:'')+(n?.textContent?' '+n.textContent.trim().slice(0,40):'');
   for(const name of ['pointerdown','mousedown','pointerup','mouseup','click','focusin','focusout'])document.addEventListener(name,e=>{
    window.trace.push({event:name,target:label(e.target),active:label(document.activeElement),defaultPrevented:e.defaultPrevented});
    if(name==='pointerdown')queueMicrotask(()=>window.trace.push({event:'pointerdown-microtask',active:label(document.activeElement),defaultPrevented:e.defaultPrevented}));
   },true);
   const focus=HTMLElement.prototype.focus; HTMLElement.prototype.focus=function(...args){window.trace.push({event:'focus-call',target:label(this),stack:new Error().stack.split('\n').slice(1,4)});return focus.apply(this,args)};
  });
  await trigger.click();
  await expect(page.getByRole('dialog',{name:'Edit profile',exact:true})).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Edit profile',exact:true}).getByLabel('Name')).toBeFocused();
  if(intervention==='cancel-outside-default')await page.evaluate(()=>document.addEventListener('pointerdown',e=>{if(!(e.target instanceof Element)||!e.target.closest('[role="dialog"]'))e.preventDefault()}));
  result.beforeOutside=await page.evaluate(()=>({active:document.activeElement?.outerHTML,dialogs:document.querySelectorAll('[role=dialog]').length}));
  await page.mouse.click(5,5);
  await expect(page.getByRole('dialog',{name:'Edit profile',exact:true})).toBeHidden();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  result.afterOutside=await page.evaluate(()=>({active:document.activeElement?.outerHTML,dialogs:document.querySelectorAll('[role=dialog]').length,trace:window.trace}));
 }
 results.push(result); await page.close();
}
await browser.close(); await writeFile(output,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(x=>({intervention:x.intervention,errors:x.errors,triggerVisible:x.body.includes('Edit profile'),afterActive:x.afterOutside?.active?.slice(0,180),dialogs:x.afterOutside?.dialogs})),null,2));
