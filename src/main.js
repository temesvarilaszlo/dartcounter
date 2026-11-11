import { ROUTES, Router } from './controllers/router.js';
import { AppController } from './controllers/appController.js';
import { createActiveGame } from './controllers/activeGame.js';
import { createRegistry } from './model/gameTypes/registry.js';
import { x01 } from './model/gameTypes/x01/index.js';
import { cricket } from './model/gameTypes/cricket/index.js';
import { openDatabase } from './model/persistence/idb.js';
import { createGameRepository } from './model/persistence/gameRepository.js';
import { createPlayerRepository } from './model/persistence/playerRepository.js';
import { createMemoryRepositories } from './model/persistence/memoryRepositories.js';
import { createActiveGameStore, createLastConfigStore } from './model/persistence/activeGameStore.js';
import { viewParts } from './views/gameTypes/index.js';
import { showToast } from './views/components/toast.js';

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (new URLSearchParams(window.location.search).has('nosw')) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register('./sw.js');
}

// Without IndexedDB (blocked or broken) the app still runs; games just are not kept.
async function openRepositories() {
  try {
    const db = await openDatabase(indexedDB);
    return { games: createGameRepository(db), players: createPlayerRepository(db) };
  } catch (error) {
    console.error('IndexedDB unavailable', error);
    showToast("Storage is unavailable: finished games won't be kept.");
    return createMemoryRepositories();
  }
}

// Asks the browser not to evict IndexedDB under storage pressure. Chrome grants
// it based on engagement, so it is asked again after every saved game until granted.
async function persistStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch (error) {
    console.error('Persistent storage request failed', error);
  }
}

const registry = createRegistry().register(x01).register(cricket);
const ctx = {
  root: document.getElementById('app'),
  navbar: document.getElementById('navbar'),
  registry,
  viewParts,
  repos: await openRepositories(),
  activeGame: createActiveGame({ store: createActiveGameStore(localStorage), registry }),
  lastConfig: createLastConfigStore(localStorage),
  // replace: leave the current entry out of the back stack (used when leaving a game).
  navigate: (hash, { replace = false } = {}) => {
    if (window.location.hash === hash) router.resolve();
    else if (replace) window.location.replace(hash);
    else window.location.hash = hash;
  },
  persistStorage,
};
const app = new AppController(ctx);
const router = new Router(ROUTES, (route) => app.show(route));
router.start();

persistStorage();
setupServiceWorker().catch((error) => console.error('Service worker setup failed', error));
