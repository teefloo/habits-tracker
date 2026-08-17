# AGENTS.md

## Project Overview

Personal, French-language habit-tracking dashboard: a weekly grid (habits × 7 days) where each cell is toggled done/undone with one click. No accounts, no backend — data lives in `localStorage` and never leaves the browser.

- **Stack**: vanilla HTML/CSS/JS. Zero dependencies, no build step, no package manager, no framework.
- **Files**: `index.html` (shell), `styles.css` (all styling), `app.js` (all logic), plus PWA assets: `manifest.json`, `sw.js` (offline cache), `icon-512.png` / `icon-192.png` / `apple-touch-icon.png` (icons, brand: green circle + white check).
- **UI language**: French (`lang="fr"`), all visible strings in French. Do not add English UI text.
- **Philosophy**: minimal, sober, functional. Do not add features, libraries, or decorative elements that weren't asked for.

## Setup Commands

No installation, build, or dependency management exists. The site runs as static files.

- Open directly: `open index.html`
- Or serve locally: `python3 -m http.server 8000` then visit `http://localhost:8000`

## Architecture / Data Model

State is stored in `localStorage` under the key `habits-tracker.v1`:

```json
{
  "habits": [{ "id": "h1", "name": "Méditer" }],
  "completions": { "2026-08-17|h1": true }
}
```

- `id` is a random alphanumeric string (`newId()`).
- Completions are keyed by `` `${YYYY-MM-DD}|${habitId}` `` (see `keyFor()`); only checked days are stored.
- Weeks run Monday → Sunday (`startOfWeek()`, `addDays()`).
- All reads/writes go through `load()` / `save()`; never touch `localStorage` directly elsewhere.

Flow: `load()` → `render()` → `renderRange()` + `renderDayHeaders()` + `renderRows()`; cell updates after a toggle go through `updateCell()` (recomputes the `n/7` count, never re-renders the whole grid).

## Development Workflow

- Edit the three files directly; refresh the browser to see changes.
- No watch/hot-reload tooling exists — do not introduce a bundler or dev server config.
- Verify JS syntax: `node --check app.js`
- Use the browser for interaction checks (see Testing).

## Testing Instructions

There is no test framework. Verification is done by hand or via headless Chrome smoke checks:

- Static checks: `node --check app.js`; visually confirm CSS braces balance.
- Interaction smoke test (seed data + DOM assertions via `document.title` JSON, as done during initial dev):
  ```
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --dump-dom --virtual-time-budget=5000 http://127.0.0.1:8000/
  ```
  Serve a copy with a seed script inserted before `<script src="app.js">` (seed writes `localStorage` first), then assert: toggle toggles `aria-pressed` and updates `.row-count`, delete flow removes the row, add form adds it, week nav updates `#week-range`.
- After any change, re-check: empty state renders, today column (`is-today` / `aria-current="date"`) is right, counts read `n/7`, and the sticky name column stays pinned when `.grid-scroll` is scrolled horizontally on mobile widths.

## Code Style

- Vanilla ES2020+ JS, no imports, no modules. Plain `function` declarations (see `app.js`).
- IDs/classes in kebab-case; camelCase for JS variables.
- No code comments (per project convention). Use descriptive function names instead.
- UI strings: French, lowercase after the first word, no trailing punctuation inside buttons/labels.
- CSS: custom properties in `:root` (light + dark via `prefers-color-scheme`), one muted green accent (`--accent`), system font stack, no external fonts or icons. Target WCAG AA contrast, `:focus-visible` rings, and respect `prefers-reduced-motion`.
- Formatting: 2-space indent, single quotes, semicolons, max ~90 chars per line.

## Build and Deployment

No build or deploy pipeline. The project is served as-is by any static file server. Do not add build tooling.

## Gotchas

- `#day-headers` and `#rows` must stay `display: contents` — they are non-rendering containers whose children participate in the `#grid` grid (sticky name column + day columns).
- `renderRows()` sets `row.dataset.habit`; `updateCell()` locates the row via `.row[data-habit="..."] .row-count` — keep that attribute in sync if the row markup changes.
- Delete is two-step (inline "Supprimer ?" confirm) to prevent accidental loss — keep that safeguard.
- The add form must reset and re-focus after submit; the new habit must appear in the current week's grid immediately.
- `week-start` column highlighting (today) must use `aria-current="date"` only for the actual today column.
- The service worker (`sw.js`) is cache-first: bump `CACHE_NAME` (e.g. `habits-tracker-v2`) whenever `app.js`, `styles.css`, or `index.html` change, otherwise installed users get stale assets.