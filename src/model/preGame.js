import { MAX_PLAYERS } from '../config.js';
import { normalizeFields, validateCommonConfig, validateFields } from './common/gameConfig.js';
import { formatError } from './common/matchFormat.js';
import { nameKey, normalizeName, resolvePlayers, validatePlayerNames } from './common/players.js';

// The pre-game form: { players: [{ name }], sets, legs, typeConfig }. Players
// are kept by name and resolved to records only when the game starts.

const DEFAULT_PLAYER_ROWS = Math.min(2, MAX_PLAYERS);

export function defaultForm(type) {
  return {
    players: Array.from({ length: DEFAULT_PLAYER_ROWS }, () => ({ name: '' })),
    sets: { enabled: false, format: { mode: 'firstTo', value: 2 }, legsToWinSet: 3 },
    legs: { format: { mode: 'firstTo', value: 3 } },
    typeConfig: normalizeFields(type.preGameSchema),
  };
}

const isCount = (value) => Number.isInteger(value) && value >= 1;

// Prefill from a saved form (lastConfig). Anything unusable falls back to the
// default, so an old or damaged entry never blocks the screen.
export function restoreForm(type, saved) {
  const form = defaultForm(type);
  if (!saved) return form;
  const names = (saved.players ?? []).map((p) => normalizeName(p?.name)).filter(Boolean).slice(0, MAX_PLAYERS);
  if (names.length) form.players = names.map((name) => ({ name }));
  const { sets, legs, typeConfig = {} } = saved;
  if (sets && !formatError(sets.format) && isCount(sets.legsToWinSet)) {
    form.sets = { enabled: sets.enabled === true, format: { ...sets.format }, legsToWinSet: sets.legsToWinSet };
  }
  if (!formatError(legs?.format)) form.legs = { format: { ...legs.format } };
  for (const field of type.preGameSchema) {
    const value = typeConfig[field.key];
    if (value !== undefined && !field.validate(value)) form.typeConfig[field.key] = value;
  }
  return form;
}

function toConfig(form, playerIds) {
  return {
    playerIds,
    startingPlayerIndex: 0,
    sets: { enabled: form.sets.enabled, format: { ...form.sets.format }, legsToWinSet: form.sets.legsToWinSet },
    legs: { format: { ...form.legs.format } },
    typeConfig: { ...form.typeConfig },
  };
}

// playerErrors: one entry per row (null when fine); errors: everything else,
// keyed like validateGameConfig ('players', 'legs.format', 'startScore', ...).
export function validateForm(type, form) {
  const playerErrors = validatePlayerNames(form.players.map((p) => p.name));
  const seats = form.players.map((_, i) => `seat-${i}`);
  const errors = { ...validateCommonConfig(toConfig(form, seats)), ...validateFields(type.preGameSchema, form.typeConfig) };
  const ok = playerErrors.every((e) => e === null) && Object.keys(errors).length === 0;
  return { ok, playerErrors, errors };
}

// Resolves names to players (reusing existing ones by name) and builds the
// game config. `created` must be saved together with the finished game.
export function prepareGame(type, form, existingPlayers, deps) {
  if (!validateForm(type, form).ok) throw new Error('The game setup is not valid');
  const { players, created } = resolvePlayers(form.players.map((p) => p.name), existingPlayers, deps);
  return { config: toConfig(form, players.map((p) => p.id)), players, created };
}

export function movePlayer(players, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= players.length) return players;
  const moved = [...players];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

// Existing players not already in the form, for the tappable chips.
export function suggestPlayers(existingPlayers, form) {
  const taken = new Set(form.players.map((p) => nameKey(p.name)));
  return existingPlayers.filter((p) => !taken.has(p.nameKey)).sort((a, b) => a.name.localeCompare(b.name));
}
