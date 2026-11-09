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
- If a rule or requirement is unclear, ask the user.
- Keep `README.md` up to date; commit once per completed milestone.
