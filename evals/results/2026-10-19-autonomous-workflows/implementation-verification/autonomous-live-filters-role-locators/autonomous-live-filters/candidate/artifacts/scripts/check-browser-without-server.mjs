import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const types = new Map([
  ['.html', 'text/html'],
  ['.mjs', 'text/javascript'],
  ['.css', 'text/css'],
]);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.route('http://app.test/**', async route => {
  const pathname = new URL(route.request().url()).pathname;
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(root, relativePath);
  if (!filePath.startsWith(`${root}/`)) {
    await route.abort();
    return;
  }
  await route.fulfill({
    body: await readFile(filePath),
    contentType: types.get(extname(filePath)) ?? 'application/octet-stream',
  });
});

const results = page.getByRole('list', { name: 'Results' });

await page.goto('http://app.test/?page=products&utm=keep');
await expect(results.getByRole('listitem')).toHaveCount(3);
const productKeyword = page.getByLabel('Product keyword', { exact: true });
await productKeyword.fill('Tea');
await expect(results.getByRole('listitem')).toHaveCount(3);
await page.getByRole('button', { name: 'Apply', exact: true }).click();
await expect(results).toHaveText('Tea');
assert.equal(new URL(page.url()).searchParams.get('utm'), 'keep');
await productKeyword.fill('Cap');
await page.getByRole('button', { name: 'Apply', exact: true }).click();
await productKeyword.fill('Tea');
await page.getByRole('button', { name: 'Apply', exact: true }).click();
await expect(results).toHaveText('Tea');
await page.waitForTimeout(300);
await expect(results).toHaveText('Tea');
await page.goBack();
await expect(page.getByLabel('Product keyword', { exact: true })).toHaveValue('Cap');
await expect(results).toHaveText('Cap');

await page.goto('http://app.test/?page=orders&utm=keep');
await expect(results.getByRole('listitem')).toHaveCount(3);
await page.getByLabel('Order keyword', { exact: true }).fill('Alice');
await expect(results.getByRole('listitem')).toHaveCount(2);
const applied = page.url();
await page.getByLabel('From date', { exact: true }).fill('2026-10-30');
await expect(page.getByRole('alert')).toContainText(/date|range|before|after/i);
assert.equal(page.url(), applied);
await expect(results.getByRole('listitem')).toHaveCount(2);
await page.getByLabel('To date', { exact: true }).fill('2026-11-01');
await expect(results.getByRole('listitem')).toHaveCount(0);
await page.getByRole('button', { name: 'Reset', exact: true }).click();
await expect(page.getByLabel('From date', { exact: true })).toHaveValue('2026-09-20');
await expect(results.getByRole('listitem')).toHaveCount(3);

await page.setViewportSize({ width: 360, height: 800 });
await page.goto('http://app.test/?page=products');
await page.evaluate(() => {
  document.documentElement.style.fontSize = '200%';
  for (const span of document.querySelectorAll('label span')) {
    span.textContent += ' translated label with considerably longer text';
  }
});
const narrowKeyword = page.getByLabel(/Product keyword/);
await narrowKeyword.fill('Tea');
await narrowKeyword.press('Enter');
await expect(results).toHaveText('Tea');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

await browser.close();
console.log('Browser fallback checks passed');
