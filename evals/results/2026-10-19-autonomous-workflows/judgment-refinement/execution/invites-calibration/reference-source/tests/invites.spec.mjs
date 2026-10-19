import { test, expect } from '@playwright/test';
const rows = page => page.getByRole('list', { name: 'Invitations' }).locator('[data-invite-id]');
test.beforeEach(async ({ page }) => {
  await page.route('**/api/overview', route => route.fulfill({ json: { pending: 5 } }));
  await page.route('**/api/invitations', route => {
    const { email } = route.request().postDataJSON();
    return route.fulfill({ json: { invitation: { id: 'new-1', email, state: 'pending' }, receipt: { id: 'receipt-1', acceptedAt: 1730000000000 } } });
  });
});
test('a sent invitation is shown with accessible confirmation and refreshed overview', async ({ page }) => {
  await page.goto('/'); await page.getByRole('textbox', { name: 'Email', exact: true }).fill('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(/sent|accepted/i);
  await expect(page.getByRole('status')).toContainText('ada@example.test');
  await expect(rows(page)).toHaveCount(5); await expect(page.getByTestId('overview')).toContainText('5');
});
test('list buttons change display order without calling the service', async ({ page }) => {
  let sends = 0; page.on('request', request => { if (request.url().endsWith('/api/invitations')) sends++; });
  await page.goto('/'); await page.locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true }).click();
  expect(await rows(page).evaluateAll(nodes => nodes.map(node => node.dataset.inviteId))).toEqual(['tom', 'mia', 'zoe', 'lee']);
  expect(sends).toBe(0);
});
test('overview can be refreshed while an independent note stays intact', async ({ page }) => {
  await page.goto('/'); await page.getByRole('textbox', { name: 'Team note', exact: true }).fill('Ask about timezone');
  await page.getByRole('button', { name: 'Refresh overview', exact: true }).click();
  await expect(page.getByTestId('overview')).toContainText('5');
  await expect(page.getByRole('textbox', { name: 'Team note', exact: true })).toHaveValue('Ask about timezone');
});
