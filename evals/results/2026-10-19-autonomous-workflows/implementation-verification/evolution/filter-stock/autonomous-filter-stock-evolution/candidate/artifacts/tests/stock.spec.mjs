import {test,expect} from '@playwright/test';
const results=page=>page.getByRole('list',{name:'Results'});
const stock=page=>page.getByRole('combobox',{name:'Product stock',exact:true});
const apply=page=>page.getByRole('button',{name:'Apply',exact:true});
test('stock is a product draft, composes with other rules and resets to all',async({page})=>{
 await page.goto('/?page=products&utm=keep');await expect(results(page).getByRole('listitem')).toHaveCount(3);
 await stock(page).selectOption('in');await expect(results(page).getByRole('listitem')).toHaveCount(3);
 expect(new URL(page.url()).searchParams.get('p_stock')||'').toBe('');
 await apply(page).click();await expect(results(page)).toHaveText('Cap');expect(new URL(page.url()).searchParams.get('p_stock')).toBe('in');
 await page.getByRole('combobox',{name:'Product category',exact:true}).selectOption('food');await apply(page).click();await expect(results(page).getByRole('listitem')).toHaveCount(0);
 await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(stock(page)).toHaveValue('');await expect(results(page).getByRole('listitem')).toHaveCount(3);
 expect(new URL(page.url()).searchParams.get('utm')).toBe('keep');
});
test('stock participates in reload and history without changing orders',async({page})=>{
 await page.goto('/?page=products');await stock(page).selectOption('in');await apply(page).click();await expect(results(page)).toHaveText('Cap');
 await stock(page).selectOption('out');await apply(page).click();await expect(results(page)).toHaveText('TeaCoat');
 await page.goBack();await expect(stock(page)).toHaveValue('in');await expect(results(page)).toHaveText('Cap');
 await page.reload();await expect(stock(page)).toHaveValue('in');await expect(results(page)).toHaveText('Cap');
 await page.goto('/?page=orders');await expect(stock(page)).toHaveCount(0);await expect(results(page).getByRole('listitem')).toHaveCount(3);
});
