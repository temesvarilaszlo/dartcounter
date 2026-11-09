export function createRegistry() {
  const types = new Map();
  return {
    register(type) {
      if (!type?.id) throw new Error('A game type needs an id');
      if (types.has(type.id)) throw new Error(`Game type "${type.id}" is already registered`);
      types.set(type.id, type);
      return this;
    },
    has: (id) => types.has(id),
    get(id) {
      if (!types.has(id)) throw new Error(`Unknown game type "${id}"`);
      return types.get(id);
    },
    list: () => [...types.values()],
  };
}
