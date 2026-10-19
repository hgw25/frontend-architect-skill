import { test, expect } from '@playwright/test';
const item = (page, id) => page.getByRole('list', { name: 'Invitations' }).locator('[data-invite-id="' + id + '"]');
const order = page => page.getByRole('list', { name: 'Invitations' }).locator('[data-invite-id]').evaluateAll(nodes => nodes.map(node => node.dataset.inviteId));
const send = async (page, email = 'ada@example.test') => {
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
};
function accepted(email = 'ada@example.test') {
  return { invitation: { id: 'accepted-1', email, state: 'pending' }, receipt: { id: 'ack-1', acceptedAt: 1730000000000 } };
}

test('accepted invitation remains confirmed if the subsequent overview read fails', async ({ page }) => {
  let reads = 0, sends = 0;
  await page.route('**/api/invitations', route => { sends++; return route.fulfill({ json: accepted() }); });
  await page.route('**/api/overview', route => { reads++; return route.fulfill({ status: 503, body: 'Overview unavailable' }); });
  await page.goto('/'); await send(page);
  await expect.poll(() => reads).toBeGreaterThan(0);
  await expect(item(page, 'accepted-1')).toContainText('ada@example.test');
  await expect(page.getByRole('status').filter({ hasText: /sent|accepted/i }).first()).toContainText(/sent|accepted/i);
  await expect(page.getByRole('status').filter({ hasText: /sent|accepted/i }).first()).toContainText('ada@example.test');
  await expect(page.locator('[role=alert], [role=status], [aria-live]').filter({ hasText: /overview|statistics|summary/i }).first()).toContainText(/unavailable|failed|retry|try again/i);
  expect(sends).toBe(1);
});

test('retrying the overview performs a read and preserves the accepted send result', async ({ page }) => {
  let reads = 0, sends = 0, available = false;
  await page.route('**/api/invitations', route => { sends++; return route.fulfill({ json: accepted() }); });
  await page.route('**/api/overview', route => {
    reads++;
    return available ? route.fulfill({ json: { pending: 9 } }) : route.fulfill({ status: 503, body: 'Overview unavailable' });
  });
  await page.goto('/'); await send(page); await expect.poll(() => reads).toBeGreaterThan(0);
  available = true; const oldReads = reads;
  await page.getByRole('button', { name: 'Refresh overview', exact: true }).click();
  await expect.poll(() => reads).toBeGreaterThan(oldReads);
  await expect(page.getByTestId('overview')).toContainText('9');
  expect(sends).toBe(1); await expect(item(page, 'accepted-1')).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: /sent|accepted/i }).first()).toContainText(/sent|accepted/i);
});

test('two keyboard moves operate on the same invitation and control without refocusing', async ({ page }) => {
  await page.goto('/'); const later = item(page, 'mia').getByRole('button', { name: 'Move later', exact: true });
  await later.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => order(page)).toEqual(['tom', 'mia', 'zoe', 'lee']);
  await expect(later).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => order(page)).toEqual(['tom', 'zoe', 'mia', 'lee']);
  await expect(later).toBeFocused();
});

test('send completion preserves focus and editing position after the user moves elsewhere', async ({ page }) => {
  const pending = [];
  await page.route('**/api/invitations', route => { pending.push(route); });
  await page.route('**/api/overview', route => route.fulfill({ json: { pending: 5 } }));
  await page.goto('/'); await send(page); await expect.poll(() => pending.length).toBe(1);
  const note = page.getByRole('textbox', { name: 'Team note', exact: true });
  await note.fill('Discuss timezone');
  await note.evaluate(node => { node.focus(); node.setSelectionRange(7, 7); });
  await pending[0].fulfill({ json: accepted() });
  await expect(page.getByRole('status').filter({ hasText: /sent|accepted/i }).first()).toContainText(/sent|accepted/i);
  await expect(note).toBeFocused(); await expect(note).toHaveValue('Discuss timezone');
  expect(await note.evaluate(node => [node.selectionStart, node.selectionEnd])).toEqual([7, 7]);
  await page.keyboard.type('!'); await expect(note).toHaveValue('Discuss! timezone');
});
