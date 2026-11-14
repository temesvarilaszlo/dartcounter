import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCORE_BUCKETS, gameStats, legHistory, legStats, summarizeLegs,
} from '../../../../src/model/gameTypes/x01/stats.js';
import { countBuckets } from '../../../../src/model/common/statsMath.js';
import { x01Config } from '../../../fixtures/x01.js';

const turn = (playerIndex, score, darts = 3) => ({ playerIndex, score, darts });
const leg = (turns) => ({ index: 0, starterIndex: 0, winnerIndex: null, turns });

test('legStats: points, darts, average, first 9 and checkout per player', () => {
  const config = x01Config({ startScore: 301 });
  const [a, b] = legStats(config, leg([
    turn(0, 100), turn(1, 60), turn(0, 100), turn(1, 0), turn(0, 60), turn(1, 45), turn(0, 41, 2),
  ]));
  assert.equal(a.points, 301);
  assert.equal(a.darts, 11);
  assert.equal(a.won, true);
  assert.equal(a.checkout, 41);
  assert.equal(a.average.toFixed(2), '82.09');
  assert.equal(a.first9Points, 260);
  assert.equal(a.first9Darts, 9);
  assert.equal(a.first9Average.toFixed(2), '86.67');

  assert.equal(b.points, 105);
  assert.equal(b.won, false);
  assert.equal(b.checkout, null);
  assert.equal(b.average, 35);
});

test('first 9 uses the real dart count when a leg is won within 3 turns', () => {
  const [a] = legStats(x01Config({ startScore: 101 }), leg([turn(0, 60), turn(1, 0), turn(0, 41, 2)]));
  assert.equal(a.first9Darts, 5);
  assert.equal(a.first9Average, (101 / 5) * 3);
});

test('a player with no turns has null averages', () => {
  const [, b] = legStats(x01Config({ startScore: 101 }), leg([turn(0, 101)]));
  assert.equal(b.average, null);
  assert.equal(b.first9Average, null);
});

test('game averages are pooled across legs (66.8, not 75.15)', () => {
  const config = x01Config({ startScore: 501, players: 1 });
  const nineDarter = [180, 180, 141].map((s) => turn(0, s));
  const leg15 = [...Array(4).fill(turn(0, 100)), turn(0, 101)];
  const leg30 = [...Array(9).fill(turn(0, 50)), turn(0, 51)];
  const [stats] = gameStats(config, [leg(leg15), leg(leg30)]);
  assert.equal(stats.darts, 45);
  assert.equal(stats.average.toFixed(2), '66.80');
  assert.equal(stats.bestLeg, 15);
  assert.equal(stats.worstLeg, 30);
  assert.equal(stats.legsWon, 2);
  assert.equal(stats.highestFinish, 101);
  assert.equal(stats.highestScore, 101);

  const [withNine] = gameStats(config, [leg(nineDarter), leg(leg30)]);
  assert.equal(withNine.bestLeg, 9);
  assert.equal(withNine.highestFinish, 141);
  assert.equal(withNine.highestScore, 180);
  assert.equal(withNine.buckets['180'], 2);
});

test('lost legs do not count toward best/worst leg or highest finish', () => {
  const config = x01Config({ startScore: 101 });
  const [, b] = gameStats(config, [leg([turn(0, 60), turn(1, 100), turn(0, 41)])]);
  assert.equal(b.legsWon, 0);
  assert.equal(b.bestLeg, null);
  assert.equal(b.worstLeg, null);
  assert.equal(b.highestFinish, null);
  assert.equal(b.highestScore, 100);
});

test('summarizeLegs of nothing is empty', () => {
  const empty = summarizeLegs([]);
  assert.equal(empty.average, null);
  assert.equal(empty.highestScore, null);
  assert.equal(empty.buckets['0-19'], 0);
});

test('score buckets: every boundary lands in the right bucket', () => {
  const edges = [180, 179, 160, 159, 140, 139, 120, 119, 100, 99, 80, 79, 60, 59, 40, 39, 20, 19, 0];
  assert.deepEqual(countBuckets(edges, SCORE_BUCKETS), {
    180: 1,
    '160-179': 2,
    '140-159': 2,
    '120-139': 2,
    '100-119': 2,
    '80-99': 2,
    '60-79': 2,
    '40-59': 2,
    '20-39': 2,
    '0-19': 2,
  });
});

test('scoreboard: live per-seat numbers of the current leg', async () => {
  const { scoreboard } = await import('../../../../src/model/gameTypes/x01/stats.js');
  const { newX01Session, play } = await import('../../../fixtures/x01.js');
  const session = newX01Session({ inRule: 'double' });
  play(session, [0, 60]);
  assert.deepEqual(scoreboard(session.state), [
    { remaining: 501, isIn: false, darts: 3, average: 0, matchAverage: 0, lastScore: 0, checkout: null },
    { remaining: 441, isIn: true, darts: 3, average: 60, matchAverage: 60, lastScore: 60, checkout: null },
  ]);
  play(session, [100]);
  assert.equal(scoreboard(session.state)[0].lastScore, 100);
});

test('scoreboard: checkout route follows the in and out rules', async () => {
  const { scoreboard } = await import('../../../../src/model/gameTypes/x01/stats.js');
  const { newX01Session, play } = await import('../../../fixtures/x01.js');
  const doubleOut = newX01Session({ startScore: 101 });
  assert.deepEqual(scoreboard(doubleOut.state).map((r) => r.checkout), [['T20', '9', 'D16'], ['T20', '9', 'D16']]);
  play(doubleOut, [41]);
  assert.deepEqual(scoreboard(doubleOut.state)[0].checkout, ['20', 'D20']);
  const straightOut = newX01Session({ startScore: 101, outRule: 'straight' });
  play(straightOut, [41]);
  assert.deepEqual(scoreboard(straightOut.state)[0].checkout, ['T20']);
  const doubleIn = newX01Session({ startScore: 101, inRule: 'double' });
  assert.deepEqual(scoreboard(doubleIn.state)[0].checkout, ['Bull', '19', 'D16']);
});

test('scoreboard: match average pools every leg played so far', async () => {
  const { scoreboard } = await import('../../../../src/model/gameTypes/x01/stats.js');
  const { newX01Session, play } = await import('../../../fixtures/x01.js');
  const session = newX01Session({ startScore: 101, legs: { mode: 'firstTo', value: 2 } });
  // Leg 1: A 60, B 20, A 41 in 2 darts -> A 101 points / 5 darts, B 20 / 3.
  play(session, [60, 20]);
  session.submitTurn({ playerIndex: 0, score: 41, darts: 2 });
  session.startNextLeg();
  // Leg 2 (B starts): B 80, A 30.
  play(session, [80, 30]);
  const [a, b] = scoreboard(session.state);
  assert.equal(a.average, 30);
  assert.equal(a.matchAverage, (131 / 8) * 3);
  assert.equal(b.average, 80);
  assert.equal(b.matchAverage, 50);
});

test('legHistory: rounds of remaining and scored per player, null once the leg is over', () => {
  const config = x01Config({ startScore: 301 });
  const rows = legHistory(config, leg([turn(0, 100), turn(1, 60), turn(0, 140), turn(1, 0), turn(0, 61, 2)]));
  assert.deepEqual(rows, [
    [{ score: 100, remaining: 201, darts: 3 }, { score: 60, remaining: 241, darts: 3 }],
    [{ score: 140, remaining: 61, darts: 3 }, { score: 0, remaining: 241, darts: 3 }],
    [{ score: 61, remaining: 0, darts: 2 }, null],
  ]);
});

test('legHistory follows the throw order when the second seat starts', () => {
  const rows = legHistory(x01Config({ startScore: 101 }), { ...leg([turn(1, 101)]), starterIndex: 1 });
  assert.deepEqual(rows, [[null, { score: 101, remaining: 0, darts: 3 }]]);
  assert.deepEqual(legHistory(x01Config(), leg([])), []);
});
