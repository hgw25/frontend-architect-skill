import assert from 'node:assert/strict';
import test from 'node:test';
import { submissionFields, submitForm } from './form-submission.mjs';
import { createLatestSearch } from './latest-search.mjs';
import { inviteMember } from './confirmed-invitation.mjs';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test('disabled fields neither validate nor enter the submitted payload', async () => {
  let validations = 0;
  const sent = [];
  const fields = [
    { name: 'name', required: true },
    { name: 'legacy', required: true, disabled: true,
      validate() { validations += 1; return 'Invalid'; } },
  ];
  assert.deepEqual(submissionFields(fields).map(field => field.name), ['name']);
  const outcome = await submitForm(fields, { name: 'Ada', legacy: '' }, async payload => {
    sent.push(payload);
    return { id: 'saved' };
  });
  assert.equal(validations, 0);
  assert.deepEqual(sent, [{ name: 'Ada' }]);
  assert.deepEqual(outcome, { kind: 'sent', receipt: { id: 'saved' } });
});

test('required accepts zero and false, rejects empty values, and prevents sending', async () => {
  const sent = [];
  const send = async payload => sent.push(payload);
  for (const value of ['', null, undefined]) {
    assert.deepEqual(await submitForm([{ name: 'value', required: true }], { value }, send),
      { kind: 'invalid', errors: { value: 'Required' } });
  }
  assert.equal(sent.length, 0);
  for (const value of [0, false]) {
    assert.equal((await submitForm([{ name: 'value', required: true }], { value }, send)).kind, 'sent');
  }
  assert.deepEqual(sent, [{ value: 0 }, { value: false }]);
});

test('async validation and payload use the same submitted values', async () => {
  const gate = deferred();
  const values = { name: 'Ada', team: 'research' };
  const sent = [];
  const fields = [
    { name: 'name', validate: () => gate.promise },
    { name: 'team', validate: (value, snapshot) => value === snapshot.team ? null : 'Mismatch' },
  ];
  const pending = submitForm(fields, values, async payload => sent.push(payload));
  values.name = 'Grace';
  values.team = 'engineering';
  gate.resolve(null);
  await pending;
  assert.deepEqual(sent, [{ name: 'Ada', team: 'research' }]);
});

test('custom validation preserves its message; unexpected failures still reject', async () => {
  const fields = [{ name: 'email', validate: async () => 'Already registered' }];
  const neverSend = () => assert.fail('invalid input must not be sent');
  assert.deepEqual(await submitForm(fields, { email: 'ada@example.test' }, neverSend),
    { kind: 'invalid', errors: { email: 'Already registered' } });
  const failure = new Error('Validation unavailable');
  await assert.rejects(submitForm([{ name: 'email', validate: async () => { throw failure; } }], {}, neverSend),
    error => error === failure);
  await assert.rejects(submitForm([], {}, async () => { throw failure; }), error => error === failure);
});

for (const lateResult of ['success', 'error']) {
  test(`an old ${lateResult} cannot replace the newer successful state`, async () => {
    const old = deferred();
    const current = deferred();
    const published = [];
    const requests = [old, current];
    const search = createLatestSearch(() => requests.shift().promise, state => published.push(state));
    const a = search.submit('same query');
    const b = search.submit('same query');
    current.resolve([{ id: 'new' }]);
    await b;
    if (lateResult === 'success') old.resolve([{ id: 'old' }]);
    else old.reject(new Error('Old request failed'));
    await a;
    assert.deepEqual(published, [
      { status: 'loading', query: 'same query' },
      { status: 'loading', query: 'same query' },
      { status: 'success', query: 'same query', items: [{ id: 'new' }] },
    ]);
  });

  test(`an old ${lateResult} cannot end the newer loading state`, async () => {
    const old = deferred();
    const current = deferred();
    const requests = [old, current];
    const published = [];
    const search = createLatestSearch(() => requests.shift().promise, state => published.push(state));
    const a = search.submit('A');
    const b = search.submit('B');
    if (lateResult === 'success') old.resolve([]);
    else old.reject(new Error('Old request failed'));
    await a;
    assert.equal(published.length, 2);
    assert.deepEqual(published.at(-1), { status: 'loading', query: 'B' });
    current.resolve([]);
    await b;
  });

  test(`dispose blocks late ${lateResult} publication and new requests`, async () => {
    const gate = deferred();
    const published = [];
    let calls = 0;
    const search = createLatestSearch(() => { calls += 1; return gate.promise; }, state => published.push(state));
    const pending = search.submit('A');
    search.dispose();
    search.dispose();
    if (lateResult === 'success') gate.resolve([]);
    else gate.reject(new Error('Disposed request failed'));
    await pending;
    await search.submit('B');
    assert.equal(calls, 1);
    assert.deepEqual(published, [{ status: 'loading', query: 'A' }]);
  });
}

test('the current request publishes its actual failure', async () => {
  const failure = new Error('Unavailable');
  const published = [];
  const search = createLatestSearch(async () => { throw failure; }, state => published.push(state));
  await search.submit('A');
  assert.deepEqual(published.at(-1), { status: 'error', query: 'A', error: failure });
});

test('an invitation receipt remains available after refresh failure', async () => {
  const receipt = { id: 'invitation-1' };
  const refreshError = new Error('Member list unavailable');
  const calls = [];
  const outcome = await inviteMember('ada@example.test', {
    sendInvite: async email => { calls.push(['send', email]); return receipt; },
    reloadMembers: async () => { calls.push(['refresh']); throw refreshError; },
  });
  assert.deepEqual(outcome, { kind: 'confirmed-refresh-failed', receipt, refreshError });
  assert.deepEqual(calls, [['send', 'ada@example.test'], ['refresh']]);
});

test('write rejection never refreshes or fabricates a receipt', async () => {
  const failure = new Error('Invitation rejected');
  await assert.rejects(inviteMember('ada@example.test', {
    sendInvite: async () => { throw failure; },
    reloadMembers: () => assert.fail('rejected write must not refresh'),
  }), error => error === failure);
});

test('successful refresh returns the confirmed receipt and member list', async () => {
  const receipt = { id: 'invitation-1' };
  const members = [{ id: 'member-1' }];
  assert.deepEqual(await inviteMember('ada@example.test', {
    sendInvite: async () => receipt,
    reloadMembers: async () => members,
  }), { kind: 'confirmed', receipt, members });
});
