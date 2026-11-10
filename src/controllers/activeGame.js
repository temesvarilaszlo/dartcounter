import { GameSession } from '../model/session.js';

// The game in progress: the session in memory plus its localStorage mirror.
// The mirror also carries the player records, because brand-new players only
// reach the database together with the finished game.
export function createActiveGame({ store, registry }) {
  let current = null;

  function save() {
    store.save({ ...current.session.snapshot(), players: current.players });
  }

  function restore(snapshot) {
    const { players, ...rest } = snapshot;
    const session = GameSession.restore(rest, registry);
    const seated = session.config.playerIds.map((id) => players?.find?.((p) => p?.id === id));
    if (!seated.every((p) => typeof p?.name === 'string')) throw new Error('Saved game has unknown players');
    return { session, players: seated };
  }

  return {
    get session() { return current?.session ?? null; },
    get players() { return current?.players ?? []; },
    get typeId() { return current?.session.type.id ?? null; },

    // { status: 'none' | 'ok' | 'corrupt' }; corrupt data is discarded.
    load() {
      if (current) return { status: 'ok' };
      const loaded = store.load();
      if (loaded.status !== 'ok') return loaded;
      try {
        current = restore(loaded.snapshot);
        return { status: 'ok' };
      } catch {
        store.clear();
        return { status: 'corrupt' };
      }
    },

    start(typeId, config, players) {
      current = { session: GameSession.create(typeId, config, registry), players };
      save();
    },

    save,

    discard() {
      current = null;
      store.clear();
    },

    // Writes the game and its new players in one transaction, then drops the mirror.
    async finish(repos) {
      const record = current.session.finish();
      const known = await Promise.all(current.players.map((p) => repos.players.get(p.id)));
      await repos.games.save(record, current.players.filter((_, i) => !known[i]));
      this.discard();
      return record;
    },
  };
}
