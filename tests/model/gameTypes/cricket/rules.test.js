import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NUMBERS, createPlayers, dartError, findWinner, hasClosedAll, throwDart,
} from '../../../../src/model/gameTypes/cricket/rules.js';
import { dart, darts } from '../../../fixtures/cricket.js';

function throwAll(players, thrower, codes, variant = 'regular') {
  darts(codes).forEach((d) => throwDart(players, thrower, d, variant));
  return players;
}

const closeAll = (player) => NUMBERS.forEach((n) => { player.marks[n] = 3; });

test('dart validation: 15-20 and bull only, no triple bull', () => {
  assert.equal(dartError({ miss: true }), null);
  assert.equal(dartError(dart('T20')), null);
  assert.equal(dartError(dart('D25')), null);
  assert.equal(dartError(dart('T25')), 'There is no triple bull');
  assert.equal(dartError(dart('T14')), 'Only 15-20 and Bull count; record anything else as a miss');
  assert.equal(dartError({ n: 20, m: 4 }), 'A dart is a single, double or triple');
  assert.equal(dartError(undefined), 'Only 15-20 and Bull count; record anything else as a miss');
});

test('marks accumulate (single 1, double 2, triple 3) and close at 3', () => {
  const [a] = throwAll(createPlayers(2), 0, 'S20 S20');
  assert.equal(a.marks[20], 2);
  throwAll([a, createPlayers(1)[0]], 0, 'D20');
  assert.equal(a.marks[20], 3, 'capped at 3 once closed');
  const [b] = throwAll(createPlayers(2), 0, 'D25 S25');
  assert.equal(b.marks[25], 3);
});

test('marks beyond the third score while an opponent is open', () => {
  const players = throwAll(createPlayers(2), 0, 'S20 T20 T20');
  assert.equal(players[0].points, 20 + 60);
  assert.equal(players[0].countingMarks, 7);
  assert.equal(players[0].darts, 3);
});

test('bull extras are worth 25', () => {
  const players = throwAll(createPlayers(2), 0, 'D25 D25');
  assert.equal(players[0].points, 25);
});

test('no points once every opponent has closed the number; dead marks do not count', () => {
  const players = createPlayers(2);
  throwAll(players, 1, 'T20');
  throwAll(players, 0, 'T20 T20 M');
  assert.equal(players[0].points, 0);
  assert.equal(players[0].countingMarks, 3);
  assert.equal(players[0].darts, 3);
});

test('solo cricket never scores points', () => {
  const [solo] = throwAll(createPlayers(1), 0, 'T20 T20');
  assert.equal(solo.points, 0);
  assert.equal(solo.countingMarks, 3);
});

test('cut-throat: points go to every opponent with the number open', () => {
  const players = createPlayers(3);
  throwAll(players, 2, 'T19', 'cutThroat');
  throwAll(players, 0, 'T19 T19', 'cutThroat');
  assert.deepEqual(players.map((p) => p.points), [0, 57, 0]);
  assert.equal(players[0].countingMarks, 6);
});

test('regular win: all closed and points >= every opponent (a tie wins)', () => {
  const players = createPlayers(2);
  closeAll(players[0]);
  players[0].points = 10;
  players[1].points = 10;
  assert.equal(hasClosedAll(players[0]), true);
  assert.equal(findWinner(players, 0, 'regular'), 0);
  players[1].points = 11;
  assert.equal(findWinner(players, 0, 'regular'), null);
});

test('cut-throat win: all closed and points <= every opponent (a tie wins)', () => {
  const players = createPlayers(2);
  closeAll(players[0]);
  players[0].points = 10;
  players[1].points = 10;
  assert.equal(findWinner(players, 0, 'cutThroat'), 0);
  players[1].points = 9;
  assert.equal(findWinner(players, 0, 'cutThroat'), null);
});

test('cut-throat: a player can win on somebody else\'s dart', () => {
  const players = createPlayers(3);
  closeAll(players[1]);
  players[0].points = 60;
  players[1].points = 50;
  players[2].points = 30;
  assert.equal(findWinner(players, 0, 'cutThroat'), null);
  throwAll(players, 0, 'T20 T20', 'cutThroat');
  assert.deepEqual(players.map((p) => p.points), [60, 50, 90]);
  assert.equal(findWinner(players, 0, 'cutThroat'), 1);
});

test('nobody wins while numbers are open', () => {
  assert.equal(findWinner(createPlayers(2), 0, 'regular'), null);
});
