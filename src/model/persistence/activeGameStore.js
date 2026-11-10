import { SCHEMA_VERSION, STORAGE_KEYS } from '../../config.js';

// `storage` is anything with getItem/setItem/removeItem (localStorage in the
// browser, a Map-backed fake in tests).

function readJson(storage, key) {
  const text = storage.getItem(key);
  if (text === null) return { found: false };
  try {
    return { found: true, value: JSON.parse(text) };
  } catch {
    return { found: true, value: undefined };
  }
}

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function isSnapshot(value) {
  return isObject(value)
    && value.schemaVersion === SCHEMA_VERSION
    && typeof value.type === 'string'
    && isObject(value.config)
    && Array.isArray(value.legs) && value.legs.length > 0;
}

// Mirror of the in-progress game. load() discards anything it cannot use and
// says so, so the UI can tell the player.
export function createActiveGameStore(storage, key = STORAGE_KEYS.activeGame) {
  return {
    save: (snapshot) => storage.setItem(key, JSON.stringify(snapshot)),
    clear: () => storage.removeItem(key),
    load() {
      const { found, value } = readJson(storage, key);
      if (!found) return { status: 'none' };
      if (isSnapshot(value)) return { status: 'ok', snapshot: value };
      storage.removeItem(key);
      return { status: 'corrupt' };
    },
  };
}

// Last used pre-game values per game type (players and their order included),
// used to prefill the pre-game screen. Unreadable data just means no prefill.
export function createLastConfigStore(storage, key = STORAGE_KEYS.lastConfig) {
  const readAll = () => {
    const { value } = readJson(storage, key);
    return isObject(value) && value.schemaVersion === SCHEMA_VERSION && isObject(value.byType) ? value.byType : {};
  };
  return {
    get: (typeId) => readAll()[typeId] ?? null,
    set(typeId, config) {
      const byType = { ...readAll(), [typeId]: config };
      storage.setItem(key, JSON.stringify({ schemaVersion: SCHEMA_VERSION, byType }));
    },
  };
}
