import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDraftController } from '../src/community/controllers/draft.mjs';
import { createPublishController } from '../src/community/controllers/publish.mjs';
test('failed publish can be retried', async () => {
  const draft = createDraftController({ title: 'Release A', category: 'general' });
  let attempts = 0;
  const publish = createPublishController({ async publish() {
    if (++attempts === 1) throw new Error('network');
  } }, draft);
  await publish.submit();
  assert.equal(publish.snapshot.canRetry, true);
  await publish.retry();
  assert.equal(attempts, 2);
  assert.equal(publish.snapshot.error, null);
});
