# Dart Counter

See @PLAN.md for the full plan (source of truth).

- All Node/pnpm commands run in the dev container, never on the host:
  - `docker compose up` (dev server on port 8080)
  - `docker compose run --rm app pnpm test`
  - `docker compose run --rm app pnpm test:coverage`
  - `docker compose run --rm app pnpm add -D <pkg>`
- pnpm only, never npm or yarn.
- `src/model/**` must never reference `document`, `window`, `navigator` or any DOM API. Platform dependencies (storage, clock, id generator) are injected.
- Persist the **event log** (config + turns), never derived state.
- X01 turns store only the 3-dart total and the dart count (no per-dart values).
- Use the `frontend-design` skill before editing `src/views/**`, `src/styles/**`, `index.html`.
- Never use `<input type="number">` or the native numeric keyboard; numeric input goes through the on-screen keypad.
- UI changes: check them in headless Chromium before committing. The harness lives in `.e2e/` (local only: hidden dot-folder, listed in `.git/info/exclude`, so `ls`/`git ls-files` won't show it):
  - `docker compose up -d`, then `VIEW=320x568 sh .e2e/run.sh <scenario>.mjs` (also run 412x915). It joins the app container's network, so it works even when the sandbox blocks localhost.
  - If the image is missing: `docker build -t dartcounter-e2e-scratch .e2e`.
  - A scenario exports `default async (t) => {}` using `t.viewport/goto/click/type/keys/eval/text/shot` (see `.e2e/cdp.mjs`, examples in `.e2e/*.mjs`). Use `?nosw=1` in URLs.
  - Screenshots land in `.e2e/shots/`; look at them, since layout bugs (overflow, clipped content) don't show up in assertions.
- If a rule or requirement is unclear, ask the user.
- Keep `README.md` up to date.
- Every push to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`). Do features and fixes on a branch (`feature/<name>`, `fix/<name>`) created from `main`, and merge into `main` only when the user says so.

## Working on changes

- One change per session and per branch (`fix/<topic>`, `feat/<topic>`). Don't mix unrelated changes.
- Bug fixes: first write a failing test that reproduces the bug, then fix it, then confirm the test passes.
- New features: plan first. Read @PLAN.md and the relevant code, propose an approach with acceptance criteria, and wait for approval before implementing.
- If a requirement or game rule is unclear, ask instead of guessing.
- Keep @PLAN.md current: if behaviour, rules, screens or the data model change, update it in the same branch.

## Data safety

- Any change to the shape of a stored record (games, players, active-game mirror, export file) requires: a `schemaVersion` bump, a migration in `src/model/persistence/idb.js`, a test that migrates a fixture of the old format, and export/import support for both versions.
- Never change or delete existing stored fields without a migration.
- Remind me to export a JSON backup before I run a migration on my real data.

## Definition of done

- `npm run test:coverage` passes (model coverage stays at or above 90%).
- New rules, stats and persistence changes have tests.
- `PLAN.md` is updated if behaviour changed.
- Summarise what changed in one or two sentences, and list anything I need to verify by hand.