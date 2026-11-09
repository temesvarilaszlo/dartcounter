import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession, buildResult } from '../../src/model/session.js';
import { replay } from '../../src/model/gameTypes/x01/replay.js';
import {
  QUICK, fixedClock, newX01Session, play, sequentialIds, x01Config, x01Registry,
} from '../fixtures/x01.js';

const remaining = (state) => state.leg.players.map((p) => p.remaining);

// Stored per-leg values must always equal what replay derives.
function assertLogConsistent(session) {
  const { state } = session;
  session.legs.forEach((leg, i) => {
    const derived = i < state.completedLegs.length ? state.completedLegs[i] : state.next;
    assert.equal(leg.index, i);
    assert.equal(leg.starterIndex, derived.starterIndex, `starter of leg ${i}`);
    assert.equal(leg.winnerIndex, state.legs[i].winnerIndex, `winner of leg ${i}`);
  });
}

test('a new game starts with an empty first leg, player 1 throwing', () => {
  const session = newX01Session();
  assert.equal(session.state.phase, 'playing');
  assert.equal(session.state.currentPlayerIndex, 0);
  assert.deepEqual(remaining(session.state), [501, 501]);
  assert.deepEqual(session.legs, [{ index: 0, starterIndex: 0, winnerIndex: null, turns: [] }]);
  assert.equal(session.startedAt, '2026-11-09T20:00:01.000Z');
});

test('create rejects an invalid config and unknown game types', () => {
  assert.throws(() => newX01Session({ startScore: 1 }), /Invalid config: Start score must be 2 to 1001/);
  assert.throws(() => GameSession.create('golf', x01Config(), x01Registry()), /Unknown game type/);
});

test('a full 501 double-out leg with a 2-dart checkout', () => {
  const session = newX01Session();
  play(session, [180, 60, 180, 60, 100]);
  assert.deepEqual(remaining(session.state), [41, 381]);
  assert.equal(session.state.currentPlayerIndex, 1);
  play(session, [60]);

  assert.deepEqual(session.evaluateInput('41'), { valid: true, checkout: { minDarts: 2 } });
  assert.throws(() => session.submitTurn({ score: 41, darts: 1 }), /Invalid dart count: 1/);
  assert.throws(() => session.submitTurn({ score: 41, darts: 4 }), /Invalid dart count: 4/);
  session.submitTurn({ score: 41, darts: 2 });

  const { state } = session;
  assert.equal(state.phase, 'gameComplete');
  assert.equal(state.winnerIndex, 0);
  assert.equal(state.currentPlayerIndex, null);
  assert.deepEqual(state.leg.players.map((p) => p.darts), [11, 9]);
  assert.deepEqual(state.leg.players.map((p) => p.lastScore), [41, 60]);
  assertLogConsistent(session);
});

test('a checkout needing 3 darts records 3 by default', () => {
  const session = newX01Session({ startScore: 170 });
  session.submitTurn({ score: 170 });
  assert.equal(session.legs[0].turns[0].darts, 3);
  assert.equal(session.state.phase, 'gameComplete');
});

test('non-checkout turns always count 3 darts, including 0', () => {
  const session = newX01Session();
  play(session, [0, 26]);
  assert.deepEqual(session.state.leg.players.map((p) => p.darts), [3, 3]);
  assert.throws(() => session.submitTurn({ score: 60, darts: 2 }), /Invalid dart count: 2/);
});

test('invalid scores are rejected and never reach the log', () => {
  const session = newX01Session({ startScore: 40 });
  assert.deepEqual(session.evaluateInput('39'), { valid: false, error: 'That leaves 1, impossible with double out' });
  assert.throws(() => session.submitTurn({ score: 39 }), /That leaves 1/);
  assert.throws(() => session.submitTurn({ score: 163 }), /163 can't be scored/);
  assert.deepEqual(session.legs[0].turns, []);
});

test('a leg win moves to legComplete; the next leg rotates the starter', () => {
  const session = newX01Session({ ...QUICK, legs: { mode: 'firstTo', value: 2 } });
  play(session, [101]);
  assert.equal(session.state.phase, 'legComplete');
  assert.deepEqual(session.evaluateInput('60'), { valid: false, error: 'The leg is over' });
  assert.throws(() => session.submitTurn({ score: 60 }), /The leg is over/);

  session.startNextLeg();
  assert.equal(session.state.phase, 'playing');
  assert.equal(session.state.currentPlayerIndex, 1);
  assert.deepEqual(remaining(session.state), [101, 101]);
  assert.throws(() => session.startNextLeg(), /not finished/);
  assertLogConsistent(session);
});

test('applyTurn refuses a turn from the wrong player', () => {
  const config = x01Config();
  const legs = [{ index: 0, starterIndex: 0, winnerIndex: null, turns: [] }];
  assert.throws(() => x01Registry().get('x01').applyTurn(config, legs, { playerIndex: 1, score: 60 }), /not this player's turn/);
});

test('double in: 0 keeps the player out, a double-first score puts them in, reset each leg', () => {
  const session = newX01Session({ ...QUICK, inRule: 'double', legs: { mode: 'firstTo', value: 2 } });
  play(session, [0]);
  assert.deepEqual(session.state.leg.players.map((p) => p.isIn), [false, false]);
  assert.equal(session.evaluateInput('1').valid, false);
  play(session, [3]);
  assert.deepEqual(session.state.leg.players.map((p) => p.isIn), [false, true]);
  assert.deepEqual(session.evaluateInput('1'), { valid: false, error: "1 can't be scored starting on a double" });
  play(session, [60]);
  assert.deepEqual(session.evaluateInput('1'), { valid: true });
  play(session, [98]);
  assert.equal(session.state.phase, 'legComplete');

  session.startNextLeg();
  assert.deepEqual(session.state.leg.players.map((p) => p.isIn), [false, false]);
});

test('undo steps back across turns and does nothing at the very start', () => {
  const session = newX01Session();
  assert.equal(session.undo(), false);
  play(session, [60, 45]);
  assert.equal(session.undo(), true);
  assert.deepEqual(remaining(session.state), [441, 501]);
  assert.equal(session.state.currentPlayerIndex, 1);
  session.undo();
  assert.deepEqual(session.legs[0].turns, []);
  assert.equal(session.undo(), false);
});

test('undo from the leg summary reopens the leg', () => {
  const session = newX01Session({ ...QUICK, legs: { mode: 'firstTo', value: 2 } });
  play(session, [60, 101]);
  assert.equal(session.state.phase, 'legComplete');
  session.undo();
  assert.equal(session.state.phase, 'playing');
  assert.equal(session.state.currentPlayerIndex, 1);
  assert.equal(session.legs[0].winnerIndex, null);
});

test('undo from a freshly started leg discards it and reopens the previous leg', () => {
  const session = newX01Session({ ...QUICK, legs: { mode: 'firstTo', value: 2 } });
  play(session, [101]);
  session.startNextLeg();
  session.undo();
  assert.equal(session.legs.length, 1);
  assert.equal(session.state.phase, 'playing');
  assert.equal(session.state.currentPlayerIndex, 0);
  assert.deepEqual(session.state.legsWonTotal, [0, 0]);
});

test('undo after the final leg reopens it until finish() is called', () => {
  const session = newX01Session(QUICK);
  play(session, [101]);
  assert.equal(session.state.phase, 'gameComplete');
  session.undo();
  assert.equal(session.state.phase, 'playing');
  assert.equal(session.state.winnerIndex, null);
  assert.throws(() => session.finish(), /not finished/);
});

test('a sets game plays through to the end with correct counters and rotation', () => {
  const session = newX01Session({ ...QUICK, sets: { format: { mode: 'bestOf', value: 3 }, legsToWinSet: 2 } });
  const winLeg = (winner) => {
    if (session.state.currentPlayerIndex !== winner) play(session, [0]);
    play(session, [101]);
  };

  winLeg(0);
  session.startNextLeg();
  winLeg(0);
  assert.deepEqual(session.state.setsWon, [1, 0]);
  assert.equal(session.state.completedLegs.at(-1).setWinnerIndex, 0);
  session.startNextLeg();
  assert.equal(session.state.currentPlayerIndex, 1, 'set 2 opened by player 2');
  assert.deepEqual(session.state.legsWonInCurrentSet, [0, 0]);
  assert.equal(session.state.setIndex, 1);
  assert.equal(session.state.legIndexInSet, 0);

  for (const winner of [1, 0, 1]) {
    winLeg(winner);
    if (session.state.phase === 'legComplete') session.startNextLeg();
  }
  assert.deepEqual(session.state.setsWon, [1, 1]);
  assert.equal(session.state.currentPlayerIndex, 0, 'set 3 opened by player 1');

  winLeg(1);
  session.startNextLeg();
  winLeg(1);
  assert.equal(session.state.phase, 'gameComplete');
  assert.equal(session.state.winnerIndex, 1);
  assert.deepEqual(session.state.legsWonTotal, [3, 4]);
  assertLogConsistent(session);

  const record = session.finish();
  assert.deepEqual(record.result, { winnerId: 'p-b', setsWon: { 'p-a': 1, 'p-b': 2 }, legsWon: { 'p-a': 3, 'p-b': 4 } });
});

test('snapshot and restore reproduce the exact state', () => {
  const session = newX01Session({ ...QUICK, legs: { mode: 'firstTo', value: 2 } });
  play(session, [101]);
  session.startNextLeg();
  play(session, [60]);
  const snapshot = JSON.parse(JSON.stringify(session.snapshot()));
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.type, 'x01');
  assert.equal(snapshot.pendingTurn, null);

  const restored = GameSession.restore(snapshot, x01Registry());
  assert.deepEqual(restored.state, session.state);
  assert.deepEqual(restored.legs, session.legs);
  assert.equal(restored.startedAt, session.startedAt);
});

test('restore rejects unsupported snapshots', () => {
  assert.throws(() => GameSession.restore({ schemaVersion: 2 }, x01Registry()), /Unsupported saved game/);
  assert.throws(() => GameSession.restore(null, x01Registry()), /Unsupported saved game/);
  const snapshot = newX01Session().snapshot();
  assert.throws(() => GameSession.restore({ ...snapshot, type: 'golf' }, x01Registry()), /Unknown game type/);
});

test('finish builds the game record; the stored result equals the replayed one', () => {
  const session = GameSession.create('x01', x01Config(QUICK), x01Registry(), {
    now: fixedClock(), newId: sequentialIds('game'),
  });
  play(session, [60, 101]);
  const record = session.finish();
  assert.deepEqual(record, {
    id: 'game-1',
    schemaVersion: 1,
    type: 'x01',
    startedAt: '2026-11-09T20:00:01.000Z',
    finishedAt: '2026-11-09T20:00:02.000Z',
    config: session.config,
    legs: session.legs,
    result: { winnerId: 'p-b', setsWon: { 'p-a': 0, 'p-b': 0 }, legsWon: { 'p-a': 0, 'p-b': 1 } },
  });
  assert.deepEqual(record.result, buildResult(record.config, replay(record.config, record.legs)));
});

test('solo game: one player plays every turn', () => {
  const session = newX01Session({ ...QUICK, players: 1, legs: { mode: 'firstTo', value: 2 } });
  play(session, [60]);
  assert.equal(session.state.currentPlayerIndex, 0);
  play(session, [41]);
  session.startNextLeg();
  play(session, [101]);
  assert.equal(session.state.phase, 'gameComplete');
  assert.equal(session.finish().result.winnerId, 'p-a');
});

test('default clock and id generator are used when none are injected', () => {
  const session = GameSession.create('x01', x01Config(QUICK), x01Registry());
  assert.match(session.startedAt, /^\d{4}-\d\d-\d\dT/);
  play(session, [101]);
  assert.match(session.finish().id, /^[0-9a-f-]{36}$/);
});
