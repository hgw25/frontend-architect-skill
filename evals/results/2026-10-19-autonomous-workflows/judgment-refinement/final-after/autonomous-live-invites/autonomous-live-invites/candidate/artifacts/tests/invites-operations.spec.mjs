import { test, expect } from '@playwright/test';

test('keeps a confirmed invitation when its overview refresh fails', async ({ page }) => {
  await page.route('**/api/invitations', route => {
    const { email } = route.request().postDataJSON();
    return route.fulfill({ json: { invitation: { id: 'new-1', email, state: 'pending' }, receipt: { id: 'receipt-1' } } });
  });
  await page.route('**/api/overview', route => route.fulfill({ status: 503 }));

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('ada@example.test');
  await expect(page.locator('[data-invite-id="new-1"]')).toContainText('ada@example.test');
  await expect(page.getByRole('alert')).toContainText('Overview unavailable');
});

test('keeps keyboard focus on the moved invitation action', async ({ page }) => {
  await page.goto('/');
  const action = page.locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true });
  await action.focus();
  await action.click();

  await expect(page.locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true })).toBeFocused();
});

test('does not discard an email edited while a send is pending', async ({ page }) => {
  let releaseInvitation;
  const invitationReady = new Promise(resolve => { releaseInvitation = resolve; });
  await page.route('**/api/overview', route => route.fulfill({ json: { pending: 5 } }));
  await page.route('**/api/invitations', async route => {
    await invitationReady;
    const { email } = route.request().postDataJSON();
    return route.fulfill({ json: { invitation: { id: 'new-1', email, state: 'pending' }, receipt: { id: 'receipt-1' } } });
  });

  await page.goto('/');
  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  await email.fill('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await email.fill('grace@example.test');
  releaseInvitation();

  await expect(email).toHaveValue('grace@example.test');
  await expect(email).toBeFocused();
});
