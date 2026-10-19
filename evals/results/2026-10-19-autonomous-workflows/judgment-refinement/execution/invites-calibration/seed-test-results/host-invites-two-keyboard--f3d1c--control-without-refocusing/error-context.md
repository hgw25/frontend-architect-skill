# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: host-invites.spec.mjs >> two keyboard moves operate on the same invitation and control without refocusing
- Location: tests/host-invites.spec.mjs:41:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('list', { name: 'Invitations' }).locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('list', { name: 'Invitations' }).locator('[data-invite-id="mia"]').getByRole('button', { name: 'Move later', exact: true })
    14 × locator resolved to <button>Move later</button>
       - unexpected value "inactive"

```

```yaml
- button "Move later"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | const item = (page, id) => page.getByRole('list', { name: 'Invitations' }).locator('[data-invite-id="' + id + '"]');
  3  | const order = page => page.getByRole('list', { name: 'Invitations' }).locator('[data-invite-id]').evaluateAll(nodes => nodes.map(node => node.dataset.inviteId));
  4  | const send = async (page, email = 'ada@example.test') => {
  5  |   await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  6  |   await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
  7  | };
  8  | function accepted(email = 'ada@example.test') {
  9  |   return { invitation: { id: 'accepted-1', email, state: 'pending' }, receipt: { id: 'ack-1', acceptedAt: 1730000000000 } };
  10 | }
  11 | 
  12 | test('accepted invitation remains confirmed if the subsequent overview read fails', async ({ page }) => {
  13 |   let reads = 0, sends = 0;
  14 |   await page.route('**/api/invitations', route => { sends++; return route.fulfill({ json: accepted() }); });
  15 |   await page.route('**/api/overview', route => { reads++; return route.fulfill({ status: 503, body: 'Overview unavailable' }); });
  16 |   await page.goto('/'); await send(page);
  17 |   await expect.poll(() => reads).toBeGreaterThan(0);
  18 |   await expect(item(page, 'accepted-1')).toContainText('ada@example.test');
  19 |   await expect(page.getByRole('status')).toContainText(/sent|accepted/i);
  20 |   await expect(page.getByRole('status')).toContainText('ada@example.test');
  21 |   await expect(page.getByRole('alert')).toContainText(/overview|statistics|summary/i);
  22 |   expect(sends).toBe(1);
  23 | });
  24 | 
  25 | test('retrying the overview performs a read and preserves the accepted send result', async ({ page }) => {
  26 |   let reads = 0, sends = 0, available = false;
  27 |   await page.route('**/api/invitations', route => { sends++; return route.fulfill({ json: accepted() }); });
  28 |   await page.route('**/api/overview', route => {
  29 |     reads++;
  30 |     return available ? route.fulfill({ json: { pending: 9 } }) : route.fulfill({ status: 503, body: 'Overview unavailable' });
  31 |   });
  32 |   await page.goto('/'); await send(page); await expect.poll(() => reads).toBeGreaterThan(0);
  33 |   available = true; const oldReads = reads;
  34 |   await page.getByRole('button', { name: 'Refresh overview', exact: true }).click();
  35 |   await expect.poll(() => reads).toBeGreaterThan(oldReads);
  36 |   await expect(page.getByTestId('overview')).toContainText('9');
  37 |   expect(sends).toBe(1); await expect(item(page, 'accepted-1')).toHaveCount(1);
  38 |   await expect(page.getByRole('status')).toContainText(/sent|accepted/i);
  39 | });
  40 | 
  41 | test('two keyboard moves operate on the same invitation and control without refocusing', async ({ page }) => {
  42 |   await page.goto('/'); const later = item(page, 'mia').getByRole('button', { name: 'Move later', exact: true });
  43 |   await later.focus(); await page.keyboard.press('Enter');
  44 |   await expect.poll(() => order(page)).toEqual(['tom', 'mia', 'zoe', 'lee']);
> 45 |   await expect(later).toBeFocused();
     |                       ^ Error: expect(locator).toBeFocused() failed
  46 |   await page.keyboard.press('Enter');
  47 |   await expect.poll(() => order(page)).toEqual(['tom', 'zoe', 'mia', 'lee']);
  48 |   await expect(later).toBeFocused();
  49 | });
  50 | 
  51 | test('send completion preserves focus and editing position after the user moves elsewhere', async ({ page }) => {
  52 |   const pending = [];
  53 |   await page.route('**/api/invitations', route => { pending.push(route); });
  54 |   await page.route('**/api/overview', route => route.fulfill({ json: { pending: 5 } }));
  55 |   await page.goto('/'); await send(page); await expect.poll(() => pending.length).toBe(1);
  56 |   const note = page.getByRole('textbox', { name: 'Team note', exact: true });
  57 |   await note.fill('Discuss timezone');
  58 |   await note.evaluate(node => { node.focus(); node.setSelectionRange(7, 7); });
  59 |   await pending[0].fulfill({ json: accepted() });
  60 |   await expect(page.getByRole('status')).toContainText(/sent|accepted/i);
  61 |   await expect(note).toBeFocused(); await expect(note).toHaveValue('Discuss timezone');
  62 |   expect(await note.evaluate(node => [node.selectionStart, node.selectionEnd])).toEqual([7, 7]);
  63 |   await page.keyboard.type('!'); await expect(note).toHaveValue('Discuss! timezone');
  64 | });
  65 | 
```