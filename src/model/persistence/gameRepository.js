import { requestResult, transactionDone } from './idb.js';

const byNewest = (a, b) => b.finishedAt.localeCompare(a.finishedAt);

export function createGameRepository(db) {
  const store = (mode = 'readonly') => db.transaction('games', mode).objectStore('games');

  // Games and brand-new players are written in one transaction: a player
  // whose nameKey is taken aborts the whole write, so nothing is half-saved.
  async function saveAll({ games = [], players = [] }) {
    const tx = db.transaction(['games', 'players'], 'readwrite');
    const done = transactionDone(tx);
    players.forEach((player) => tx.objectStore('players').put(player));
    games.forEach((game) => tx.objectStore('games').put(game));
    await done;
  }

  return {
    saveAll,
    save: (game, newPlayers = []) => saveAll({ games: [game], players: newPlayers }),
    get: async (id) => (await requestResult(store().get(id))) ?? null,
    list: async () => (await requestResult(store().getAll())).sort(byNewest),
    async delete(id) {
      const tx = db.transaction('games', 'readwrite');
      const done = transactionDone(tx);
      tx.objectStore('games').delete(id);
      await done;
    },
  };
}
