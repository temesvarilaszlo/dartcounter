export const ROUTES = [
  { name: 'menu', path: '/' },
  { name: 'preGame', path: '/new/:typeId' },
  { name: 'game', path: '/game' },
  { name: 'gameDetail', path: '/games/:id' },
  { name: 'stats', path: '/stats' },
];

export function matchRoute(routes, hash) {
  const [path, queryString = ''] = (hash.replace(/^#/, '') || '/').split('?');
  const segments = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryString));

  for (const route of routes) {
    const parts = route.path.split('/').filter(Boolean);
    if (parts.length !== segments.length) continue;
    const params = {};
    const matches = parts.every((part, i) => {
      if (!part.startsWith(':')) return part === segments[i];
      params[part.slice(1)] = safeDecode(segments[i]);
      return params[part.slice(1)] !== null;
    });
    if (matches) return { name: route.name, params, query };
  }
  return null;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export class Router {
  constructor(routes, onRoute) {
    this.routes = routes;
    this.onRoute = onRoute;
  }

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }

  resolve() {
    const route = matchRoute(this.routes, window.location.hash);
    if (!route) {
      window.location.replace('#/');
      return;
    }
    this.onRoute(route);
  }
}
