import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomId } from '../../../src/model/common/ids.js';

test('randomId returns distinct UUIDs', () => {
  const a = randomId();
  assert.match(a, /^[0-9a-f-]{36}$/);
  assert.notEqual(a, randomId());
});
