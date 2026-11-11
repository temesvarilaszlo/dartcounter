# Dart Counter

A personal, mobile-first dart scorer for X01 and Cricket. It runs as an installable, offline-capable PWA on Android Chrome. Vanilla JavaScript (ES modules), no build step, no runtime dependencies. See [PLAN.md](PLAN.md) for the full design.

**Status:** all milestones (0-9) done: app shell, routing, service worker, icons; model core (match format, players, registry, `GameSession`), the X01 and Cricket models, and persistence (IndexedDB repositories with in-memory fakes, localStorage mirror of the game in progress and last used setup, JSON backup export/import with merge), the stats service (all-time stats per player and game type, game history filters), and the playable X01 and Cricket UIs: main menu with resume, pre-game setup (players, sets/legs, start score, in/out rules, prefilled from the last game) and the game screen (X01: keypad, checkout darts; Cricket: dart pad and tally scoreboard, regular and cut-throat; both: leg summary with undo, exit warning), the game detail screen (result, per-player stats, legs with score history, rematch with the throw order rotated) and the statistics screen (all-time stats per game type and player, game history with filters and delete, JSON export/import), plus hardening: the Android back button asks before leaving a game, the screen stays on during a game (wake lock), and the browser is asked to keep the data (persistent storage) at launch and after each saved game.

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

Before a release, run the manual device checklist in PLAN.md (milestone 8): no scrolling on the game screen at 320x568 and 412x915, a whole game in airplane mode, resume after killing the app, back button warning, undo from a fresh leg and the leg summary, export / clear data / import.

Data and the installed app are bound to the tunnel URL, so a new tunnel means an empty app. Treat tunnel installs as test builds.

## Deploy

Live at <https://temesvarilaszlo.github.io/dartcounter/> (install it from Chrome's menu).

Every push to `main` runs `.github/workflows/deploy.yml`: install, tests with the coverage gate, `pnpm precache`, then publishes `index.html`, `manifest.json`, `sw.js`, `precache.js`, `src/`, `icons/` and `assets/` to GitHub Pages. A failing test blocks the deploy. One-time setup: repo Settings > Pages > Source: **GitHub Actions**.

Installed apps pick up a new version on the next launch while online (the service worker is network-first).

Data lives in the browser and is bound to the Pages URL. To move games from a tunnel test install: Stats > Game history > Export there, then Import on the Pages install.
