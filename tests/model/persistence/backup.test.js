import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, exportFileName, parseBackup, planImport } from '../../../src/model/persistence/backup.js';
import { createMemoryRepositories } from '../../../src/model/persistence/memoryRepositories.js';
import { game, player } from '../../fixtures/persistence.js';
import { fixedClock } from '../../fixtures/x01.js';

const alice = player('a', 'Alice');
const bob = player('b', 'Bob');

async function seeded() {
  const repos = createMemoryRepositories();
  await repos.games.save(game('g1', ['a', 'b']), [alice, bob]);
  return repos;
}

async function exportText(repos) {
  const data = buildExport({ players: await repos.players.list(), games: await repos.games.list(), now: fixedClock() });
  return JSON.stringify(data);
}

test('export contains everything, stamped with app, schema version and time', async () => {
  const data = JSON.parse(await exportText(await seeded()));
  assert.equal(data.app, 'dartcounter');
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.exportedAt, '2026-11-09T20:00:01.000Z');
  assert.equal(data.players.length, 2);
  assert.deepEqual(data.games.map((g) => g.id), ['g1']);
});

test('the file name uses the local date', () => {
  assert.equal(exportFileName(new Date(2026, 0, 5, 23, 59)), 'dartcounter-2026-01-05.json');
  assert.equal(exportFileName(new Date(2026, 10, 10, 0, 1)), 'dartcounter-2026-11-10.json');
});

test('export then import into an empty app restores everything', async () => {
  const text = await exportText(await seeded());
  const fresh = createMemoryRepositories();
  const parsed = parseBackup(text);
  assert.equal(parsed.ok, true);
  const plan = planImport(parsed.data, { players: await fresh.players.list(), games: await fresh.games.list() });
  assert.deepEqual(plan.skippedGames, 0);
  assert.deepEqual(plan.mergedPlayers, 0);
  await fresh.games.saveAll(plan);
  assert.deepEqual(await fresh.games.get('g1'), game('g1', ['a', 'b']));
  assert.equal((await fresh.players.list()).length, 2);
});

test('importing the same file twice skips games that already exist', async () => {
  const repos = await seeded();
  const { data } = parseBackup(await exportText(repos));
  const plan = planImport(data, { players: await repos.players.list(), games: await repos.games.list() });
  assert.deepEqual(plan, { games: [], players: [], skippedGames: 1, mergedPlayers: 0 });
});

test('an imported player matching an existing name under another id is merged and the games are remapped', async () => {
  const phone = createMemoryRepositories();
  await phone.games.save(game('g-phone', ['a']), [alice]);

  const otherAlice = player('alice-2', 'ALICE');
  const carol = player('c', 'Carol');
  const imported = game('g-other', ['alice-2', 'c']);
  const { data } = parseBackup(JSON.stringify(buildExport({ players: [otherAlice, carol], games: [imported], now: fixedClock() })));

  const plan = planImport(data, { players: await phone.players.list(), games: await phone.games.list() });
  assert.equal(plan.mergedPlayers, 1);
  assert.deepEqual(plan.players, [carol]);
  const [remapped] = plan.games;
  assert.deepEqual(remapped.config.playerIds, ['a', 'c']);
  assert.deepEqual(remapped.result, { winnerId: 'a', setsWon: { a: 0, c: 0 }, legsWon: { a: 1, c: 0 } });

  await phone.games.saveAll(plan);
  assert.equal((await phone.players.list()).length, 2);
  assert.equal((await phone.games.list()).length, 2);
});

test('players without any imported game are not added; a game without a winner keeps null', () => {
  const lonely = player('l', 'Lonely');
  const drawless = { ...game('g', ['a']), result: { winnerId: null, setsWon: { a: 0 }, legsWon: { a: 0 } } };
  const plan = planImport(
    { players: [alice, lonely], games: [drawless] },
    { players: [], games: [] },
  );
  assert.deepEqual(plan.players, [alice]);
  assert.equal(plan.games[0].result.winnerId, null);
});

test('remapping tolerates results without set or leg counts', () => {
  const sparse = { ...game('g', ['x']), result: { winnerId: 'x' } };
  const plan = planImport({ players: [player('x', 'Alice')], games: [sparse] }, { players: [alice], games: [] });
  assert.deepEqual(plan.games[0].result, { winnerId: 'a', setsWon: {}, legsWon: {} });
});

test('bad files are rejected with a clear message', () => {
  const valid = buildExport({ players: [alice], games: [game('g', ['a'])], now: fixedClock() });
  const notBackup = 'This file is not a Dart Counter backup';
  const cases = [
    ['{nope', notBackup],
    ['null', notBackup],
    [JSON.stringify({ ...valid, app: 'other' }), notBackup],
    [JSON.stringify({ ...valid, schemaVersion: 0 }), notBackup],
    [JSON.stringify({ ...valid, schemaVersion: '1' }), notBackup],
    [JSON.stringify({ ...valid, players: 'x' }), `${notBackup}: some players or games are malformed`],
    [JSON.stringify({ ...valid, games: undefined }), `${notBackup}: some players or games are malformed`],
    [JSON.stringify({ ...valid, players: [{ id: 'a', name: '' , nameKey: '' }] }), `${notBackup}: some players or games are malformed`],
    [JSON.stringify({ ...valid, games: [{ ...game('g', ['a']), legs: null }] }), `${notBackup}: some players or games are malformed`],
    [JSON.stringify({ ...valid, games: [{ ...game('g', ['a']), result: null }] }), `${notBackup}: some players or games are malformed`],
    [JSON.stringify({ ...valid, games: [{ ...game('g', ['a']), config: {} }] }), `${notBackup}: some players or games are malformed`],
    [JSON.stringify({ ...valid, games: [game('g', ['a', 'ghost'])] }), `${notBackup}: a game refers to a player that is not in the file`],
  ];
  for (const [text, error] of cases) {
    assert.deepEqual(parseBackup(text), { ok: false, error }, text.slice(0, 60));
  }
});

test('files from a newer schema version are rejected', () => {
  const newer = JSON.stringify({ ...buildExport({ players: [], games: [], now: fixedClock() }), schemaVersion: 2 });
  assert.deepEqual(parseBackup(newer), {
    ok: false, error: 'This backup comes from a newer version of the app. Update the app, then import again.',
  });
});
