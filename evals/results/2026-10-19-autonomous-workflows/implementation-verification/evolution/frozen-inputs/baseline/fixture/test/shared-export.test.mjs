import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleToolbarExport } from '../src/toolbar.mjs';
import { handleKeyboardExport } from '../src/keyboard.mjs';

test('toolbar and keyboard expose one shared export workflow', () => {
  assert.equal(handleToolbarExport, handleKeyboardExport);
});
