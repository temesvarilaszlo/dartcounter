import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gameStats, gameStatsRows, legHistory, legStats, summarizeLegs,
} from '../../../../src/model/gameTypes/cricket/stats.js';
import { cricketConfig, darts } from '../../../fixtures/cricket.js';

const leg = (turns) => ({
  index: 0,
  starterIndex: 0,
  winnerIndex: null,
  turns: turns.map((codes, i) => ({ playerIndex: i % 2, darts: darts(codes) })),
});

// Player 1 closes everything in 8 darts (21 marks) while player 2 misses.
const fastLeg = leg(['T20 T19 T18', 'M M M', 'T17 T16 T15', 'M M M', 'D25 S25']);

test('MPR is marks / darts x 3 and counts a mid-turn win with its real darts', () => {
  const [a, b] = legStats(cricketConfig(), fastLeg);
  assert.deepEqual(a, { darts: 8, marks: 21, points: 0, won: true, mpr: (21 / 8) * 3 });
  assert.deepEqual(b, { darts: 6, marks: 0, points: 0, won: false, mpr: 0 });
});

test('scoring marks count toward MPR, dead marks do not', () => {
  // Player 2's second T20 lands after both players closed 20: dead.
  const [a, b] = legStats(cricketConfig(), leg(['T20 T20 M', 'T20 T20 M']));
  assert.deepEqual([a.marks, a.points], [6, 60]);
  assert.deepEqual([b.marks, b.points, b.darts], [3, 0, 3]);
});

test('a player who never threw has no MPR', () => {
  const [, b] = legStats(cricketConfig(), leg(['T20']));
  assert.equal(b.mpr, null);
});

test('game stats pool marks and darts across legs', () => {
  const second = leg(['T20 T20 T20', 'M M M']);
  const [a] = gameStats(cricketConfig(), [fastLeg, second]);
  assert.equal(a.darts, 11);
  assert.equal(a.marks, 21 + 9);
  assert.equal(a.points, 120);
  assert.equal(a.mpr, (30 / 11) * 3);
  assert.equal(a.legsWon, 1);
});

test('summary of no legs and the detail rows', () => {
  assert.deepEqual(summarizeLegs([]), { darts: 0, marks: 0, points: 0, mpr: null, legsWon: 0 });
  assert.deepEqual(gameStatsRows.map((r) => r.label), ['MPR', 'Total marks', 'Total points']);
});

test('scoreboard and board: live marks, points, MPR, dead numbers and pending darts', async () => {
  const { scoreboard, board } = await import('../../../../src/model/gameTypes/cricket/stats.js');
  const { newCricketSession, throwTurns, dart } = await import('../../../fixtures/cricket.js');
  const session = newCricketSession();
  throwTurns(session, ['T20 S20 M', 'T20 D19']);
  session.addDart(dart('S20'));
  const [a, b] = scoreboard(session.state);
  assert.equal(a.marks[20], 3);
  assert.equal(a.points, 20);
  assert.equal(a.darts, 4, 'the pending dart counts');
  assert.equal(a.mpr, 3, 'the pending dart hit a dead 20: no mark');
  assert.deepEqual([b.marks[20], b.marks[19], b.points, b.darts], [3, 2, 0, 3]);
  assert.equal(b.mpr, 5);

  const view = board(session.state);
  assert.deepEqual(view.numbers.map((x) => x.n), [20, 19, 18, 17, 16, 15, 25]);
  assert.deepEqual(view.numbers.filter((x) => x.dead).map((x) => x.n), [20]);
  assert.deepEqual(view.pendingDarts, [{ n: 20, m: 1 }]);
});

test('legHistory: darts, counting marks and running points per round', () => {
  const rows = legHistory(cricketConfig(), leg(['T20 T20 M', 'S20 M M', 'T20 M M', 'D20 S20 M']));
  assert.deepEqual(rows.map((round) => round.map((cell) => [cell.marks, cell.points])), [
    [[6, 60], [1, 0]],
    [[3, 120], [2, 0]],
  ]);
  assert.deepEqual(rows[0][0].darts, darts('T20 T20 M'));
});

test('legHistory: cut-throat points land on the opponent; unplayed seats are null', () => {
  const rows = legHistory(cricketConfig({ variant: 'cutThroat' }), leg(['T20 T20 M', 'M M M', 'D25 S25 M']));
  assert.deepEqual(rows.map((round) => round.map((cell) => cell && cell.points)), [[0, 60], [0, null]]);
});
