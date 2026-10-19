import {test,expect} from '@playwright/test';
test('record actual browser work for the fixed board interaction',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/api/order',r=>r.fulfill({json:{ok:true}}));await page.goto('/');
 const session=await page.context().newCDPSession(page);await session.send('Performance.enable');
 const sample=async()=>Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const before=await sample();const start=performance.now();
 for(let i=0;i<8;i++){await page.locator('[data-card-id="1"]').getByRole('button',{name:'Move down',exact:true}).click();}
 const after=await sample();const metrics={browser:await page.context().browser().version(),cards:80,viewport:page.viewportSize(),operations:8,reducedMotion:true,wallMilliseconds:performance.now()-start};
 for(const key of ['LayoutCount','LayoutDuration','RecalcStyleCount','RecalcStyleDuration','ScriptDuration','TaskDuration'])metrics[key]=after[key]-before[key];
 expect(await page.getByRole('list',{name:'Board'}).locator('[data-card-id]').evaluateAll(n=>n.map(e=>e.dataset.cardId).slice(0,9))).toEqual(['2','3','4','5','6','7','8','9','1']);
 await info.attach('browser-cost.json',{body:JSON.stringify(metrics,null,2),contentType:'application/json'});console.log('BROWSER_COST '+JSON.stringify(metrics));await session.detach();
});
