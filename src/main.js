import { ROUTES, Router } from './controllers/router.js';
import { AppController } from './controllers/appController.js';

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (new URLSearchParams(window.location.search).has('nosw')) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register('./sw.js');
}

const app = new AppController({
  root: document.getElementById('app'),
  navbar: document.getElementById('navbar'),
});
new Router(ROUTES, (route) => app.show(route)).start();

setupServiceWorker().catch((error) => console.error('Service worker setup failed', error));
