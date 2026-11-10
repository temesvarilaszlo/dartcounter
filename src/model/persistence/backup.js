import { SCHEMA_VERSION } from '../../config.js';

const APP = 'dartcounter';
const NOT_A_BACKUP = 'This file is not a Dart Counter backup';

export function buildExport({ players, games, now }) {
  return { app: APP, schemaVersion: SCHEMA_VERSION, exportedAt: now(), players, games };
}

// Named after the phone's local date.
export function exportFileName(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${APP}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

const isString = (value) => typeof value === 'string' && value.length > 0;

const isPlayer = (p) => isString(p?.id) && isString(p.name) && isString(p.nameKey);

const isGame = (g) => isString(g?.id) && isString(g.type) && isString(g.finishedAt)
  && Array.isArray(g.config?.playerIds) && Array.isArray(g.legs) && typeof g.result === 'object' && g.result !== null;

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (data?.app !== APP || !Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'This backup comes from a newer version of the app. Update the app, then import again.' };
  }
  if (!Array.isArray(data.players) || !Array.isArray(data.games) || !data.players.every(isPlayer) || !data.games.every(isGame)) {
    return { ok: false, error: `${NOT_A_BACKUP}: some players or games are malformed` };
  }
  const playerIds = new Set(data.players.map((p) => p.id));
  if (!data.games.every((g) => g.config.playerIds.every((id) => playerIds.has(id)))) {
    return { ok: false, error: `${NOT_A_BACKUP}: a game refers to a player that is not in the file` };
  }
  return { ok: true, data };
}

function remapGame(game, idMap) {
  const map = (id) => idMap.get(id) ?? id;
  const mapKeys = (counts) => Object.fromEntries(Object.entries(counts ?? {}).map(([id, n]) => [map(id), n]));
  return {
    ...game,
    config: { ...game.config, playerIds: game.config.playerIds.map(map) },
    result: {
      ...game.result,
      winnerId: game.result.winnerId == null ? game.result.winnerId : map(game.result.winnerId),
      setsWon: mapKeys(game.result.setsWon),
      legsWon: mapKeys(game.result.legsWon),
    },
  };
}

// Merge plan: games already stored (by id) are skipped; an imported player
// whose name matches an existing player under a different id is merged into
// that player, and the imported games are rewritten to the existing id.
export function planImport(data, { players: existingPlayers, games: existingGames }) {
  const existingById = new Map(existingPlayers.map((p) => [p.id, p]));
  const existingByKey = new Map(existingPlayers.map((p) => [p.nameKey, p]));
  const existingGameIds = new Set(existingGames.map((g) => g.id));

  const idMap = new Map();
  const players = [];
  for (const player of data.players) {
    if (existingById.has(player.id)) continue;
    const sameName = existingByKey.get(player.nameKey);
    if (sameName) idMap.set(player.id, sameName.id);
    else players.push(player);
  }

  const games = data.games.filter((g) => !existingGameIds.has(g.id)).map((g) => remapGame(g, idMap));
  const usedIds = new Set(games.flatMap((g) => g.config.playerIds));
  return {
    games,
    players: players.filter((p) => usedIds.has(p.id)),
    skippedGames: data.games.length - games.length,
    mergedPlayers: idMap.size,
  };
}
