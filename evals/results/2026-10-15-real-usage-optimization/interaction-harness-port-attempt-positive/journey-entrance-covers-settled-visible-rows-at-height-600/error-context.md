# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.mjs >> entrance covers settled visible rows at height 600
- Location: tests/journey.spec.mjs:41:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:54259/?delay=450
Call log:
  - navigating to "http://127.0.0.1:54259/?delay=450", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('hidden clear returns width to text and keyboard clear restores focus', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   const input = page.getByRole('textbox', { name: 'Name' });
  6  |   const hidden = await input.boundingBox();
  7  |   await input.hover();
  8  |   const visible = await input.boundingBox();
  9  |   expect(hidden.width - visible.width).toBeGreaterThanOrEqual(24);
  10 |   await input.focus(); await page.keyboard.press('Tab');
  11 |   await expect(page.getByRole('button', { name: 'Clear name' })).toBeFocused();
  12 |   await page.keyboard.press('Enter');
  13 |   await expect(input).toHaveValue(''); await expect(input).toBeFocused();
  14 | });
  15 | 
  16 | test('save failure preserves draft and retry commits one snapshot', async ({ page }) => {
  17 |   let count = 0;
  18 |   let release;
  19 |   await page.route('**/save', async (route) => {
  20 |     count++;
  21 |     await new Promise((resolve) => { release = resolve; });
  22 |     await route.fulfill({ status: count === 1 ? 500 : 200, body: '{}' });
  23 |   });
  24 |   await page.goto('/');
  25 |   const input = page.getByRole('textbox', { name: 'Name' });
  26 |   const save = page.getByRole('button', { name: 'Save', exact: true });
  27 |   await input.fill('Original'); await save.click();
  28 |   await expect(save).toBeDisabled();
  29 |   await expect.poll(() => typeof release).toBe('function'); release();
  30 |   await expect(page.getByRole('status')).toHaveText('Save failed');
  31 |   await expect(input).toHaveValue('Original');
  32 |   release = undefined;
  33 |   await save.click(); await input.fill('New draft');
  34 |   await expect.poll(() => typeof release).toBe('function'); release();
  35 |   await expect(page.getByRole('status')).toHaveText('Saved');
  36 |   await expect(page.locator('td').first()).toHaveText('Original');
  37 |   await expect(input).toHaveValue('New draft'); expect(count).toBe(2);
  38 | });
  39 | 
  40 | for (const height of [600, 920]) {
  41 |   test('entrance covers settled visible rows at height ' + height, async ({ page }) => {
  42 |     await page.setViewportSize({ width: 800, height });
  43 |     await page.addInitScript(() => {
  44 |       window.effects = [];
  45 |       const animate = Element.prototype.animate;
  46 |       Element.prototype.animate = function (...args) {
  47 |         if (this.matches('tr')) window.effects.push({ row: this.dataset.row, ready: this.closest('#grid').dataset.ready });
  48 |         return animate.apply(this, args);
  49 |       };
  50 |     });
> 51 |     await page.goto('/?delay=450');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:54259/?delay=450
  52 |     await expect(page.locator('#grid')).toHaveAttribute('data-ready', 'true');
  53 |     const last = await page.locator('tr').evaluateAll((rows) => {
  54 |       const clip = document.querySelector('#grid').getBoundingClientRect();
  55 |       return rows.filter((row) => { const rect = row.getBoundingClientRect(); return rect.bottom > clip.top && rect.top < clip.bottom; }).at(-1).dataset.row;
  56 |     });
  57 |     await expect.poll(() => page.evaluate((id) => window.effects.some((effect) => effect.row === id), last)).toBe(true);
  58 |     const effects = await page.evaluate(() => window.effects);
  59 |     expect(effects.every((effect) => effect.ready === 'true')).toBe(true);
  60 |     expect(effects.length).toBeLessThanOrEqual(32);
  61 |   });
  62 | }
  63 | test('reduced motion preserves the usable final state without row animation', async ({ page }) => {
  64 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  65 |   await page.goto('/');
  66 |   await expect(page.locator('#grid')).toHaveAttribute('data-ready', 'true');
  67 |   expect(await page.locator('tr').evaluateAll((rows) => rows.flatMap((row) => row.getAnimations()).length)).toBe(0);
  68 |   await expect(page.getByRole('textbox')).toHaveValue('Draft');
  69 | });
  70 | 
```