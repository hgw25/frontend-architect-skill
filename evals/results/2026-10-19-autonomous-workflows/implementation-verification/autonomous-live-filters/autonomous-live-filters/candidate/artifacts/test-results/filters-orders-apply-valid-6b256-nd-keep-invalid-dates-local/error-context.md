# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: filters.spec.mjs >> orders apply valid input immediately and keep invalid dates local
- Location: tests/filters.spec.mjs:32:1

# Error details

```
Test timeout of 20000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 20000ms exceeded.
Call log:
  - waiting for getByLabel('Order status', { exact: true })

```

# Page snapshot

```yaml
- main [ref=e2]:
  - navigation "Pages" [ref=e3]:
    - link "Products" [ref=e4] [cursor=pointer]:
      - /url: /?page=products&utm=keep
    - link "Orders" [ref=e5] [cursor=pointer]:
      - /url: /?page=orders&utm=keep
  - generic [ref=e6]:
    - heading "Orders" [level=1] [ref=e7]
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Order keyword
        - textbox "Order keyword" [active] [ref=e11]: Alice
      - generic [ref=e12]:
        - generic [ref=e13]: From date
        - textbox "From date" [ref=e14]: 2026-09-20
      - generic [ref=e15]:
        - generic [ref=e16]: To date
        - textbox "To date" [ref=e17]: 2026-10-19
      - generic [ref=e18]:
        - generic [ref=e19]: Order status
        - combobox "Order status" [ref=e20]:
          - option "All statuses" [selected]
          - option "New"
          - option "Paid"
      - button "Reset" [ref=e21]
    - generic [ref=e22]:
      - status [ref=e23]: 2 results
      - list "Results" [ref=e24]:
        - listitem [ref=e25]: Alice paid
        - listitem [ref=e26]: Alice new
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | const results=page=>page.getByRole('list',{name:'Results'});
  3  | test('product drafts, application, category and reset preserve accepted behavior',async({page})=>{
  4  |  await page.goto('/?page=products&utm=keep');
  5  |  await expect(results(page).getByRole('listitem')).toHaveCount(3);
  6  |  await page.getByLabel('Product keyword',{exact:true}).fill('Tea');
  7  |  await expect(results(page).getByRole('listitem')).toHaveCount(3);
  8  |  expect(new URL(page.url()).searchParams.has('p_q')).toBe(false);
  9  |  await page.getByRole('button',{name:'Apply',exact:true}).click();
  10 |  await expect(results(page)).toHaveText('Tea');
  11 |  expect(new URL(page.url()).searchParams.get('p_q')).toBe('Tea');
  12 |  expect(new URL(page.url()).searchParams.get('utm')).toBe('keep');
  13 |  await page.getByRole('button',{name:'Reset',exact:true}).click();
  14 |  await expect(results(page).getByRole('listitem')).toHaveCount(3);
  15 |  await page.getByLabel('Product category',{exact:true}).selectOption('wear');
  16 |  await page.getByRole('button',{name:'Apply',exact:true}).click();
  17 |  await expect(results(page)).toHaveText('CapCoat');
  18 |  await page.getByLabel('Product status',{exact:true}).selectOption('draft');
  19 |  await page.getByLabel('Product category',{exact:true}).selectOption('');
  20 |  await page.getByRole('button',{name:'Apply',exact:true}).click();
  21 |  await expect(results(page)).toHaveText('Mug');
  22 | });
  23 | test('product URL is restored by reload and browser history',async({page})=>{
  24 |  await page.goto('/?page=products');
  25 |  const q=page.getByLabel('Product keyword',{exact:true});
  26 |  await q.fill('Tea');await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(results(page)).toHaveText('Tea');
  27 |  await q.fill('Cap');await page.getByRole('button',{name:'Apply',exact:true}).click();await expect(results(page)).toHaveText('Cap');
  28 |  await page.goBack();await expect(q).toHaveValue('Tea');await expect(results(page)).toHaveText('Tea');
  29 |  await page.reload();await expect(q).toHaveValue('Tea');await expect(results(page)).toHaveText('Tea');
  30 |  await page.goForward();await expect(q).toHaveValue('Cap');await expect(results(page)).toHaveText('Cap');
  31 | });
  32 | test('orders apply valid input immediately and keep invalid dates local',async({page})=>{
  33 |  await page.goto('/?page=orders&utm=keep');
  34 |  await expect(results(page).getByRole('listitem')).toHaveCount(3);
  35 |  await page.getByLabel('Order keyword',{exact:true}).fill('Alice');
  36 |  await expect(results(page).getByRole('listitem')).toHaveCount(2);
  37 |  expect(new URL(page.url()).searchParams.get('o_q')).toBe('Alice');
> 38 |  await page.getByLabel('Order status',{exact:true}).selectOption('paid');await expect(results(page)).toHaveText('Alice paid');
     |                                                     ^ Error: locator.selectOption: Test timeout of 20000ms exceeded.
  39 |  const applied=page.url();
  40 |  await page.getByLabel('From date',{exact:true}).fill('2026-10-30');
  41 |  await expect(page.getByRole('alert')).toContainText(/date|range|before|after/i);expect(page.url()).toBe(applied);
  42 |  await expect(results(page)).toHaveText('Alice paid');
  43 |  await page.getByLabel('To date',{exact:true}).fill('2026-11-01');
  44 |  await expect(results(page).getByRole('listitem')).toHaveCount(0);
  45 |  await page.getByRole('button',{name:'Reset',exact:true}).click();
  46 |  await expect(page.getByLabel('From date',{exact:true})).toHaveValue('2026-09-20');
  47 |  await expect(page.getByLabel('To date',{exact:true})).toHaveValue('2026-10-19');
  48 |  await expect(page.getByLabel('Order status',{exact:true})).toHaveValue('');
  49 |  await expect(results(page).getByRole('listitem')).toHaveCount(3);
  50 |  expect(new URL(page.url()).searchParams.get('utm')).toBe('keep');
  51 | });
  52 | test('outdated query responses and query errors cannot impersonate current results',async({page})=>{
  53 |  await page.goto('/?page=products');await expect(results(page).getByRole('listitem')).toHaveCount(3);
  54 |  const q=page.getByLabel('Product keyword',{exact:true});
  55 |  await q.fill('Cap');await page.getByRole('button',{name:'Apply',exact:true}).click();
  56 |  await q.fill('Tea');await page.getByRole('button',{name:'Apply',exact:true}).click();
  57 |  await expect(results(page)).toHaveText('Tea');await page.waitForTimeout(300);await expect(results(page)).toHaveText('Tea');
  58 |  await q.fill('error');await page.getByRole('button',{name:'Apply',exact:true}).click();
  59 |  await expect(page.getByRole('alert')).toContainText(/unavailable|failed|error/i);
  60 | });
  61 | test('native keyboard, narrow layout, long labels and text resizing remain usable',async({page})=>{
  62 |  await page.setViewportSize({width:360,height:800});await page.goto('/?page=products');
  63 |  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';for(const span of document.querySelectorAll('label span'))span.textContent+=' translated label with considerably longer text';});
  64 |  const inputs=page.getByRole('textbox');await inputs.first().focus();await inputs.first().fill('Tea');
  65 |  await inputs.first().press('Enter');await expect(results(page)).toHaveText('Tea');
  66 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  67 |  await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeVisible();
  68 | });
  69 | 
```