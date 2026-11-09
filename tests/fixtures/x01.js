import { createRegistry } from '../../src/model/gameTypes/registry.js';
import { x01 } from '../../src/model/gameTypes/x01/index.js';
import { GameSession } from '../../src/model/session.js';

export const PLAYER_IDS = ['p-a', 'p-b', 'p-c'];

export function sequentialIds(prefix = 'id') {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

export function fixedClock(start = '2026-11-09T20:00:00.000Z') {
  let ms = Date.parse(start);
  return () => new Date((ms += 1000)).toISOString();
}

export function matchConfig({ players = 2, legs = { mode: 'firstTo', value: 1 }, sets = null, typeConfig = {} } = {}) {
  return {
    playerIds: PLAYER_IDS.slice(0, players),
    startingPlayerIndex: 0,
    sets: sets
      ? { enabled: true, format: sets.format, legsToWinSet: sets.legsToWinSet }
      : { enabled: false, format: { mode: 'firstTo', value: 1 }, legsToWinSet: 1 },
    legs: { format: legs },
    typeConfig,
  };
}

export function x01Config({ startScore = 501, inRule = 'straight', outRule = 'double', ...match } = {}) {
  return matchConfig({ ...match, typeConfig: { startScore, inRule, outRule } });
}

export function x01Registry() {
  return createRegistry().register(x01);
}

export function newX01Session(options = {}) {
  return GameSession.create('x01', x01Config(options), x01Registry(), { now: fixedClock(), newId: sequentialIds('game') });
}

// Plays turns given as numbers (score, 3 darts) or { score, darts }.
export function play(session, turns) {
  for (const turn of turns) session.submitTurn(typeof turn === 'number' ? { score: turn } : turn);
  return session.state;
}

// 101 straight in/out: a single 101 turn (3 darts) wins a leg.
export const QUICK = { startScore: 101, outRule: 'straight' };
