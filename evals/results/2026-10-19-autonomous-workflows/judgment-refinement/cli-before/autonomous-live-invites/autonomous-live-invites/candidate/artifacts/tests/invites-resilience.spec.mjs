import { test, expect } from '@playwright/test';

test('an accepted invitation remains visible when its overview refresh fails', async ({ page }) => {
  await page.route('**/api/invitations', route => {
    const { email } = route.request().postDataJSON();
    return route.fulfill({ json: { invitation: { id: 'new-2', email, state: 'pending' }, receipt: { id: 'receipt-2', acceptedAt: 1730000000000 } } });
  });
  await page.route('**/api/overview', route => route.fulfill({ status: 503 }));

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('lin@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('lin@example.test');
  await expect(page.locator('[data-invite-id="new-2"]')).toContainText('lin@example.test');
  await expect(page.getByRole('alert')).toContainText('Overview unavailable');
});

test('moving an invitation keeps keyboard focus on that invitation action', async ({ page }) => {
  await page.goto('/');
  const action = page.locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true });
  await action.focus();
  await action.click();

  expect(await page.getByRole('list', { name: 'Invitations' }).locator('[data-invite-id]').evaluateAll(nodes => nodes.map(node => node.dataset.inviteId))).toEqual(['tom', 'mia', 'zoe', 'lee']);
  await expect(page.locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true })).toBeFocused();
});
