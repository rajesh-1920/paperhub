# Architecture

PaperHub is a multi-page document-management app: a plain HTML + Tailwind +
vanilla-JavaScript frontend (no framework, no bundler) served by a small
Node/Express backend that uses a JSON file — or MongoDB — as its database. This
document explains how the moving parts fit together.

## High-level shape

```
server/
├── index.js               Express app: REST API + static hosting
├── db.js                  storage façade (JSON file or MongoDB)
├── stores/                jsonStore.js + mongoStore.js
├── migrate.js             seed the configured database
└── seed.json              pristine dataset used by POST /api/reset
public/
├── index.html              Landing page
├── _headers                Security headers for static hosts
├── components/             navbar / sidebar / footer partials (fetched at runtime)
├── pages/                  Auth, dashboard, file, review, payment, account, support
└── assets/
    ├── data/paperhub-backend.json   The JSON database (3 people, 30 files)
    ├── js/                 Application scripts (shared-global architecture)
    └── css/                Tailwind build output + component/page styles
src/css/input.css           Tailwind source (compiled to assets/css/tailwind.css)
tests/                      node:test + jsdom suite
```

## The shared-global script layer

The browser scripts are loaded as **classic `<script>` files** (not ES modules)
and deliberately share a single global namespace. `utils.js` defines helpers
(`getElement`, `escapeHtml`, `formatDate`, the data store, …) that the other
scripts (`main.js`, `file.js`, `review.js`, `navbar.js`, `auth.js`,
`profile.js`) call directly. Load order matters: `utils.js` first, then the
page scripts.

Because of this, ESLint runs with `no-undef`/`no-unused-vars` disabled for
`public/assets/js/**` (cross-file references and the global "exported" API would
otherwise look like errors). See `eslint.config.js` for the rationale.

## Data: pluggable storage behind one REST contract

The Node backend (`server/`) owns the database and the frontend reads/writes it
through a REST API:

| Method & path      | Purpose                                     |
| ------------------ | ------------------------------------------- |
| `GET /api/dataset` | return the current dataset                  |
| `PUT /api/dataset` | overwrite the dataset                       |
| `POST /api/reset`  | restore the dataset from `server/seed.json` |

`server/db.js` is a **façade over two interchangeable stores**, chosen at call
time by `MONGODB_URI`:

- **`server/stores/jsonStore.js`** (default, and the CI/test fallback) —
  `public/assets/data/paperhub-backend.json` is the database. Writes are
  serialized through an in-process lock and written atomically (temp file +
  `rename`). Paths are overridable via `PAPERHUB_DB_FILE` / `PAPERHUB_SEED_FILE`.
- **`server/stores/mongoStore.js`** (when `MONGODB_URI` is set) — each dataset
  array maps to a MongoDB collection (`users`, `files`, `reviewQueue`,
  `authAccounts`) plus a `meta` document. The store **assembles** the dataset on
  read (projecting out Mongo's `_id`) and **splits** it across collections on
  write, so the `/api/dataset` contract — and therefore the entire frontend — is
  unchanged. `npm run db:up` starts MongoDB in Docker; `npm run db:migrate` seeds
  it from `server/seed.json`.

Because both stores expose the same `ensureDataset/readDataset/writeDataset/
resetDataset` interface, switching databases touches nothing outside `server/`.

On the frontend, the data layer keeps its synchronous model but talks to the API:

- `getPaperHubDataset()` loads `GET /api/dataset` via synchronous `XMLHttpRequest`
  (falling back to the static JSON file if the API is unreachable) and caches it
  on `window`.
- The `ph*` mutators (`phAddFile`, `phUpdateUser`, `phSetReviewStatus`,
  `phAddReviewComment`, `phSaveUserPreferences`, `phSetPaymentStatus`,
  `phDeleteFile`, …) mutate the in-memory dataset and call
  `persistPaperHubData()`, which `PUT`s it back to the server.
- `resetPaperHubData()` (wired to **Settings → Security → Reset demo data**)
  `POST`s `/api/reset`.

Because consumers read through `getPaperHubDataset()` and accessors read the
dataset **fresh** each call (e.g. `getReviewData()`, `getMockUsers()`), changes
are reflected everywhere — including after SPA-style navigation, where module
state persists but the underlying arrays may have been replaced.

## Rendering: data-attribute binding + renderers

- **Declarative binding.** `main.js > applyCurrentUserPageData()` populates
  elements tagged with `data-*` attributes (`data-user-name`,
  `data-dashboard-stat="…"`, `data-user-files`, …) from the current user.
- **Dashboards.** `renderDashboard()` computes per-role stats and renders the
  admin/officer/user tables, activity feeds, and infrastructure cards from the
  live dataset.
- **Page renderers.** `file.js` (files list, upload, version history),
  `review.js` (queue + details), and `navbar.js` (identity, notifications,
  theme) own their pages' dynamic markup.

All dynamic values interpolated into `innerHTML` are escaped with
`escapeHtml()`; plain text uses `textContent`.

## Navigation

`navbar.js` implements SPA-style partial navigation: clicking a
`[data-app-href]` link fetches the target page, swaps the `<main>` content, and
re-runs the relevant page initializer — avoiding full reloads while keeping the
navbar/sidebar mounted.

## Testing

The suite under `tests/` runs on Node's built-in `node:test` with **jsdom**.
`tests/helpers/dom.mjs > bootPage()` loads a real page into jsdom, stubs
`localStorage` and replaces `XMLHttpRequest` with a **tiny in-memory PaperHub
API** (GET returns the dataset, PUT replaces it, POST `/api/reset` restores the
seed), then evaluates the browser scripts so tests call the page functions
exactly as the browser would (`runScripts: "outside-only"` + `window.eval`).
This is why the tests assert on `window.*` globals rather than importing modules.

Coverage: the persistence layer (`store.test.mjs`), cross-collection status sync
(`sync.test.mjs`), dynamic rendering (`render.test.mjs`), end-to-end flows
(`flows.test.mjs`), enabled actions (`actions.test.mjs`), confirmed-bug
regressions (`regressions.test.mjs`), output-escaping/validation
(`security.test.mjs`), seed integrity (`seed.test.mjs`), the backend API over the
JSON store (`server.test.mjs`), and the MongoDB store against an in-memory mongod
(`mongo.test.mjs`, which skips if the binary is unavailable).

## Build & deploy

- `npm run build:css` compiles `src/css/input.css` → `public/assets/css/tailwind.css`
  (minified). The compiled CSS **is committed** so no CSS build step is needed at
  deploy time.
- Deploy on any Node host: `npm ci --omit=dev && npm start` (the backend serves
  the app and owns the JSON database). Set security response headers at your
  proxy; the `public/_headers` file applies on hosts that read it.
