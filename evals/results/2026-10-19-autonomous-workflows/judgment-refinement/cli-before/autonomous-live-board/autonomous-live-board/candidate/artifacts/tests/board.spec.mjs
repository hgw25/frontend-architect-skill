import {test,expect} from '@playwright/test';
const board=page=>page.getByRole('list',{name:'Board'});
const card=(page,id)=>board(page).locator('[data-card-id="'+id+'"]');
const ids=page=>board(page).locator('[data-card-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
test.beforeEach(async({page})=>{await page.route('**/api/order',r=>r.fulfill({json:{ok:true}}));});
test('button reorder preserves identity, focus, intermediate movement and repeated interaction',async({page})=>{
 await page.goto('/');await expect(board(page).getByRole('listitem')).toHaveCount(80);
 const old=await card(page,'1').boundingBox();
 await card(page,'1').getByRole('button',{name:'Move down',exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect.poll(async()=>(await ids(page)).slice(0,2)).toEqual(['2','1']);
 await expect(card(page,'1').getByRole('button',{name:'Move down',exact:true})).toBeFocused();
 const during=await card(page,'1').boundingBox();
 await page.waitForTimeout(550);const end=await card(page,'1').boundingBox();
 expect(Math.hypot(end.x-old.x,end.y-old.y)).toBeGreaterThan(20);
 expect(Math.hypot(end.x-during.x,end.y-during.y)).toBeGreaterThan(1);
 await card(page,'1').getByRole('button',{name:'Move down',exact:true}).focus();
 await page.keyboard.press('Enter');const before=await card(page,'1').boundingBox();
 await page.keyboard.press('Enter');const after=await card(page,'1').boundingBox();
 expect(Math.hypot(before.x-after.x,before.y-after.y)).toBeLessThan(90);
 await expect.poll(async()=>(await ids(page)).slice(0,4)).toEqual(['2','3','4','1']);
 await page.waitForTimeout(550);await expect(card(page,'1').getByRole('button',{name:'Move down',exact:true})).toBeFocused();
});
test('pointer drag and buttons produce the same business order',async({page})=>{
 await page.goto('/');const handle=await card(page,'1').getByRole('button',{name:'Move card 1',exact:true}).boundingBox();const target=await card(page,'3').boundingBox();
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:8});await page.mouse.up();
 await expect.poll(async()=>(await ids(page)).slice(0,3)).toEqual(['2','3','1']);
});
test('new intent survives save ordering, rejection and retry',async({page})=>{
 const pending=[];await page.unroute('**/api/order');await page.route('**/api/order',r=>pending.push(r));await page.goto('/');
 await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
 await expect.poll(()=>pending.length).toBe(1);
 await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
 // Serialized or concurrent requests are both valid; the last acknowledged save must be current.
 await pending[0].fulfill({json:{ok:true}});await expect.poll(()=>pending.length).toBe(2);
 const newest=pending[1].request().postDataJSON().ids;expect(newest.slice(0,3)).toEqual(['2','3','1']);
 await pending[1].fulfill({status:500,body:'unavailable'});await expect(page.getByRole('alert')).toContainText(/save|failed|unavailable/i);
 await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect.poll(()=>pending.length).toBe(3);
 expect(pending[2].request().postDataJSON().ids).toEqual(newest);await pending[2].fulfill({json:{ok:true}});
 await expect(page.getByRole('status')).toContainText(/saved/i);expect((await ids(page)).slice(0,3)).toEqual(['2','3','1']);
});
test('scroll, resize and disposal retain a settled board with no ghost work',async({page})=>{
 await page.goto('/');await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
 await page.setViewportSize({width:740,height:600});await page.evaluate(()=>window.scrollTo(0,300));
 await page.waitForTimeout(600);expect((await ids(page)).slice(0,2)).toEqual(['2','1']);
 await page.getByRole('button',{name:'Hide board',exact:true}).click();await expect(board(page)).toHaveCount(0);await page.waitForTimeout(600);
 expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
 await expect(board(page)).toHaveCount(0);await page.getByRole('button',{name:'Show board',exact:true}).click();
 await expect(board(page).getByRole('listitem')).toHaveCount(80);expect((await ids(page)).slice(0,2)).toEqual(['2','1']);
});
test('reduced motion gives the correct static result',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await card(page,'1').getByRole('button',{name:'Move down',exact:true}).click();
 expect((await ids(page)).slice(0,2)).toEqual(['2','1']);expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
});
