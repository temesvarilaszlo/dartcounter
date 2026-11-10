// localStorage stand-in.
export function memoryStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => { items.set(key, String(value)); },
    removeItem: (key) => { items.delete(key); },
    get size() { return items.size; },
  };
}

export const player = (id, name) => ({
  id, name, nameKey: name.toLowerCase(), createdAt: '2026-11-09T20:00:00.000Z', schemaVersion: 1,
});

export const game = (id, playerIds, finishedAt = '2026-11-09T21:00:00.000Z') => ({
  id,
  schemaVersion: 1,
  type: 'x01',
  startedAt: '2026-11-09T20:00:00.000Z',
  finishedAt,
  config: {
    playerIds,
    startingPlayerIndex: 0,
    sets: { enabled: false, format: { mode: 'firstTo', value: 1 }, legsToWinSet: 1 },
    legs: { format: { mode: 'firstTo', value: 1 } },
    typeConfig: { startScore: 101, inRule: 'straight', outRule: 'straight' },
  },
  legs: [{ index: 0, starterIndex: 0, winnerIndex: 0, turns: [{ playerIndex: 0, score: 101, darts: 3 }] }],
  result: {
    winnerId: playerIds[0],
    setsWon: Object.fromEntries(playerIds.map((id) => [id, 0])),
    legsWon: Object.fromEntries(playerIds.map((id, i) => [id, i === 0 ? 1 : 0])),
  },
});
