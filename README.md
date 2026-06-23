# PaperHub

[![CI](https://github.com/rajesh-1920/paperhub/actions/workflows/ci.yml/badge.svg)](https://github.com/rajesh-1920/paperhub/actions/workflows/ci.yml)

PaperHub is a SaaS-style **document-management app**: a vanilla HTML + Tailwind +
JavaScript frontend (no framework, no bundler) served by a small **Node/Express
backend** that uses a **JSON file as its database**. It has a public landing
page, role-based auth, dashboards for users/officers/admins, file and review
workflows, payment screens, and account pages.

It is **fully interactive**: uploads, reviews, edits, settings, and payments
persist to `public/assets/data/paperhub-backend.json` through the backend API,
so changes survive reloads and are shared across the app. See
[ARCHITECTURE.md](ARCHITECTURE.md) for how it works.

> ⚠️ **Demo only.** Authentication and authorization are client-side and the API
> is unauthenticated, so everything is trivially bypassable. Do not deploy with
> real data. See [SECURITY.md](SECURITY.md).

## Quick start

```bash
npm install
npm run dev        # start the server with --watch on http://localhost:8000
# or: npm run serve
```

Then open http://localhost:8000.

### Demo logins

| Role    | Email                           | Password    |
| ------- | ------------------------------- | ----------- |
| Admin   | `rajesh.biswas@paperhub.com.bd` | `admin01`   |
| Officer | `rajdip.roy@paperhub.com.bd`    | `officer01` |
| User    | `mahmud.hasan@paperhub.edu.bd`  | `user01`    |

To reset everything to the original sample data: **Settings → Security → Reset
demo data** (which calls `POST /api/reset`).

## API

The backend (`server/`) exposes a tiny REST API backed by the JSON file:

| Method & path      | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `GET /api/dataset` | Read the full dataset                          |
| `PUT /api/dataset` | Persist the dataset (atomic write to the file) |
| `POST /api/reset`  | Restore the dataset from the pristine seed     |
| `GET /api/health`  | Liveness check                                 |

## What works

- **User** — upload documents (creates real, persistent files + a review-queue
  entry), view/download/delete files, edit profile, change settings, confirm
  payment.
- **Officer** — approve / reject / forward reviews (syncs the file status), add
  comments.
- **Admin** — add and edit users (new accounts can actually log in), live
  dashboard tables/activity/infrastructure.
- **Everyone** — notifications, dark mode, SPA-style navigation.

## Project layout

```text
paperhub/
├── server/                     # Node/Express backend
│   ├── index.js                # REST API + static hosting
│   ├── db.js                   # atomic read/write of the JSON database
│   └── seed.json               # pristine dataset used by /api/reset
├── public/                     # frontend, served by the backend
│   ├── index.html
│   ├── _headers                # security headers for static hosts
│   ├── components/             # navbar / sidebar / footer partials
│   ├── pages/                  # auth, dashboard, file, review, payment, account, support
│   └── assets/
│       ├── data/paperhub-backend.json   # the JSON database (read/written by the server)
│       ├── js/                 # app scripts (shared-global architecture)
│       └── css/                # compiled Tailwind + component/page styles
├── src/css/input.css           # Tailwind source
├── tests/                      # node:test + jsdom suite
├── ARCHITECTURE.md  CONTRIBUTING.md  SECURITY.md
└── tailwind.config.js
```

## Development

```bash
npm test                # node:test + jsdom suite
npm run lint            # ESLint (flat config)
npm run format:check    # Prettier
npm run check           # lint + format + test (what CI runs)
npm run build:css       # compile + minify Tailwind into public/assets/css/tailwind.css
```

CI runs lint, format check, tests, and the CSS build on Node 20 and 22 for every
push/PR to `main` and `dev`. See [CONTRIBUTING.md](CONTRIBUTING.md) before
sending a change.

## Deploy

PaperHub now needs a Node runtime (the backend serves the app and owns the JSON
database). Run `npm ci --omit=dev && npm start` on any Node host. The compiled
`public/assets/css/tailwind.css` is committed, so no CSS build step is needed at
deploy time. (The `_headers` file still applies on hosts that read it; for a
Node host, set the equivalent response headers at your proxy.)

## License

[MIT](LICENSE)
