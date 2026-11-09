import { SCHEMA_VERSION } from '../../config.js';

export const NAME_MAX_LENGTH = 20;

export function normalizeName(name) {
  return String(name ?? '').trim();
}

export function nameKey(name) {
  return normalizeName(name).toLowerCase();
}

export function nameError(name) {
  const normalized = normalizeName(name);
  if (!normalized) return 'Enter a name';
  if (normalized.length > NAME_MAX_LENGTH) return `Max ${NAME_MAX_LENGTH} characters`;
  return null;
}

// One entry per name: null when valid, otherwise the error. Later duplicates
// of a name (case-insensitive) are the ones flagged.
export function validatePlayerNames(names) {
  const seen = new Set();
  return names.map((name) => {
    const error = nameError(name);
    if (error) return error;
    const key = nameKey(name);
    if (seen.has(key)) return 'Name already used in this game';
    seen.add(key);
    return null;
  });
}

// Maps names to player records, reusing existing players (and their stored
// casing) by nameKey. Brand-new players are returned separately so they can be
// written together with the finished game.
export function resolvePlayers(names, existingPlayers, { newId, now }) {
  const byKey = new Map(existingPlayers.map((p) => [p.nameKey, p]));
  const created = [];
  const players = names.map((name) => {
    const key = nameKey(name);
    const existing = byKey.get(key);
    if (existing) return existing;
    const player = { id: newId(), name: normalizeName(name), nameKey: key, createdAt: now(), schemaVersion: SCHEMA_VERSION };
    byKey.set(key, player);
    created.push(player);
    return player;
  });
  return { players, created };
}

// Rematch: the next player in the list throws first.
export function rotateOrder(list) {
  return list.length ? [...list.slice(1), list[0]] : [];
}
