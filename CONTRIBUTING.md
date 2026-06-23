# Contributing to PaperHub

Thanks for helping improve PaperHub! This is a vanilla-JS + Tailwind static
frontend. Please keep changes proportionate to that — no frameworks or bundlers.

## Setup

```bash
npm install
npm run serve      # serve public/ on http://localhost:8000
# or: npm run dev  # serve with cache disabled and open a browser
```

Requires Node `>= 18` (see `.nvmrc`).

## Scripts

| Command                                   | What it does                                                   |
| ----------------------------------------- | -------------------------------------------------------------- |
| `npm run serve` / `npm run dev`           | Serve `public/`                                                |
| `npm run build:css`                       | Compile Tailwind → `public/assets/css/tailwind.css` (minified) |
| `npm run watch:css`                       | Rebuild Tailwind on change                                     |
| `npm test`                                | Run the `node:test` + jsdom suite                              |
| `npm run lint`                            | ESLint                                                         |
| `npm run format` / `npm run format:check` | Prettier write / check                                         |
| `npm run check`                           | lint + format check + test (what CI runs)                      |

CI (`.github/workflows/ci.yml`) runs lint, format check, tests, and the CSS
build on Node 20 and 22 for every push/PR to `main` and `dev`.

## Before you push

```bash
npm run check
```

All three must pass. If you changed Tailwind classes, run `npm run build:css`
and commit the regenerated `public/assets/css/tailwind.css` (it ships in the
repo — the site is served statically with no build step).

## Conventions

- **Architecture.** Read [ARCHITECTURE.md](ARCHITECTURE.md). The browser scripts
  share a global namespace; `utils.js` loads first and defines the shared API.
- **Escaping policy (important).** Any value derived from the dataset or user
  input that is interpolated into `innerHTML` **must** be wrapped in
  `escapeHtml()`. Prefer `textContent` for plain text. This is enforced by
  review and covered by `tests/security.test.mjs`.
- **Data changes.** Mutate state only through the `ph*` mutators in `utils.js`
  (never write `localStorage["paperhub-db"]` directly). If you change the seed
  schema or contents, bump `PAPERHUB_DB_VERSION` so stored copies reseed.
- **Add a test** for any bug fix or new store behavior. The helper
  `tests/helpers/dom.mjs > bootPage()` makes it easy to drive a real page in
  jsdom.
- **Theme is locked.** Do not change the core dashboard colors, gradients, or
  role color schemes without an explicit request (see `.instructions.md`).
  CSS changes to _align_ pages with the existing theme are welcome.

## Commit style

Conventional-ish prefixes are used in history: `feat:`, `fix:`, `chore:`,
`refactor:`, `docs:`, `test:`. Keep commits focused.
