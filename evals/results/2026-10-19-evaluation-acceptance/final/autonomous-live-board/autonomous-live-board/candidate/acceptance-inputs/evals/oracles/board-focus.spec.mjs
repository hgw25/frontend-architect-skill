import {test, expect} from '@playwright/test';
for (const reducedMotion of ['no-preference', 'reduce']) {
 test(`upward keyboard moves preserve the same control with ${reducedMotion}`, async ({page}) => {
  await page.emulateMedia({reducedMotion});
  await page.route('**/api/order', route => route.fulfill({json:{ok:true}}));
  await page.goto('/');
  const board=page.getByRole('list',{name:'Board'});
  const control=board.locator('[data-card-id="4"]').getByRole('button',{name:'Move up',exact:true});
  const order=()=>board.locator('[data-card-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.cardId));
  await control.focus();await page.keyboard.press('Enter');
  await expect.poll(async()=>(await order()).slice(0,4)).toEqual(['1','2','4','3']);
  await expect(control).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(async()=>(await order()).slice(0,4)).toEqual(['1','4','2','3']);
  await expect(control).toBeFocused();
 });
}
