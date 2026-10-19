import { expect, test } from '@playwright/test';

test('enhancement submits once while pending and publishes the refreshed quote', async ({ context, page, baseURL }) => {
  await context.addCookies([{ name: 'session', value: 'b', url: baseURL }]);
  await page.goto('/products/sku1');

  await page.locator('form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  await expect(page.getByRole('status')).toHaveText('Purchase accepted');
  await expect(page.getByTestId('price')).toContainText('28.00');
  await expect(page.getByRole('button', { name: 'Buy', exact: true })).toBeEnabled();
});

test('French locale is retained by the native action and narrow layout stays contained', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 740 } });
  await context.addCookies([{ name: 'session', value: 'a', url: baseURL }]);
  const page = await context.newPage();

  await page.goto('/products/sku1?lang=fr-FR');
  await expect(page.locator('form')).toHaveAttribute('action', '/api/buy?lang=fr-FR');
  await expect(page.getByTestId('price')).toContainText('12,50');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await context.close();
});
