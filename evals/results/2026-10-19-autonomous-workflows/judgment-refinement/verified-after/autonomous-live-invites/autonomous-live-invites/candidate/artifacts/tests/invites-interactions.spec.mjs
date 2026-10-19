import { test, expect } from '@playwright/test';

const invitation = email => ({
  invitation: { id: 'new-1', email, state: 'pending' },
  receipt: { id: 'receipt-1', acceptedAt: 1730000000000 },
});

test('keeps accepted-send feedback when the independent overview refresh fails', async ({ page }) => {
  await page.route('**/api/invitations', route => route.fulfill({ json: invitation(route.request().postDataJSON().email) }));
  await page.route('**/api/overview', route => route.fulfill({ status: 503 }));

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('ada@example.test');
  await expect(page.getByRole('alert')).toContainText(/overview unavailable/i);
  await expect(page.locator('[data-invite-id="new-1"]')).toContainText('ada@example.test');
});

test('keeps keyboard focus on an invitation move control after a local reorder', async ({ page }) => {
  await page.route('**/api/overview', route => route.fulfill({ json: { pending: 4 } }));
  await page.goto('/');

  const moveLater = page.locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true });
  await moveLater.focus();
  await page.keyboard.press('Enter');
  expect(await page.locator('[data-invite-id]').evaluateAll(rows => rows.map(row => row.dataset.inviteId))).toEqual(['tom', 'mia', 'zoe', 'lee']);
  await page.keyboard.press('Enter');
  expect(await page.locator('[data-invite-id]').evaluateAll(rows => rows.map(row => row.dataset.inviteId))).toEqual(['tom', 'zoe', 'mia', 'lee']);
});

test('does not overwrite edits made while a send is pending', async ({ page }) => {
  let respond;
  await page.route('**/api/invitations', route => new Promise(resolve => {
    respond = () => route.fulfill({ json: invitation('ada@example.test') }).then(resolve);
  }));
  await page.route('**/api/overview', route => route.fulfill({ json: { pending: 5 } }));
  await page.goto('/');

  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  await email.fill('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await email.fill('grace@example.test');
  await page.getByRole('textbox', { name: 'Team note', exact: true }).fill('Keep this draft');
  await respond();

  await expect(email).toHaveValue('grace@example.test');
  await expect(page.getByRole('textbox', { name: 'Team note', exact: true })).toHaveValue('Keep this draft');
});

test('keeps a failed email available for a retry', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/invitations', route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503 })
      : route.fulfill({ json: invitation(route.request().postDataJSON().email) });
  });
  await page.route('**/api/overview', route => route.fulfill({ json: { pending: 5 } }));
  await page.goto('/');

  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  await email.fill('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/invitation failed/i);
  await expect(email).toHaveValue('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('ada@example.test');
  expect(attempts).toBe(2);
});
