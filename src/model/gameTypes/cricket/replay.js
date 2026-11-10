import { composeGameState } from '../../common/matchFormat.js';
import { createPlayers, dartError, findWinner, throwDart } from './rules.js';

const DARTS_PER_TURN = 3;
const MISS = { miss: true };

// Replays one leg; the pending (uncommitted) turn of the current player is
// applied on top so the scoreboard shows every dart as soon as it lands.
export function replayLeg(config, leg, pendingTurn = null) {
  const { variant } = config.typeConfig;
  const players = createPlayers(config.playerIds.length);
  let winnerIndex = null;
  const turns = pendingTurn ? [...leg.turns, pendingTurn] : leg.turns;
  for (const turn of turns) {
    for (const dart of turn.darts) {
      throwDart(players, turn.playerIndex, dart, variant);
      winnerIndex = findWinner(players, turn.playerIndex, variant);
    }
  }
  return {
    starterIndex: leg.starterIndex,
    winnerIndex,
    currentPlayerIndex: (leg.starterIndex + leg.turns.length) % players.length,
    pendingDarts: pendingTurn?.darts ?? [],
    players,
  };
}

export function replay(config, legs, pendingTurn = null) {
  return composeGameState(config, legs.map((leg, i) => replayLeg(config, leg, i === legs.length - 1 ? pendingTurn : null)));
}

export function evaluateInput(state, dart) {
  if (state.phase !== 'playing') return { valid: false, error: 'The leg is over' };
  const error = dartError(dart);
  return error ? { valid: false, error } : { valid: true };
}

// Commits a whole turn. A turn has 3 darts, or fewer only when its last dart
// won the leg.
export function applyTurn(config, legs, turn) {
  const state = replay(config, legs);
  if (state.phase !== 'playing') throw new Error('The leg is over');
  if (turn.playerIndex !== state.currentPlayerIndex) throw new Error("It's not this player's turn");
  if (!turn.darts.length || turn.darts.length > DARTS_PER_TURN) throw new Error('A turn has 1 to 3 darts');
  turn.darts.forEach((dart) => {
    const error = dartError(dart);
    if (error) throw new Error(error);
  });

  const leg = legs.at(-1);
  const recorded = { playerIndex: turn.playerIndex, darts: turn.darts };
  const withTurn = { ...leg, turns: [...leg.turns, recorded] };
  const winnerIndex = replayLeg(config, withTurn).winnerIndex;
  const partial = { ...leg, turns: [...leg.turns, { ...recorded, darts: turn.darts.slice(0, -1) }] };
  if (replayLeg(config, partial).winnerIndex !== null) throw new Error('The leg was already won before the last dart');
  if (winnerIndex === null && turn.darts.length < DARTS_PER_TURN) throw new Error('A turn has 3 darts unless it wins the leg');
  return [...legs.slice(0, -1), { ...withTurn, winnerIndex }];
}

// Adds one dart to the current turn. The turn is committed once it has 3 darts
// or the dart wins the leg; otherwise it stays pending.
export function applyDart(config, legs, pendingTurn, dart) {
  const state = replay(config, legs, pendingTurn);
  const result = evaluateInput(state, dart);
  if (!result.valid) throw new Error(result.error);

  const turn = { playerIndex: state.currentPlayerIndex, darts: [...(pendingTurn?.darts ?? []), dart] };
  const wins = replayLeg(config, legs.at(-1), turn).winnerIndex !== null;
  if (wins || turn.darts.length === DARTS_PER_TURN) return { legs: applyTurn(config, legs, turn), pendingTurn: null };
  return { legs, pendingTurn: turn };
}

// "Next player": the darts not thrown are recorded as misses.
export function endTurn(config, legs, pendingTurn) {
  const state = replay(config, legs, pendingTurn);
  const darts = [...(pendingTurn?.darts ?? [])];
  while (darts.length < DARTS_PER_TURN) darts.push(MISS);
  return applyTurn(config, legs, { playerIndex: state.currentPlayerIndex, darts });
}

// Undo is dart by dart: removing a committed turn reopens it minus its last dart.
export function reopenTurn(turn) {
  return turn.darts.length > 1 ? { playerIndex: turn.playerIndex, darts: turn.darts.slice(0, -1) } : null;
}
