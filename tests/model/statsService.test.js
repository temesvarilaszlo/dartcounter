import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeFilterCount, allTimeStats, emptyFilters, filterGames, filterOptions, rankPlayers,
} from '../../src/model/statsService.js';
import { GameSession } from '../../src/model/session.js';
import { createRegistry } from '../../src/model/gameTypes/registry.js';
import { x01 } from '../../src/model/gameTypes/x01/index.js';
import { cricket } from '../../src/model/gameTypes/cricket/index.js';
import { CLOSE_ALL_FAST, cricketConfig, fullRegistry, throwTurns } from '../fixtures/cricket.js';
import { fixedClock, play, sequentialIds, x01Config } from '../fixtures/x01.js';
import { player } from '../fixtures/persistence.js';

const registry = fullRegistry();
const alice = player('a', 'Alice');
const bob = player('b', 'Bob');
const carol = player('c', 'Carol');
const local = (...parts) => new Date(...parts).toISOString();

// Plays a whole game through GameSession; `legs` holds each leg's input.
function record(id, typeId, config, playerIds, legs, playLeg, finishedAt) {
  const session = GameSession.create(typeId, { ...config, playerIds }, registry, { now: fixedClock(), newId: sequentialIds() });
  legs.forEach((leg, i) => {
    if (i > 0) session.startNextLeg();
    playLeg(session, leg);
  });
  return { ...session.finish(), id, finishedAt };
}

const x01Game = (id, playerIds, options, legs, finishedAt) => record(id, 'x01', x01Config(options), playerIds, legs, play, finishedAt);

// Newest first, like gameRepository.list().
const GAMES = [
  record('cricket', 'cricket', cricketConfig(), ['a', 'b'], [CLOSE_ALL_FAST], throwTurns, local(2026, 10, 10, 0, 0)),
  x01Game('setsLost', ['b', 'a'], {
    startScore: 101, outRule: 'straight', sets: { format: { mode: 'firstTo', value: 1 }, legsToWinSet: 1 },
  }, [[101]], local(2026, 10, 9, 23, 59)),
  x01Game('solo501', ['a'], { players: 1 }, [[180, 180, { score: 141, darts: 3 }]], local(2026, 10, 9, 0, 0)),
  x01Game('bestOf3', ['a', 'b'], { startScore: 101, outRule: 'straight', legs: { mode: 'bestOf', value: 3 } }, [
    [60, 100, { score: 41, darts: 2 }], // Alice starts and wins in 5 darts
    [101], // Bob starts and wins
    [101], // Alice starts and wins
  ], local(2026, 10, 8, 12, 0)),
];

const ids = (games) => games.map((g) => g.id);
const only = (filters) => ids(filterGames(GAMES, filters));

test('the fixture games are what they claim to be', () => {
  assert.deepEqual(GAMES.map((g) => g.result.winnerId), ['a', 'b', 'a', 'a']);
  assert.deepEqual(GAMES.at(-1).result.legsWon, { a: 2, b: 1 });
});

test('X01 all-time stats pool every leg of the player across games', () => {
  const stats = allTimeStats(GAMES, registry, 'x01', 'a');
  assert.equal(stats.gamesPlayed, 3);
  assert.equal(stats.gamesWon, 1, 'the solo win and the lost game do not count');
  assert.equal(stats.darts, 5 + 3 + 9);
  assert.equal(stats.points, 101 + 101 + 501);
  assert.equal(stats.average, (703 / 17) * 3);
  assert.equal(stats.count180, 2);
  assert.equal(stats.highestFinish, 141);
  assert.equal(stats.highestScore, 180);
  assert.equal(stats.legsWon, 3);
  assert.deepEqual(stats.buckets, {
    180: 2, '160-179': 0, '140-159': 1, '120-139': 0, '100-119': 1, '80-99': 0, '60-79': 1, '40-59': 1, '20-39': 0, '0-19': 0,
  });
  assert.deepEqual(stats.legsByStartScore, [
    { startScore: 101, bestLeg: 3, worstLeg: 5 },
    { startScore: 501, bestLeg: 9, worstLeg: 9 },
  ]);
  assert.equal('bestLeg' in stats, false, 'no single best leg across start scores');
});

test('X01 all-time for the second player, whose seat differs between games', () => {
  const stats = allTimeStats(GAMES, registry, 'x01', 'b');
  assert.equal(stats.gamesPlayed, 2);
  assert.equal(stats.gamesWon, 1);
  assert.equal(stats.darts, 6 + 3);
  assert.equal(stats.highestScore, 101);
  assert.deepEqual(stats.legsByStartScore, [{ startScore: 101, bestLeg: 3, worstLeg: 3 }]);
});

test('a start score played but never won lists no best or worst leg', () => {
  const lost = x01Game('lost', ['b', 'a'], { startScore: 201, outRule: 'straight' }, [[60, 0, 141]], local(2026, 10, 1));
  assert.deepEqual(allTimeStats([lost], registry, 'x01', 'a').legsByStartScore, [{ startScore: 201, bestLeg: null, worstLeg: null }]);
});

test('Cricket all-time stats', () => {
  assert.deepEqual(allTimeStats(GAMES, registry, 'cricket', 'a'), {
    gamesPlayed: 1, gamesWon: 1, darts: 8, marks: 21, points: 0, mpr: (21 / 8) * 3, legsWon: 1,
  });
  assert.deepEqual(allTimeStats(GAMES, registry, 'cricket', 'b'), {
    gamesPlayed: 1, gamesWon: 0, darts: 6, marks: 0, points: 0, mpr: 0, legsWon: 0,
  });
});

test('no games of the type for the player means an empty state', () => {
  assert.equal(allTimeStats(GAMES, registry, 'x01', 'c'), null);
  assert.equal(allTimeStats([], registry, 'cricket', 'a'), null);
});

test('player selector: players of the type, most games first, ties by name', () => {
  assert.deepEqual(rankPlayers(GAMES, [carol, bob, alice], 'x01').map((p) => [p.name, p.gamesPlayed]), [['Alice', 3], ['Bob', 2]]);
  assert.deepEqual(rankPlayers(GAMES, [carol, bob, alice], 'cricket').map((p) => p.name), ['Alice', 'Bob']);
  assert.deepEqual(rankPlayers([], [alice], 'x01'), []);
});

test('no filters keeps every game in order', () => {
  assert.deepEqual(only({}), ['cricket', 'setsLost', 'solo501', 'bestOf3']);
  assert.deepEqual(only(emptyFilters()), ['cricket', 'setsLost', 'solo501', 'bestOf3']);
  assert.deepEqual(filterGames([], { type: 'x01' }), []);
});

test('date range uses local day boundaries, both ends inclusive', () => {
  assert.deepEqual(only({ dateFrom: '2026-11-09', dateTo: '2026-11-09' }), ['setsLost', 'solo501']);
  assert.deepEqual(only({ dateFrom: '2026-11-10' }), ['cricket']);
  assert.deepEqual(only({ dateTo: '2026-11-08' }), ['bestOf3']);
  assert.deepEqual(only({ dateFrom: '2026-11-11' }), []);
});

test('type, players (all selected must play) and number of players', () => {
  assert.deepEqual(only({ type: 'x01' }), ['setsLost', 'solo501', 'bestOf3']);
  assert.deepEqual(only({ playerIds: ['a'] }), ['cricket', 'setsLost', 'solo501', 'bestOf3']);
  assert.deepEqual(only({ playerIds: ['a', 'b'] }), ['cricket', 'setsLost', 'bestOf3']);
  assert.deepEqual(only({ playerIds: ['c'] }), []);
  assert.deepEqual(only({ playerCounts: [1] }), ['solo501']);
  assert.deepEqual(only({ playerCounts: [1, 2] }).length, 4);
});

test('match format: sets on/off, mode and value of the deciding format', () => {
  assert.deepEqual(only({ sets: true }), ['setsLost']);
  assert.deepEqual(only({ sets: false }), ['cricket', 'solo501', 'bestOf3']);
  assert.deepEqual(only({ modes: ['bestOf'] }), ['bestOf3']);
  assert.deepEqual(only({ modes: ['firstTo'], sets: true }), ['setsLost']);
  assert.deepEqual(only({ values: [3] }), ['bestOf3']);
  assert.deepEqual(only({ values: [1] }), ['cricket', 'setsLost', 'solo501']);
});

test('type specific fields apply only together with their type', () => {
  assert.deepEqual(only({ type: 'x01', typeFields: { startScore: [501] } }), ['solo501']);
  assert.deepEqual(only({ type: 'x01', typeFields: { outRule: ['straight'], startScore: [] } }), ['setsLost', 'bestOf3']);
  assert.deepEqual(only({ typeFields: { startScore: [501] } }).length, 4, 'ignored without a type');
  assert.deepEqual(only({ type: 'cricket', typeFields: { variant: ['cutThroat'] } }), []);
  assert.deepEqual(only({ type: 'cricket', typeFields: { variant: ['regular'] } }), ['cricket']);
});

test('filters combine with AND', () => {
  assert.deepEqual(only({ type: 'x01', playerIds: ['b'], dateFrom: '2026-11-09' }), ['setsLost']);
});

test('active filter count: one per group, date range counts once', () => {
  assert.equal(activeFilterCount({}), 0);
  assert.equal(activeFilterCount(emptyFilters()), 0);
  assert.equal(activeFilterCount({ dateFrom: '2026-01-01', dateTo: '2026-02-01' }), 1);
  assert.equal(activeFilterCount({ sets: false, modes: ['bestOf'], values: [3], playerCounts: [2], playerIds: ['a'] }), 5);
  assert.equal(activeFilterCount({ type: 'x01', typeFields: { startScore: [501], inRule: [] } }), 2);
  assert.equal(activeFilterCount({ typeFields: { startScore: [501] } }), 0);
});

test('filter options only offer values that occur in the games', () => {
  const unplayed = { id: 'golf', label: 'Golf', filterFields: [] };
  const withExtra = createRegistry().register(x01).register(cricket).register(unplayed);
  const opts = filterOptions(GAMES, [carol, bob, alice], withExtra);
  assert.deepEqual(opts.types, [{ value: 'x01', label: 'X01' }, { value: 'cricket', label: 'Cricket' }]);
  assert.deepEqual(opts.players, [{ value: 'a', label: 'Alice' }, { value: 'b', label: 'Bob' }]);
  assert.deepEqual(opts.playerCounts, [{ value: 1, label: '1' }, { value: 2, label: '2' }]);
  assert.deepEqual(opts.sets, [{ value: false, label: 'Legs only' }, { value: true, label: 'Sets' }]);
  assert.deepEqual(opts.modes, [{ value: 'bestOf', label: 'Best of' }, { value: 'firstTo', label: 'First to' }]);
  assert.deepEqual(opts.values, [{ value: 1, label: '1' }, { value: 3, label: '3' }]);
  assert.deepEqual(opts.typeFields, []);
});

test('type specific filter options with labels', () => {
  assert.deepEqual(filterOptions(GAMES, [], registry, 'x01').typeFields, [
    { key: 'startScore', label: 'Start score', options: [{ value: 101, label: '101' }, { value: 501, label: '501' }] },
    { key: 'inRule', label: 'In', options: [{ value: 'straight', label: 'Straight in' }] },
    { key: 'outRule', label: 'Out', options: [{ value: 'double', label: 'Double out' }, { value: 'straight', label: 'Straight out' }] },
  ]);
  assert.deepEqual(filterOptions(GAMES, [], registry, 'cricket').typeFields, [
    { key: 'variant', label: 'Variant', options: [{ value: 'regular', label: 'Regular' }] },
  ]);
});
