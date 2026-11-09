import { composeGameState } from '../../common/matchFormat.js';
import { evaluateScore } from './rules.js';

// Replays one leg's turns. Trusts the log: turns were validated when applied.
export function replayLeg(config, leg) {
  const { startScore, inRule } = config.typeConfig;
  const players = config.playerIds.map(() => ({
    remaining: startScore,
    isIn: inRule === 'straight',
    points: 0,
    darts: 0,
    lastScore: null,
  }));
  let winnerIndex = null;
  for (const turn of leg.turns) {
    const player = players[turn.playerIndex];
    if (turn.score > 0) player.isIn = true;
    player.remaining -= turn.score;
    player.points += turn.score;
    player.darts += turn.darts;
    player.lastScore = turn.score;
    if (player.remaining === 0) winnerIndex = turn.playerIndex;
  }
  return {
    starterIndex: leg.starterIndex,
    winnerIndex,
    currentPlayerIndex: (leg.starterIndex + leg.turns.length) % players.length,
    players,
  };
}

export function replay(config, legs) {
  return composeGameState(config, legs.map((leg) => replayLeg(config, leg)));
}

export function evaluateInput(state, raw) {
  if (state.phase !== 'playing') return { valid: false, error: 'The leg is over' };
  const player = state.leg.players[state.currentPlayerIndex];
  const { inRule, outRule } = state.config.typeConfig;
  return evaluateScore(raw, { remaining: player.remaining, isIn: player.isIn, inRule, outRule });
}

// Returns a new log with the turn appended; throws on an invalid turn so a bad
// turn can never reach the log. `darts` only matters on the checkout turn.
export function applyTurn(config, legs, turn) {
  const state = replay(config, legs);
  const result = evaluateInput(state, turn.score);
  if (!result.valid) throw new Error(result.error);
  if (turn.playerIndex !== state.currentPlayerIndex) throw new Error("It's not this player's turn");

  const darts = turn.darts ?? 3;
  const dartsOk = result.checkout ? darts >= result.checkout.minDarts && darts <= 3 : darts === 3;
  if (!dartsOk) throw new Error(`Invalid dart count: ${darts}`);

  const leg = legs.at(-1);
  const recorded = { playerIndex: turn.playerIndex, score: Number(turn.score), darts };
  return [
    ...legs.slice(0, -1),
    { ...leg, turns: [...leg.turns, recorded], winnerIndex: result.checkout ? turn.playerIndex : null },
  ];
}
