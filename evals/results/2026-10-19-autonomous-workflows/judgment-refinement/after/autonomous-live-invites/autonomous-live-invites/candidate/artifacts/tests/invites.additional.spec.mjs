import { expect, test } from '@playwright/test';

const invitationRows = page =>
  page.getByRole('list', { name: 'Invitations' }).locator('[data-invite-id]');

test('an accepted invitation survives a failed overview refresh', async ({ page }) => {
  await page.route('**/api/invitations', route => route.fulfill({
    json: {
      invitation: { id: 'new-2', email: 'grace@example.test', state: 'pending' },
      receipt: { id: 'receipt-2', acceptedAt: 1730000000000 },
    },
  }));
  await page.route('**/api/overview', route => route.fulfill({ status: 503 }));

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('grace@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('grace@example.test');
  await expect(page.locator('[data-invite-id="new-2"]')).toContainText('grace@example.test');
  await expect(page.getByRole('alert')).toContainText('Overview is temporarily unavailable');
  await expect(page.getByRole('button', { name: 'Refresh overview' })).toBeEnabled();
});

test('send completion preserves edits made while the request is pending', async ({ page }) => {
  let finishRequest;
  const requestCanFinish = new Promise(resolve => {
    finishRequest = resolve;
  });

  await page.route('**/api/invitations', async route => {
    const { email } = route.request().postDataJSON();
    await requestCanFinish;
    await route.fulfill({
      json: {
        invitation: { id: 'new-3', email, state: 'pending' },
        receipt: { id: 'receipt-3', acceptedAt: 1730000000000 },
      },
    });
  });
  await page.route('**/api/overview', route => route.fulfill({ json: { pending: 5 } }));

  await page.goto('/');
  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  const note = page.getByRole('textbox', { name: 'Team note', exact: true });
  await email.fill('ada@example.test');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  await email.fill('next@example.test');
  await note.fill('Ask about timezone');
  finishRequest();

  await expect(page.getByRole('status')).toContainText('ada@example.test');
  await expect(email).toHaveValue('next@example.test');
  await expect(note).toHaveValue('Ask about timezone');
  await expect(note).toBeFocused();
});

test('repeated keyboard moves keep focus on the same invitation action', async ({ page }) => {
  await page.goto('/');
  const moveLater = page
    .locator('[data-invite-id="mia"]')
    .getByRole('button', { name: 'Move later', exact: true });

  await moveLater.focus();
  await page.keyboard.press('Enter');
  await expect(moveLater).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(moveLater).toBeFocused();
  expect(await invitationRows(page).evaluateAll(nodes => nodes.map(node => node.dataset.inviteId)))
    .toEqual(['tom', 'zoe', 'mia', 'lee']);
});

test('a rejected send keeps drafts and offers a retry', async ({ page }) => {
  await page.route('**/api/invitations', route => route.fulfill({ status: 500 }));
  await page.goto('/');

  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  const note = page.getByRole('textbox', { name: 'Team note', exact: true });
  await email.fill('retry@example.test');
  await note.fill('Keep this note');
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText('could not be sent');
  await expect(email).toHaveValue('retry@example.test');
  await expect(note).toHaveValue('Keep this note');
  await expect(page.getByRole('button', { name: 'Send invitation', exact: true })).toBeEnabled();
  await expect(invitationRows(page)).toHaveCount(4);
});
