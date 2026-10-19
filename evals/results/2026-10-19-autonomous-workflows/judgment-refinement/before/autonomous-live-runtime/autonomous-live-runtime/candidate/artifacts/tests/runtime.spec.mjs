import {test,expect} from '@playwright/test';
test('server content works with scripts disabled and native purchase preserves the outcome',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});await context.addCookies([{name:'session',value:'a',url:baseURL}]);const page=await context.newPage();
 await page.goto(baseURL+'/products/sku1?lang=fr-FR');await expect(page.getByRole('heading',{name:'Steel mug'})).toBeVisible();
 await expect(page.getByTestId('price')).toContainText('12,50');await expect(page.locator('strong')).toHaveText('Steel');
 await page.getByRole('button',{name:'Buy',exact:true}).click();await expect(page.getByRole('status')).toContainText(/purchase accepted/i);await context.close();
});
test('a viewer cannot purchase and untrusted description does not execute',async({context,page,baseURL})=>{
 await context.addCookies([{name:'session',value:'v',url:baseURL}]);await page.goto('/products/sku1');
 await expect(page.getByRole('button',{name:'Buy',exact:true})).toBeDisabled();expect(await page.evaluate(()=>window.__pwned)).toBeUndefined();
 const response=await page.request.post('/api/buy',{form:{sku:'sku1',allowed:'yes'}});expect(response.status()).toBe(403);
});
test('enhanced purchase has accessible feedback',async({context,page,baseURL})=>{
 await context.addCookies([{name:'session',value:'b',url:baseURL}]);await page.goto('/products/sku1');
 await page.getByRole('button',{name:'Buy',exact:true}).click();await expect(page.getByRole('status')).toContainText(/purchase accepted/i);
});
