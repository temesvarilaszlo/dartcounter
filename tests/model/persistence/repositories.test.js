import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { openDatabase } from '../../../src/model/persistence/idb.js';
import { createGameRepository } from '../../../src/model/persistence/gameRepository.js';
import { createPlayerRepository } from '../../../src/model/persistence/playerRepository.js';
import { createMemoryRepositories } from '../../../src/model/persistence/memoryRepositories.js';
import { game, player } from '../../fixtures/persistence.js';

const implementations = {
  IndexedDB: async () => {
    const db = await openDatabase(new IDBFactory());
    return { games: createGameRepository(db), players: createPlayerRepository(db) };
  },
  memory: async () => createMemoryRepositories(),
};

// The same contract for both implementations, so the in-memory fakes stay a
// faithful reference.
for (const [name, create] of Object.entries(implementations)) {
  describe(`${name} repositories`, () => {
    const alice = player('a', 'Alice');
    const bob = player('b', 'Bob');

    test('a game is saved together with its new players', async () => {
      const { games, players } = await create();
      await games.save(game('g1', ['a', 'b']), [alice, bob]);
      assert.deepEqual(await games.get('g1'), game('g1', ['a', 'b']));
      assert.deepEqual(await players.get('a'), alice);
      assert.deepEqual(await players.findByNameKey('bob'), bob);
      assert.equal((await players.list()).length, 2);
    });

    test('missing records read as null', async () => {
      const { games, players } = await create();
      assert.equal(await games.get('nope'), null);
      assert.equal(await players.get('nope'), null);
      assert.equal(await players.findByNameKey('nope'), null);
      assert.deepEqual(await games.list(), []);
    });

    test('list returns the newest game first', async () => {
      const { games } = await create();
      await games.save(game('old', ['a'], '2026-01-01T10:00:00.000Z'), [alice]);
      await games.save(game('new', ['a'], '2026-03-01T10:00:00.000Z'));
      await games.save(game('mid', ['a'], '2026-02-01T10:00:00.000Z'));
      assert.deepEqual((await games.list()).map((g) => g.id), ['new', 'mid', 'old']);
    });

    test('a taken nameKey aborts the whole write: no game, no players', async () => {
      const { games, players } = await create();
      await games.save(game('g1', ['a']), [alice]);
      const impostor = player('x', 'ALICE');
      await assert.rejects(games.save(game('g2', ['x', 'b']), [bob, impostor]));
      assert.equal(await games.get('g2'), null);
      assert.equal(await players.get('b'), null);
      assert.equal((await players.list()).length, 1);
    });

    test('saving an existing player again is fine', async () => {
      const { games, players } = await create();
      await games.saveAll({ games: [game('g1', ['a'])], players: [alice] });
      await games.saveAll({ games: [game('g2', ['a'])], players: [alice] });
      assert.equal((await players.list()).length, 1);
      assert.equal((await games.list()).length, 2);
    });

    test('delete removes only the game', async () => {
      const { games, players } = await create();
      await games.save(game('g1', ['a']), [alice]);
      await games.delete('g1');
      await games.delete('never-existed');
      assert.equal(await games.get('g1'), null);
      assert.deepEqual(await players.get('a'), alice);
    });

    test('stored records are copies, not live references', async () => {
      const { games } = await create();
      const record = game('g1', ['a']);
      await games.save(record, [alice]);
      record.result.winnerId = 'tampered';
      const read = await games.get('g1');
      assert.equal(read.result.winnerId, 'a');
      read.result.winnerId = 'tampered';
      assert.equal((await games.get('g1')).result.winnerId, 'a');
    });
  });
}
