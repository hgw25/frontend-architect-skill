import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestQueryRunner } from '../src/latest-query.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function nextMicrotasks() {
  return new Promise(resolve => setImmediate(resolve));
}

test('only the newest query can publish success or finish', async () => {
  const first = deferred();
  const second = deferred();
  const calls = [];
  const run = createLatestQueryRunner(
    ({ q }) => q === 'first' ? first.promise : second.promise,
    {
      start: () => calls.push('start'),
      succeed: result => calls.push(`success:${result}`),
      fail: error => calls.push(`error:${error.message}`),
      finish: () => calls.push('finish'),
    },
  );

  run({ q: 'first' });
  run({ q: 'second' });
  second.resolve('second');
  await nextMicrotasks();
  first.resolve('first');
  await nextMicrotasks();

  assert.deepEqual(calls, ['start', 'start', 'success:second', 'finish']);
});

test('an outdated failure cannot replace the current result', async () => {
  const first = deferred();
  const second = deferred();
  const calls = [];
  const run = createLatestQueryRunner(
    ({ q }) => q === 'first' ? first.promise : second.promise,
    {
      start: () => {},
      succeed: result => calls.push(`success:${result}`),
      fail: error => calls.push(`error:${error.message}`),
      finish: () => {},
    },
  );

  run({ q: 'first' });
  run({ q: 'second' });
  second.resolve('second');
  await nextMicrotasks();
  first.reject(new Error('old failure'));
  await nextMicrotasks();

  assert.deepEqual(calls, ['success:second']);
});
