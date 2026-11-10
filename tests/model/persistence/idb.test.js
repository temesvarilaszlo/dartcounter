import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { migrations, openDatabase, requestResult } from '../../../src/model/persistence/idb.js';
import { createGameRepository } from '../../../src/model/persistence/gameRepository.js';
import { game, player } from '../../fixtures/persistence.js';

test('version 1 creates the players and games stores with their indexes', async () => {
  const db = await openDatabase(new IDBFactory());
  assert.equal(db.version, 1);
  assert.deepEqual([...db.objectStoreNames].sort(), ['games', 'players']);
  const tx = db.transaction(['games', 'players']);
  assert.deepEqual([...tx.objectStore('players').indexNames], ['nameKey']);
  assert.equal(tx.objectStore('players').index('nameKey').unique, true);
  assert.deepEqual([...tx.objectStore('games').indexNames].sort(), ['finishedAt', 'playerIds', 'type']);
  assert.equal(tx.objectStore('games').index('playerIds').multiEntry, true);
  db.close();
});

test('the multiEntry playerIds index finds every game of a player', async () => {
  const db = await openDatabase(new IDBFactory());
  const games = createGameRepository(db);
  await games.save(game('g1', ['a', 'b']), [player('a', 'Alice'), player('b', 'Bob')]);
  await games.save(game('g2', ['b']));
  const index = db.transaction('games').objectStore('games').index('playerIds');
  const ofBob = await requestResult(index.getAll('b'));
  assert.deepEqual(ofBob.map((g) => g.id).sort(), ['g1', 'g2']);
  db.close();
});

test('upgrading a version 1 database with data runs only the new steps and keeps the data', async () => {
  const factory = new IDBFactory();
  const v1 = await openDatabase(factory);
  await createGameRepository(v1).save(game('fixture', ['a']), [player('a', 'Alice')]);
  v1.close();

  const ran = [];
  const steps = {
    ...migrations,
    1: () => ran.push(1),
    2: (db, tx) => {
      ran.push(2);
      tx.objectStore('games').createIndex('startedAt', 'startedAt');
    },
  };
  const v2 = await openDatabase(factory, { version: 2, steps });
  assert.deepEqual(ran, [2]);
  assert.equal(v2.version, 2);
  assert.ok([...v2.transaction('games').objectStore('games').indexNames].includes('startedAt'));
  assert.equal((await createGameRepository(v2).get('fixture')).id, 'fixture');
  v2.close();
});

test('a failing migration rejects the open', async () => {
  const steps = { 1: () => { throw new Error('boom'); } };
  await assert.rejects(openDatabase(new IDBFactory(), { steps }));
});

test('an open database closes itself when another tab upgrades the schema', async () => {
  const factory = new IDBFactory();
  const v1 = await openDatabase(factory);
  const v2 = await openDatabase(factory, { version: 2, steps: { ...migrations, 2: () => {} } });
  assert.equal(v2.version, 2);
  v2.close();
  assert.throws(() => v1.transaction('games'));
});
