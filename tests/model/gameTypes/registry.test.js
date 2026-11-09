import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../../../src/model/gameTypes/registry.js';

test('registers, gets and lists game types in registration order', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const registry = createRegistry().register(a).register(b);
  assert.equal(registry.get('a'), a);
  assert.equal(registry.has('b'), true);
  assert.equal(registry.has('c'), false);
  assert.deepEqual(registry.list(), [a, b]);
});

test('rejects duplicate ids, missing ids and unknown lookups', () => {
  const registry = createRegistry().register({ id: 'a' });
  assert.throws(() => registry.register({ id: 'a' }), /already registered/);
  assert.throws(() => registry.register({}), /needs an id/);
  assert.throws(() => registry.register(undefined), /needs an id/);
  assert.throws(() => registry.get('zzz'), /Unknown game type "zzz"/);
});
