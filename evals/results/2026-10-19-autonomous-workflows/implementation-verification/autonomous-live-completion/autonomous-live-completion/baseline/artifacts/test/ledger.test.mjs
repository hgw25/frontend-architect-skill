import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLedger } from '../src/ledger.mjs';

for (const status of ['done', 'error']) {
  test('saved association completes the original request through ' + status, () => {
    const ledger = createLedger();
    ledger.accept('room', 10);
    ledger.restoreMessage({ scope: 'room', id: 11, replyTo: 10, status: 'streaming' });
    ledger.receive({ scope: 'room', id: 11, status });
    assert.deepEqual(ledger.waiting('room'), []);
    assert.equal(ledger.inspect().length, 1);
  });
}
test('normal streaming and duplicate completion retain one terminal request', () => {
  const ledger = createLedger();
  ledger.accept('room', 10);
  ledger.receive({ scope: 'room', id: 11, replyTo: 10, status: 'streaming' });
  assert.deepEqual(ledger.waiting('room'), [10]);
  ledger.receive({ scope: 'room', id: 11, status: 'done' });
  ledger.receive({ scope: 'room', id: 11, status: 'done' });
  ledger.accept('room', 10);
  assert.deepEqual(ledger.waiting('room'), []);
  assert.equal(ledger.inspect().length, 1);
});
test('unassociated completion does not guess the latest question', () => {
  const ledger = createLedger();
  ledger.accept('room', 10);
  ledger.receive({ scope: 'room', id: 99, status: 'done' });
  assert.deepEqual(ledger.waiting('room'), [10]);
});
test('other requests and scopes remain waiting', () => {
  const ledger = createLedger();
  ledger.accept('room', 10);
  ledger.accept('room', 20);
  ledger.accept('other', 10);
  ledger.restoreMessage({ scope: 'room', id: 11, replyTo: 10 });
  ledger.receive({ scope: 'room', id: 11, status: 'done' });
  assert.deepEqual(ledger.waiting('room'), [20]);
  assert.deepEqual(ledger.waiting('other'), [10]);
});
test('known terminal association arriving before acceptance stays terminal', () => {
  const ledger = createLedger();
  ledger.receive({ scope: 'room', id: 11, replyTo: 10, status: 'done' });
  ledger.accept('room', 10);
  assert.deepEqual(ledger.waiting('room'), []);
});
test('explicit history recovery still handles an actually missed signal', () => {
  const ledger = createLedger();
  ledger.accept('room', 10);
  ledger.recover([{ scope: 'room', id: 11, replyTo: 10, status: 'done' }]);
  assert.deepEqual(ledger.waiting('room'), []);
});
