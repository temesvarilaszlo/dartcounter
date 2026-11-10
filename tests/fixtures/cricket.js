import { createRegistry } from '../../src/model/gameTypes/registry.js';
import { cricket } from '../../src/model/gameTypes/cricket/index.js';
import { x01 } from '../../src/model/gameTypes/x01/index.js';
import { GameSession } from '../../src/model/session.js';
import { fixedClock, matchConfig, sequentialIds } from './x01.js';

const MULTIPLIERS = { S: 1, D: 2, T: 3 };

// 'T20' -> { n: 20, m: 3 }, 'D25' -> double bull, 'M' -> miss
export function dart(code) {
  return code === 'M' ? { miss: true } : { n: Number(code.slice(1)), m: MULTIPLIERS[code[0]] };
}

export const darts = (codes) => codes.split(' ').map(dart);

export function cricketConfig({ variant = 'regular', ...match } = {}) {
  return matchConfig({ ...match, typeConfig: { variant } });
}

export function fullRegistry() {
  return createRegistry().register(x01).register(cricket);
}

export function newCricketSession(options = {}) {
  return GameSession.create('cricket', cricketConfig(options), fullRegistry(), {
    now: fixedClock(), newId: sequentialIds('game'),
  });
}

// Each element is one turn: a string of dart codes. Fewer than 3 darts that do
// not win the leg are ended with "Next player"; an empty string is a turn of
// 3 misses via "Next player".
export function throwTurns(session, turns) {
  for (const codes of turns) {
    const turnDarts = codes ? darts(codes) : [];
    turnDarts.forEach((d) => session.addDart(d));
    if (session.pendingTurn || turnDarts.length === 0) session.endTurn();
  }
  return session.state;
}

// Player 1 closes everything in 3 turns + 2 darts while player 2 misses.
export const CLOSE_ALL_FAST = ['T20 T19 T18', '', 'T17 T16 T15', '', 'D25 S25'];
