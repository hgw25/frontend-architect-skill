import { test, expect } from '@playwright/test';

test('hidden clear returns width to text and keyboard clear restores focus', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Name' });
  const hidden = await input.boundingBox();
  await input.hover();
  const visible = await input.boundingBox();
  expect(hidden.width - visible.width).toBeGreaterThanOrEqual(24);
  await input.focus(); await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Clear name' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue(''); await expect(input).toBeFocused();
});

test('save failure preserves draft and retry commits one snapshot', async ({ page }) => {
  let count = 0;
  let release;
  await page.route('**/save', async (route) => {
    count++;
    await new Promise((resolve) => { release = resolve; });
    await route.fulfill({ status: count === 1 ? 500 : 200, body: '{}' });
  });
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Name' });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await input.fill('Original'); await save.click();
  await expect(save).toBeDisabled();
  await expect.poll(() => typeof release).toBe('function'); release();
  await expect(page.getByRole('status')).toHaveText('Save failed');
  await expect(input).toHaveValue('Original');
  release = undefined;
  await save.click(); await input.fill('New draft');
  await expect.poll(() => typeof release).toBe('function'); release();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await expect(page.locator('td').first()).toHaveText('Original');
  await expect(input).toHaveValue('New draft'); expect(count).toBe(2);
});

test('save completion preserves a later edit even when text returns to the submitted value', async ({ page }) => {
  let release;
  await page.route('**/save', async (route) => {
    await new Promise((resolve) => { release = resolve; });
    await route.fulfill({ status: 200, body: '{}' });
  });
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Name' });
  await input.fill('Original');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => typeof release).toBe('function');
  await input.fill('Changed'); await input.fill('Original');
  release();
  await expect(page.getByRole('status')).toHaveText('Saved');
  await expect(page.locator('td').first()).toHaveText('Original');
  await expect(input).toHaveValue('Original');
});

for (const height of [600, 920]) {
  test('entrance covers settled visible rows at height ' + height, async ({ page }) => {
    await page.setViewportSize({ width: 800, height });
    await page.addInitScript(() => {
      window.effects = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        if (this.matches('tr')) window.effects.push({ row: this.dataset.row, ready: this.closest('#grid').dataset.ready });
        return animate.apply(this, args);
      };
    });
    await page.goto('/?delay=450');
    await expect(page.locator('#grid')).toHaveAttribute('data-ready', 'true');
    const last = await page.locator('tr').evaluateAll((rows) => {
      const clip = document.querySelector('#grid').getBoundingClientRect();
      return rows.filter((row) => { const rect = row.getBoundingClientRect(); return rect.bottom > clip.top && rect.top < clip.bottom; }).at(-1).dataset.row;
    });
    await expect.poll(() => page.evaluate((id) => window.effects.some((effect) => effect.row === id), last)).toBe(true);
    const effects = await page.evaluate(() => window.effects);
    expect(effects.every((effect) => effect.ready === 'true')).toBe(true);
    expect(effects.length).toBeLessThanOrEqual(32);
  });
}
test('reduced motion preserves the usable final state without row animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#grid')).toHaveAttribute('data-ready', 'true');
  expect(await page.locator('tr').evaluateAll((rows) => rows.flatMap((row) => row.getAnimations()).length)).toBe(0);
  await expect(page.getByRole('textbox')).toHaveValue('Draft');
});
