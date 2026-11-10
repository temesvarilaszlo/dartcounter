import { daysBefore, localDay } from './common/dates.js';
import { FORMAT_MODE_LABELS } from './common/matchFormat.js';

// All-time statistics and history filters over finished game records. Data is
// tiny, so everything is computed in memory from repository.list().

const isSolo = (game) => game.config.playerIds.length === 1;
const hasPlayer = (game, playerId) => game.config.playerIds.includes(playerId);

// The format that decides the match: sets when enabled, otherwise legs.
const deciding = (config) => (config.sets.enabled ? config.sets.format : config.legs.format);

export function emptyFilters() {
  return {
    type: null,
    dateFrom: null, // local "YYYY-MM-DD", inclusive
    dateTo: null,
    playerIds: [], // every selected player took part
    playerCounts: [],
    sets: null, // true | false | null (either)
    modes: [],
    values: [],
    typeFields: {}, // { [filterField.key]: [values] }, only applied with a type selected
  };
}

// Empty selection means "any"; several selected values mean "any of these".
const allows = (selected, value) => selected.length === 0 || selected.includes(value);

function matches(game, f) {
  const { config } = game;
  const day = localDay(game.finishedAt);
  return (!f.type || game.type === f.type)
    && (!f.dateFrom || day >= f.dateFrom)
    && (!f.dateTo || day <= f.dateTo)
    && f.playerIds.every((id) => hasPlayer(game, id))
    && allows(f.playerCounts, config.playerIds.length)
    && (f.sets === null || config.sets.enabled === f.sets)
    && allows(f.modes, deciding(config).mode)
    && allows(f.values, deciding(config).value)
    && (!f.type || Object.entries(f.typeFields).every(([key, selected]) => allows(selected, config.typeConfig[key])));
}

// Keeps the input order (repositories list newest first).
export function filterGames(games, filters) {
  const f = { ...emptyFilters(), ...filters };
  return games.filter((game) => matches(game, f));
}

// Quick date ranges for the filter sheet, ending today (local days).
export function datePresets(now) {
  const today = localDay(now);
  return [
    { key: 'today', label: 'Today', dateFrom: today, dateTo: today },
    { key: 'week', label: 'Last 7 days', dateFrom: daysBefore(now, 6), dateTo: today },
    { key: 'month', label: 'Last 30 days', dateFrom: daysBefore(now, 29), dateTo: today },
    { key: 'year', label: 'This year', dateFrom: `${today.slice(0, 4)}-01-01`, dateTo: today },
  ];
}

// Badge on the filter button: one per active filter group.
export function activeFilterCount(filters) {
  const f = { ...emptyFilters(), ...filters };
  const typeFields = f.type ? Object.values(f.typeFields).filter((selected) => selected.length).length : 0;
  return [f.type, f.dateFrom || f.dateTo, f.playerIds.length, f.playerCounts.length, f.sets !== null, f.modes.length, f.values.length]
    .filter(Boolean).length + typeFields;
}

const distinct = (values) => [...new Set(values)]
  .sort((a, b) => (typeof a === 'number' ? a - b : String(a).localeCompare(String(b))));

const options = (values, label = String) => distinct(values).map((value) => ({ value, label: label(value) }));

// Chip options for the filter sheet, limited to values that occur in the games.
export function filterOptions(games, players, registry, typeId = null) {
  const typeGames = games.filter((game) => game.type === typeId);
  return {
    types: registry.list()
      .filter((type) => games.some((game) => game.type === type.id))
      .map((type) => ({ value: type.id, label: type.label })),
    players: players
      .filter((player) => games.some((game) => hasPlayer(game, player.id)))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((player) => ({ value: player.id, label: player.name })),
    playerCounts: options(games.map((game) => game.config.playerIds.length)),
    sets: options(games.map((game) => game.config.sets.enabled), (on) => (on ? 'Sets' : 'Legs only')),
    modes: options(games.map((game) => deciding(game.config).mode), (mode) => FORMAT_MODE_LABELS[mode]),
    values: options(games.map((game) => deciding(game.config).value)),
    typeFields: typeId
      ? registry.get(typeId).filterFields.map(({ key, label, optionLabel }) => ({
        key, label, options: options(typeGames.map((game) => game.config.typeConfig[key]), optionLabel),
      }))
      : [],
  };
}

const gamesOf = (games, typeId, playerId) => games.filter((game) => game.type === typeId && hasPlayer(game, playerId));

// Players who played the type, most games first; the first one is the default selection.
export function rankPlayers(games, players, typeId) {
  return players
    .map((player) => ({ ...player, gamesPlayed: gamesOf(games, typeId, player.id).length }))
    .filter((player) => player.gamesPlayed > 0)
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed || a.name.localeCompare(b.name));
}

// null when the player has no games of this type (empty state).
// Solo games count as played but never as won.
export function allTimeStats(games, registry, typeId, playerId) {
  const own = gamesOf(games, typeId, playerId);
  if (own.length === 0) return null;
  return {
    gamesPlayed: own.length,
    gamesWon: own.filter((game) => !isSolo(game) && game.result.winnerId === playerId).length,
    ...registry.get(typeId).allTime.compute(own, playerId),
  };
}
