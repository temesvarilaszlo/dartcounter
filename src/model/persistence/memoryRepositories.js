// In-memory repositories with the same interface and constraints as the
// IndexedDB ones. Values are cloned on the way in and out, like IndexedDB.
export function createMemoryRepositories() {
  const games = new Map();
  const players = new Map();
  const clone = (value) => (value == null ? null : structuredClone(value));

  return {
    games: {
      async saveAll({ games: newGames = [], players: newPlayers = [] }) {
        const nameKeys = new Map([...players.values()].map((p) => [p.nameKey, p.id]));
        for (const player of newPlayers) {
          const owner = nameKeys.get(player.nameKey);
          if (owner !== undefined && owner !== player.id) throw new Error(`Player name "${player.name}" is already taken`);
          nameKeys.set(player.nameKey, player.id);
        }
        newPlayers.forEach((p) => players.set(p.id, clone(p)));
        newGames.forEach((g) => games.set(g.id, clone(g)));
      },
      save(game, newPlayers = []) {
        return this.saveAll({ games: [game], players: newPlayers });
      },
      get: async (id) => clone(games.get(id)),
      list: async () => [...games.values()].map(clone).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)),
      delete: async (id) => { games.delete(id); },
    },
    players: {
      list: async () => [...players.values()].map(clone),
      get: async (id) => clone(players.get(id)),
      findByNameKey: async (key) => clone([...players.values()].find((p) => p.nameKey === key)),
    },
  };
}
