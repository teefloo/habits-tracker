# AGENTS.md

## Project Overview

Personal, French-language habit-tracking dashboard: a weekly grid (habits × 7 days) where each cell is toggled done/undone with one click. Accounts are mandatory (email + password); data lives in a Neon Postgres database behind Vercel Functions. No framework, no build step on the frontend.

- **Stack**: vanilla HTML/CSS/JS frontend + Vercel Functions (Node, CommonJS `require`) + Neon Postgres via `@neondatabase/serverless`. Single npm dependency, no bundler.
- **Files**: `index.html` (shell: auth / app / blocked views), `styles.css` (all styling), `app.js` (grid logic + API data layer), `auth.js` (session bootstrap, login/register UI, blocked screens), `api/` (Vercel Functions, shared helpers in `api/_lib/`), `schema.sql` (documentation copy of the auto-created schema), `scripts/smoke-test.mjs` (API end-to-end), plus PWA assets: `manifest.json`, `sw.js` (offline cache), `icon-512.png` / `icon-192.png` / `apple-touch-icon.png` (icons, brand: green circle + white check).
- **UI language**: French (`lang="fr"`), all visible strings in French. Do not add English UI text.
- **Philosophy**: minimal, sober, functional. Do not add features, libraries, or decorative elements that weren't asked for.

## Setup Commands

- Full local stack: `vercel dev` (serves static frontend + functions; uses `DATABASE_URL` from `vercel env add DATABASE_URL development` or `.env.local`).
- Without Neon configured, functions return 503 and the app shows a maintenance screen — that is expected behaviour, not a bug.
- API end-to-end: `node scripts/smoke-test.mjs` (against `vercel dev` on port 3000, or `BASE_URL=https://… node scripts/smoke-test.mjs`).
- Syntax check: `node --check app.js auth.js api/*.js api/_lib/*.js "api/habits/[id].js" "api/completions/[habitId]/[date].js"`.

## Architecture / Data Model

State is fetched from `GET /api/state` (single source of truth):

```json
{
  "habits": [{ "id": "2f6b…", "name": "Méditer" }],
  "completions": { "2026-08-18|2f6b…": true }
}
```

- Habit ids are Postgres `uuid`; completions are keyed by `` `${YYYY-MM-DD}|${habitId}` `` (see `keyFor()`); only checked days are stored.
- Weeks run Monday → Sunday (`startOfWeek()`, `addDays()`).
- Database: `users`, `sessions` (hashed tokens, 30-day expiry), `habits` (name ≤ 60 chars, per user), `completions` (PK user+habit+day). Schema is auto-created idempotently in `api/_lib/db.js` (`ensureSchema()`, module-flag guarded); keep `schema.sql` in sync if you change it.
- Flow: `auth.js init()` → `GET /api/me` → 200: `app.loadState()` (`GET /api/state`) → `render()` → `renderRange()` + `renderDayHeaders()` + `renderRows()`. 401 reloads the page (session gone); 503 shows the maintenance screen.
- Mutations (`PUT`/`DELETE` completion, `POST` habit, `DELETE` habit) return 204; `app.js` then re-fetches `/api/state` via `fetchState()` — never update local state optimistically, never touch `localStorage` for data.
- `api/_lib/http.js`: `handle()` wraps every endpoint (uniform `{error}` JSON, 500 → JSON). `api/_lib/auth.js`: scrypt (`scrypt$<salt>$<hash>`), session cookie `session` (HttpOnly, Secure, SameSite=Lax), `requireUser()`, in-memory rate limiter (assumed stateless).

## Development Workflow

- Edit files directly; `vercel dev` serves changes, refresh the browser to see them.
- No watch/hot-reload tooling exists — do not introduce a bundler or dev server config.
- Verify JS syntax with `node --check` (see Setup Commands).
- Use the browser for interaction checks (see Testing).

## Testing Instructions

There is no test framework. Verification is done by hand, via `scripts/smoke-test.mjs` (needs Neon configured), or via headless Chrome:

- Static checks: `node --check` on every JS file; visually confirm CSS braces balance.
- Headless DOM checks (`document.title`/`#blocked-*` JSON assertions via dump-dom):
  ```
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --dump-dom --virtual-time-budget=5000 http://127.0.0.1:3000/
  ```
  With no `DATABASE_URL`: `#blocked-view` must be visible with the maintenance message. With a session cookie: grid renders, today column (`is-today` / `aria-current="date"`) is right, counts read `n/7`, sticky name column stays pinned when `.grid-scroll` is scrolled horizontally on mobile widths.
- After any change, re-check: empty state renders, login form shows for 401, maintenance screen for 503, offline screen on network failure, and mutation flows (toggle → `aria-pressed` + `.row-count` after refetch; delete flow removes the row; add form adds it and refocuses).

## Code Style

- Frontend: vanilla ES2020+ JS, no imports, no modules, plain `function` declarations. Backend: CommonJS (`require`/`module.exports`), async/await.
- IDs/classes in kebab-case; camelCase for JS variables.
- No code comments (per project convention). Use descriptive function names instead.
- UI strings: French, lowercase after the first word, no trailing punctuation inside buttons/labels. API error messages are French sentences ending with a period.
- CSS: custom properties in `:root` (light + dark via `prefers-color-scheme`), one muted green accent (`--accent`), system font stack, no external fonts or icons. Target WCAG AA contrast, `:focus-visible` rings, and respect `prefers-reduced-motion`. `[hidden]` is enforced with `display: none !important` — use the `hidden` attribute for toggling views.
- Formatting: 2-space indent, single quotes, semicolons, max ~90 chars per line.

## Build and Deployment

- Git push to `main` auto-deploys to Vercel (project `habits-tracker`, team `teeflo`): static frontend + functions. No build step.
- `DATABASE_URL` must be set in Vercel env (`vercel env add DATABASE_URL` → production); until then the deployed app shows the maintenance screen by design.
- One npm dependency (`@neondatabase/serverless`); do not add more.

## Gotchas

- `#day-headers` and `#rows` must stay `display: contents` — they are non-rendering containers whose children participate in the `#grid` grid (sticky name column + day columns).
- `renderRows()` sets `row.dataset.habit`; count updates happen through full re-renders after `fetchState()` — keep the `data-habit` attribute if row markup changes.
- Delete is two-step (inline "Supprimer ?" confirm, 4 s auto-revert) to prevent accidental loss — keep that safeguard; the confirm button disables itself during the request and reverts on network failure.
- The add form must re-focus after submit; the new habit must appear in the current week's grid immediately (after the state refetch).
- Today column highlighting must use `aria-current="date"` only for the actual today column.
- The service worker (`sw.js`) is cache-first: bump `CACHE_NAME` (e.g. `habits-tracker-v3`) whenever `app.js`, `auth.js`, `styles.css`, or `index.html` change, otherwise installed users get stale assets. Note: offline cache covers the shell only — API calls fail offline and show the sync banner.
- `[hidden]` is a hard rule (`display: none !important`): elements with `display: flex` (`.add-form`, `.empty`, `.auth-form`, `.sync-error`) are still hidden correctly — do not remove that rule.
- `completions` keys use UTC-free local dates from `to_char(day, 'YYYY-MM-DD')` server-side and `dateKey()` client-side; keep both as local `YYYY-MM-DD` strings.
- 401 responses make `app.js` reload the page (session expiry) — don't change that to a silent refetch, or stale data will show.