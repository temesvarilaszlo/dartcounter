import { requestResult } from './idb.js';

// Read-only: players are only ever written together with a finished game
// (gameRepository.save), so quitting a game never leaves orphans.
export function createPlayerRepository(db) {
  const store = () => db.transaction('players').objectStore('players');
  return {
    list: () => requestResult(store().getAll()),
    get: async (id) => (await requestResult(store().get(id))) ?? null,
    findByNameKey: async (key) => (await requestResult(store().index('nameKey').get(key))) ?? null,
  };
}
