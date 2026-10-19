import test from 'node:test';
import assert from 'node:assert/strict';
import { processForm } from '../src/process-form.js';

test('only an exact true condition enables a field', async () => {
  const results = [false, undefined, null, 0, 1, 'yes', {}, true];
  const fields = results.map((result, index) => ({
    name: `field${index}`,
    enabledWhen: () => result,
  }));
  const values = Object.fromEntries(results.map((_, index) => [`field${index}`, index]));

  assert.deepEqual(await processForm(fields, values, payload => payload), { field7: 7 });
});

test('all field conditions are resolved before validation starts', async () => {
  const events = [];
  const fields = [
    {
      name: 'first',
      enabledWhen() { events.push('first condition'); return true; },
      validate() { events.push('first validation'); },
    },
    {
      name: 'second',
      enabledWhen() { events.push('second condition'); return true; },
      validate() { events.push('second validation'); },
    },
  ];

  await processForm(fields, { first: 1, second: 2 }, payload => payload);

  assert.deepEqual(events, [
    'first condition',
    'second condition',
    'first validation',
    'second validation',
  ]);
});
