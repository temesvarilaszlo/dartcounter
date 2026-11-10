# Dart Counter

A personal, mobile-first dart scorer for X01 and Cricket. It runs as an installable, offline-capable PWA on Android Chrome. Vanilla JavaScript (ES modules), no build step, no runtime dependencies. See [PLAN.md](PLAN.md) for the full design.

**Status:** milestones 0-6 done: app shell, routing, service worker, icons; model core (match format, players, registry, `GameSession`), the X01 and Cricket models, and persistence (IndexedDB repositories with in-memory fakes, localStorage mirror of the game in progress and last used setup, JSON backup export/import with merge), the stats service (all-time stats per player and game type, game history filters), and the playable X01 and Cricket UIs: main menu with resume, pre-game setup (players, sets/legs, start score, in/out rules, prefilled from the last game) and the game screen (X01: keypad, checkout darts; Cricket: dart pad and tally scoreboard, regular and cut-throat; both: leg summary with undo, exit warning).

## Development

Everything Node-related runs in the dev container (Docker Compose, `node:22-alpine`, pnpm via corepack).

```sh
docker compose up                                # install deps, serve on http://localhost:8080
docker compose run --rm app pnpm test            # run tests
docker compose run --rm app pnpm test:coverage   # tests + 90% model coverage gate
docker compose run --rm app pnpm icons           # regenerate icons/*.png
```

`pnpm dev` regenerates `precache.js` (the service worker's file list and version hash) before serving, so the offline cache always matches the source. `precache.js` is gitignored.

Add `?nosw=1` to the URL to unregister the service worker while debugging.

## Testing on the phone

1. `docker compose up`.
2. In VS Code, open the Ports panel and forward port 8080. This gives an HTTPS `*.devtunnels.ms` URL.
3. Open that URL in Chrome on the phone (sign in with the same account, or set the port to Public) and install the app from the menu.

Data and the installed app are bound to the tunnel URL, so a new tunnel means an empty app. Treat tunnel installs as test builds.

## Deploy

GitHub Pages via Actions (milestone 9, not set up yet).
