# Architecture

PaperHub is a static, multi-page document-management frontend built with plain
HTML, Tailwind CSS, and vanilla JavaScript — no framework and no bundler. This
document explains how the moving parts fit together.

## High-level shape

```
public/
├── index.html              Landing page
├── _headers                Security headers for static hosts
├── components/             navbar / sidebar / footer partials (fetched at runtime)
├── pages/                  Auth, dashboard, file, review, payment, account, support
└── assets/
    ├── data/paperhub-backend.json   The seed "database" (3 people, 30 files)
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

## Data: one seed + a localStorage overlay

`public/assets/data/paperhub-backend.json` is the **read-only seed**. At runtime
the app layers a mutable, `localStorage`-backed store on top of it:

- `getPaperHubDataset()` returns the working dataset — from `localStorage` if a
  saved copy exists and its version matches `PAPERHUB_DB_VERSION`, otherwise it
  loads the seed (synchronous `XMLHttpRequest`) and caches it on `window`.
- The `ph*` mutators (`phAddFile`, `phUpdateUser`, `phSetReviewStatus`,
  `phAddReviewComment`, `phSaveUserPreferences`, `phSetPaymentStatus`,
  `phDeleteFile`, …) mutate that dataset and call `persistPaperHubData()`, which
  writes it back to `localStorage`.
- Bumping `PAPERHUB_DB_VERSION` invalidates any stored copy and reseeds — this is
  how you ship dataset changes. `resetPaperHubData()` (wired to **Settings →
  Security → Reset demo data**) clears the overlay.

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
`localStorage` and the dataset `XHR`, and evaluates the browser scripts so tests
can call the page functions exactly as the browser would
(`runScripts: "outside-only"` + `window.eval`). This is why the tests assert on
`window.*` globals rather than importing modules.

Coverage: the persistence layer (`store.test.mjs`), dynamic rendering
(`render.test.mjs`), end-to-end flows (`flows.test.mjs`), confirmed-bug
regressions (`regressions.test.mjs`), output-escaping/validation
(`security.test.mjs`), and seed integrity (`seed.test.mjs`).

## Build & deploy

- `npm run build:css` compiles `src/css/input.css` → `public/assets/css/tailwind.css`
  (minified). The compiled CSS **is committed** because the site is served
  statically with no build step at deploy time.
- Deploy by serving `public/` on any static host. Hosts that read `_headers`
  (Netlify, Cloudflare Pages) pick up the security headers automatically.
