import { SCHEMA_VERSION } from '../config.js';
import { randomId } from './common/ids.js';
import { starterFor } from './common/matchFormat.js';

const defaultNow = () => new Date().toISOString();

const newLeg = (index, starterIndex) => ({ index, starterIndex, winnerIndex: null, turns: [] });

export function buildResult(config, state) {
  const byPlayer = (counts) => Object.fromEntries(config.playerIds.map((id, i) => [id, counts[i]]));
  return {
    winnerId: state.winnerIndex === null ? null : config.playerIds[state.winnerIndex],
    setsWon: byPlayer(state.setsWon),
    legsWon: byPlayer(state.legsWonTotal),
  };
}

// Facade the controllers use. Holds only the event log (config + legs); every
// read goes through the game type's replay. Clock and id generator are injected.
export class GameSession {
  #state;

  static create(typeId, config, registry, deps = {}) {
    const type = registry.get(typeId);
    const { ok, errors } = type.validateConfig(config);
    if (!ok) throw new Error(`Invalid config: ${Object.values(errors).join('; ')}`);
    const now = deps.now ?? defaultNow;
    return new GameSession({
      type,
      config,
      legs: [newLeg(0, starterFor(config, 0, 0))],
      startedAt: now(),
      pendingTurn: null,
    }, deps);
  }

  static restore(snapshot, registry, deps = {}) {
    if (snapshot?.schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported saved game');
    const { type, config, legs, startedAt, pendingTurn = null } = snapshot;
    return new GameSession({ type: registry.get(type), config, legs, startedAt, pendingTurn }, deps);
  }

  constructor({ type, config, legs, startedAt, pendingTurn }, { now = defaultNow, newId = randomId } = {}) {
    this.type = type;
    this.config = config;
    this.legs = legs;
    this.startedAt = startedAt;
    this.pendingTurn = pendingTurn;
    this.now = now;
    this.newId = newId;
    this.#refresh();
  }

  get state() {
    return this.#state;
  }

  #refresh() {
    this.#state = this.type.replay(this.config, this.legs, this.pendingTurn);
    return this.#state;
  }

  evaluateInput(raw) {
    return this.type.evaluateInput(this.state, raw);
  }

  submitTurn(turn) {
    this.legs = this.type.applyTurn(this.config, this.legs, { ...turn, playerIndex: this.state.currentPlayerIndex });
    return this.#refresh();
  }

  // Pops the most recent turn. An empty trailing leg is discarded first, so
  // undo from a freshly started leg reopens the previous one. Returns false
  // when there is nothing to undo.
  undo() {
    let legs = this.legs;
    if (legs.at(-1).turns.length === 0 && legs.length > 1) legs = legs.slice(0, -1);
    const leg = legs.at(-1);
    if (leg.turns.length === 0) return false;
    this.legs = [...legs.slice(0, -1), { ...leg, turns: leg.turns.slice(0, -1), winnerIndex: null }];
    this.#refresh();
    return true;
  }

  startNextLeg() {
    if (this.state.phase !== 'legComplete') throw new Error('The current leg is not finished');
    this.legs = [...this.legs, newLeg(this.legs.length, this.state.next.starterIndex)];
    return this.#refresh();
  }

  snapshot() {
    return {
      schemaVersion: SCHEMA_VERSION,
      savedAt: this.now(),
      type: this.type.id,
      startedAt: this.startedAt,
      config: this.config,
      legs: this.legs,
      pendingTurn: this.pendingTurn,
    };
  }

  finish() {
    if (this.state.phase !== 'gameComplete') throw new Error('The game is not finished');
    return {
      id: this.newId(),
      schemaVersion: SCHEMA_VERSION,
      type: this.type.id,
      startedAt: this.startedAt,
      finishedAt: this.now(),
      config: this.config,
      legs: this.legs,
      result: buildResult(this.config, this.state),
    };
  }
}
