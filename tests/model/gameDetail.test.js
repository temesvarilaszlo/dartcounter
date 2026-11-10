import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGameDetail, scoreLine } from '../../src/model/gameDetail.js';
import { x01 } from '../../src/model/gameTypes/x01/index.js';
import { newX01Session, play, QUICK } from '../fixtures/x01.js';

function finished(options, legs) {
  const session = newX01Session({ ...QUICK, ...options });
  legs.forEach((turns, i) => {
    if (i > 0) session.startNextLeg();
    play(session, turns);
  });
  return session.finish();
}

test('game detail: game stats, and per leg its set position, winner, stats and history', () => {
  const game = finished({ sets: { format: { mode: 'firstTo', value: 2 }, legsToWinSet: 1 } }, [[101], [101], [101]]);
  const detail = buildGameDetail(game, x01);
  assert.deepEqual(detail.stats, x01.gameStats(game.config, game.legs));
  assert.deepEqual(detail.legs.map((l) => [l.index, l.setIndex, l.legIndexInSet, l.winnerIndex, l.setWinnerIndex]), [
    [0, 0, 0, 0, 0],
    [1, 1, 0, 1, 1],
    [2, 2, 0, 0, 0],
  ]);
  assert.deepEqual(detail.legs[1].stats, x01.legStats(game.config, game.legs[1]));
  assert.deepEqual(detail.legs[1].history, [[null, { score: 101, remaining: 0, darts: 3 }]]);
});

test('score line counts legs without sets and sets with them, in seat order', () => {
  const legsGame = finished({ legs: { mode: 'bestOf', value: 3 } }, [[101], [101], [101]]);
  assert.deepEqual(scoreLine(legsGame), {
    unit: 'legs',
    players: [{ id: 'p-a', count: 2, winner: true }, { id: 'p-b', count: 1, winner: false }],
  });
  const setsGame = finished({ sets: { format: { mode: 'firstTo', value: 1 }, legsToWinSet: 1 } }, [[101]]);
  assert.deepEqual(scoreLine(setsGame).unit, 'sets');
  assert.deepEqual(scoreLine(setsGame).players.map((p) => p.count), [1, 0]);
});

test('score line tolerates a player missing from the stored counts', () => {
  const game = finished({}, [[101]]);
  delete game.result.legsWon['p-b'];
  assert.equal(scoreLine(game).players[1].count, 0);
});
