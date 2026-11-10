import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActiveGameStore, createLastConfigStore } from '../../../src/model/persistence/activeGameStore.js';
import { memoryStorage } from '../../fixtures/persistence.js';
import { newX01Session, play } from '../../fixtures/x01.js';

const KEY = 'dartcounter.activeGame.v1';

test('write, read back and clear the in-progress game', () => {
  const storage = memoryStorage();
  const store = createActiveGameStore(storage);
  assert.deepEqual(store.load(), { status: 'none' });

  const session = newX01Session();
  play(session, [60]);
  const snapshot = session.snapshot();
  store.save(snapshot);
  assert.deepEqual(store.load(), { status: 'ok', snapshot: JSON.parse(JSON.stringify(snapshot)) });
  assert.ok(storage.getItem(KEY));

  store.clear();
  assert.deepEqual(store.load(), { status: 'none' });
});

test('unparseable or unusable data is reported as corrupt and discarded', () => {
  const valid = JSON.stringify(newX01Session().snapshot());
  const broken = [
    '{not json',
    'null',
    '[]',
    '42',
    JSON.stringify({ ...JSON.parse(valid), schemaVersion: 2 }),
    JSON.stringify({ ...JSON.parse(valid), type: 7 }),
    JSON.stringify({ ...JSON.parse(valid), config: null }),
    JSON.stringify({ ...JSON.parse(valid), legs: [] }),
    JSON.stringify({ ...JSON.parse(valid), legs: 'x' }),
  ];
  for (const text of broken) {
    const storage = memoryStorage({ [KEY]: text });
    assert.deepEqual(createActiveGameStore(storage).load(), { status: 'corrupt' }, text);
    assert.equal(storage.getItem(KEY), null, 'discarded');
  }
});

test('lastConfig round-trips per game type, keeping player order', () => {
  const storage = memoryStorage();
  const store = createLastConfigStore(storage);
  assert.equal(store.get('x01'), null);

  const x01Values = {
    players: [{ id: 'b', name: 'Bob' }, { id: 'a', name: 'Alice' }],
    sets: { enabled: false },
    typeConfig: { startScore: 301, inRule: 'double', outRule: 'double' },
  };
  store.set('x01', x01Values);
  store.set('cricket', { players: [{ name: 'Cid' }], typeConfig: { variant: 'cutThroat' } });

  const reread = createLastConfigStore(storage);
  assert.deepEqual(reread.get('x01'), x01Values);
  assert.deepEqual(reread.get('x01').players.map((p) => p.name), ['Bob', 'Alice']);
  assert.equal(reread.get('cricket').typeConfig.variant, 'cutThroat');
});

test('unreadable lastConfig means no prefill and is overwritten on the next save', () => {
  for (const text of ['{oops', 'null', JSON.stringify({ schemaVersion: 99, byType: { x01: {} } }), JSON.stringify({ schemaVersion: 1 })]) {
    const storage = memoryStorage({ 'dartcounter.lastConfig.v1': text });
    const store = createLastConfigStore(storage);
    assert.equal(store.get('x01'), null, text);
    store.set('x01', { a: 1 });
    assert.deepEqual(store.get('x01'), { a: 1 });
  }
});
