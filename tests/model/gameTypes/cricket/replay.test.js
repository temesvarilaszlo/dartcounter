import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession, buildResult } from '../../../../src/model/session.js';
import { applyTurn, replay } from '../../../../src/model/gameTypes/cricket/replay.js';
import {
  CLOSE_ALL_FAST, cricketConfig, dart, darts, fullRegistry, newCricketSession, throwTurns,
} from '../../../fixtures/cricket.js';
import { newX01Session } from '../../../fixtures/x01.js';

const emptyLeg = () => [{ index: 0, starterIndex: 0, winnerIndex: null, turns: [] }];
const marksOf = (state, seat) => state.leg.players[seat].marks;

test('darts show up immediately while the turn is pending', () => {
  const session = newCricketSession();
  session.addDart(dart('T20'));
  session.addDart(dart('S19'));
  assert.equal(session.state.currentPlayerIndex, 0);
  assert.equal(marksOf(session.state, 0)[20], 3);
  assert.deepEqual(session.state.leg.pendingDarts, darts('T20 S19'));
  assert.deepEqual(session.legs[0].turns, []);

  session.addDart(dart('M'));
  assert.equal(session.pendingTurn, null);
  assert.equal(session.state.currentPlayerIndex, 1);
  assert.deepEqual(session.legs[0].turns, [{ playerIndex: 0, darts: darts('T20 S19 M') }]);
  assert.deepEqual(session.state.leg.pendingDarts, []);
});

test('"Next player" fills the remaining darts with misses', () => {
  const session = newCricketSession();
  session.addDart(dart('S15'));
  session.endTurn();
  session.endTurn();
  assert.deepEqual(session.legs[0].turns, [
    { playerIndex: 0, darts: darts('S15 M M') },
    { playerIndex: 1, darts: darts('M M M') },
  ]);
  assert.equal(session.state.leg.players[0].darts, 3);
  assert.equal(session.state.currentPlayerIndex, 0);
});

test('the leg ends mid-turn on the closing dart (tie on points wins)', () => {
  const session = newCricketSession();
  throwTurns(session, CLOSE_ALL_FAST);
  assert.equal(session.state.phase, 'gameComplete');
  assert.equal(session.state.winnerIndex, 0);
  assert.deepEqual(session.legs[0].turns.at(-1), { playerIndex: 0, darts: darts('D25 S25') });
  assert.equal(session.legs[0].winnerIndex, 0);
  assert.equal(session.state.leg.players[0].darts, 8);
  assert.throws(() => session.addDart(dart('S20')), /The leg is over/);
  assert.throws(() => session.endTurn(), /The leg is over/);
});

test('closing everything while behind on points does not win', () => {
  const session = newCricketSession();
  throwTurns(session, ['', 'T20 T20 M', 'T20 T19 T18', '', 'T17 T16 T15', '', 'D25 S25 M']);
  assert.equal(session.state.leg.players[1].points, 60);
  assert.equal(session.state.phase, 'playing');
  assert.equal(session.state.currentPlayerIndex, 1);
});

test('cut-throat: closing all with the lowest points wins', () => {
  const session = newCricketSession({ variant: 'cutThroat' });
  throwTurns(session, ['T20 T20 M', '', 'T19 T18 T17', '', 'T16 T15 D25', '', 'S25']);
  assert.equal(session.state.leg.players[1].points, 60);
  assert.equal(session.state.phase, 'gameComplete');
  assert.equal(session.state.winnerIndex, 0);
});

test('solo cricket: the leg ends when every number is closed', () => {
  const session = newCricketSession({ players: 1 });
  throwTurns(session, ['T20 T19 T18', 'T17 T16 T15', 'D25 S25']);
  assert.equal(session.state.phase, 'gameComplete');
  assert.equal(session.finish().result.winnerId, 'p-a');
});

test('three players rotate turns and the next leg is started by the next seat', () => {
  const config = cricketConfig({ players: 3, legs: { mode: 'firstTo', value: 2 } });
  const session = new GameSession({
    type: fullRegistry().get('cricket'), config, legs: emptyLeg(), startedAt: 'x', pendingTurn: null,
  });
  throwTurns(session, ['', '', '']);
  assert.equal(session.state.currentPlayerIndex, 0);
  throwTurns(session, ['T20 T19 T18', '', '', 'T17 T16 T15', '', '', 'D25 S25']);
  assert.equal(session.state.phase, 'legComplete');
  session.startNextLeg();
  assert.equal(session.state.currentPlayerIndex, 1);
});

test('evaluateInput validates a dart', () => {
  const session = newCricketSession();
  assert.deepEqual(session.evaluateInput(dart('T20')), { valid: true });
  assert.deepEqual(session.evaluateInput(dart('T25')), { valid: false, error: 'There is no triple bull' });
  assert.throws(() => session.addDart(dart('T25')), /no triple bull/);
  throwTurns(session, CLOSE_ALL_FAST);
  assert.deepEqual(session.evaluateInput(dart('T20')), { valid: false, error: 'The leg is over' });
});

test('applyTurn rejects malformed turns', () => {
  const config = cricketConfig();
  const legs = emptyLeg();
  assert.throws(() => applyTurn(config, legs, { playerIndex: 1, darts: darts('M M M') }), /not this player's turn/);
  assert.throws(() => applyTurn(config, legs, { playerIndex: 0, darts: [] }), /1 to 3 darts/);
  assert.throws(() => applyTurn(config, legs, { playerIndex: 0, darts: darts('M M M M') }), /1 to 3 darts/);
  assert.throws(() => applyTurn(config, legs, { playerIndex: 0, darts: darts('M T14 M') }), /Only 15-20/);
  assert.throws(() => applyTurn(config, legs, { playerIndex: 0, darts: darts('T20 M') }), /3 darts unless it wins/);
});

test('applyTurn rejects darts after the leg was won and turns after the leg ended', () => {
  const session = newCricketSession();
  throwTurns(session, CLOSE_ALL_FAST.slice(0, -1));
  const legs = session.legs;
  assert.throws(
    () => applyTurn(session.config, legs, { playerIndex: 0, darts: darts('D25 S25 M') }),
    /already won before the last dart/,
  );
  const won = applyTurn(session.config, legs, { playerIndex: 0, darts: darts('D25 S25') });
  assert.throws(() => applyTurn(session.config, won, { playerIndex: 1, darts: darts('M M M') }), /The leg is over/);
});

test('undo removes one dart at a time, reopening the previous turn', () => {
  const session = newCricketSession();
  throwTurns(session, ['T20 S19 M']);
  session.addDart(dart('S18'));

  session.undo();
  assert.equal(session.pendingTurn, null);
  assert.equal(session.state.currentPlayerIndex, 1);

  session.undo();
  assert.deepEqual(session.pendingTurn, { playerIndex: 0, darts: darts('T20 S19') });
  assert.equal(session.state.currentPlayerIndex, 0);
  assert.deepEqual(session.legs[0].turns, []);

  session.undo();
  session.undo();
  assert.equal(session.pendingTurn, null);
  assert.equal(session.undo(), false);
});

test('undo of a "Next player" turn reopens it with its filled-in misses', () => {
  const session = newCricketSession();
  throwTurns(session, ['S20']);
  session.undo();
  assert.deepEqual(session.pendingTurn, { playerIndex: 0, darts: darts('S20 M') });
});

test('undo of a one-dart turn reopens nothing', () => {
  const session = newCricketSession({ players: 1 });
  throwTurns(session, ['T20 T19 T18', 'T17 T16 T15', 'D25 M M']);
  session.addDart(dart('S25'));
  assert.deepEqual(session.legs[0].turns.at(-1).darts, darts('S25'));
  session.undo();
  assert.equal(session.pendingTurn, null);
  assert.equal(session.state.phase, 'playing');
});

test('undo from the leg summary after a mid-turn win reopens the winning turn', () => {
  const session = newCricketSession({ legs: { mode: 'firstTo', value: 2 } });
  throwTurns(session, CLOSE_ALL_FAST);
  assert.equal(session.state.phase, 'legComplete');
  session.undo();
  assert.equal(session.state.phase, 'playing');
  assert.deepEqual(session.pendingTurn, { playerIndex: 0, darts: darts('D25') });
  assert.equal(session.legs[0].winnerIndex, null);
  session.addDart(dart('S25'));
  assert.equal(session.state.phase, 'legComplete');
});

test('undo from a freshly started leg reopens the winning turn of the previous leg', () => {
  const session = newCricketSession({ legs: { mode: 'firstTo', value: 2 } });
  throwTurns(session, CLOSE_ALL_FAST);
  session.startNextLeg();
  session.undo();
  assert.equal(session.legs.length, 1);
  assert.deepEqual(session.pendingTurn, { playerIndex: 0, darts: darts('D25') });
});

test('snapshot and restore keep the pending turn', () => {
  const session = newCricketSession();
  throwTurns(session, ['T20 T20 S19']);
  session.addDart(dart('D18'));
  const snapshot = JSON.parse(JSON.stringify(session.snapshot()));
  assert.deepEqual(snapshot.pendingTurn, { playerIndex: 1, darts: darts('D18') });

  const restored = GameSession.restore(snapshot, fullRegistry());
  assert.deepEqual(restored.state, session.state);
  restored.addDart(dart('S18'));
  restored.addDart(dart('M'));
  assert.equal(restored.state.currentPlayerIndex, 0);
});

test('replay of the stored log equals the live state; the result matches', () => {
  const session = newCricketSession({ legs: { mode: 'firstTo', value: 2 } });
  throwTurns(session, CLOSE_ALL_FAST);
  session.startNextLeg();
  throwTurns(session, CLOSE_ALL_FAST);
  assert.deepEqual(session.state.legsWonTotal, [1, 1], 'player 2 started leg 2 and won it');
  session.startNextLeg();
  throwTurns(session, CLOSE_ALL_FAST);
  assert.equal(session.state.phase, 'gameComplete');
  assert.equal(session.state.winnerIndex, 0);
  assert.deepEqual(replay(session.config, session.legs), session.state);
  session.legs.forEach((leg, i) => assert.equal(leg.starterIndex, session.state.completedLegs[i].starterIndex));

  const record = session.finish();
  assert.equal(record.type, 'cricket');
  assert.deepEqual(record.result, buildResult(record.config, replay(record.config, record.legs)));
  assert.deepEqual(record.result.legsWon, { 'p-a': 2, 'p-b': 1 });
});

test('dart input is not available for X01', () => {
  const session = newX01Session();
  assert.throws(() => session.addDart(dart('T20')), /X01 has no applyDart/);
  assert.throws(() => session.endTurn(), /X01 has no endTurn/);
});
