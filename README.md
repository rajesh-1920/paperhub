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

### Option A — Docker Compose (app + MongoDB, recommended)

The whole stack — the Node app and a MongoDB database — runs with one command:

```bash
docker compose up -d --build
```

Then open **http://localhost:7000**. The database (and the bundled demo PDFs) is
seeded automatically on first run and persists in a Docker volume. Useful
commands:

```bash
docker compose logs -f app     # tail app logs
docker compose down            # stop (keeps the data volume)
docker compose down -v         # stop and wipe the database
```

The app runs as a non-root user and ships a container healthcheck. Secrets and
other settings are read from an optional `.env` file next to the compose file
(see [Configuration](#configuration)); the bundled defaults are fine for a local
demo.

### Option B — Docker Compose, no database (JSON-file store)

Zero external dependencies — a single container that keeps its data in a JSON
file plus an uploads folder, both persisted in a Docker volume:

```bash
docker compose -f docker-compose.jsonstore.yml up -d --build
```

Same URL (**http://localhost:7000**), same auto-seeded demo data. Stop/wipe with
`docker compose -f docker-compose.jsonstore.yml down [-v]`.

### Option C — Node directly (JSON-file database, no Docker)

```bash
npm install
npm run dev        # start the server with --watch on http://localhost:7000
# or: npm run serve
```

By default the database is the JSON file — no extra setup needed.

#### Optional: MongoDB without Compose

```bash
npm run db:up                          # start MongoDB in Docker (mongo:7)
cp .env.example .env                   # contains MONGODB_URI=mongodb://localhost:27017
npm run db:migrate                     # seed MongoDB from server/seed.json
npm run dev                            # server now logs "database: MongoDB (paperhub)"
# when done: npm run db:down
```

The storage backend is chosen automatically: **MongoDB when `MONGODB_URI` is set,
the JSON file otherwise.** Nothing else in the app changes.

### Demo logins

| Role    | Email                           | Password    |
| ------- | ------------------------------- | ----------- |
| Admin   | `rajesh.biswas@paperhub.com.bd` | `admin01`   |
| Officer | `rajdip.roy@paperhub.com.bd`    | `officer01` |
| User    | `mahmud.hasan@paperhub.edu.bd`  | `user01`    |

To reset everything to the original sample data: **Settings → Security → Reset
demo data** (which calls `POST /api/reset`).

## Configuration

All settings come from the environment. Copy `.env.example` to `.env` (the
compose files load it automatically; `npm start`/`npm run dev` load it too). At
minimum set strong token secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # one per secret
```

| Variable                        | Default                | Purpose                                                                     |
| ------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `PORT`                          | `7000`                 | HTTP port the server listens on.                                            |
| `MONGODB_URI`                   | _(unset)_              | Set it to use MongoDB; leave it unset for the JSON-file store.              |
| `MONGODB_DB`                    | `paperhub`             | Database name when using MongoDB.                                           |
| `JWT_SECRET` / `REFRESH_SECRET` | dev fallback           | Token signing secrets. **Required** (≥16 chars) when `NODE_ENV=production`. |
| `ACCESS_TTL` / `REFRESH_TTL`    | `3650d`                | Access/refresh token lifetimes (e.g. `15m`, `7d`).                          |
| `BCRYPT_ROUNDS`                 | `12`                   | bcrypt cost factor for password hashing.                                    |
| `GOOGLE_CLIENT_ID`              | project default        | OAuth web client id for "Sign in with Google"; empty hides it.              |
| `PAPERHUB_DB_FILE`              | `public/assets/data/…` | JSON-store database file (the Docker image defaults it to `/data`).         |
| `PAPERHUB_UPLOAD_DIR`           | `server/uploads`       | JSON-store uploaded-PDF directory (the image defaults it to `/data`).       |

In the containers, JSON-store data (the database file + uploaded PDFs) lives in
the `/data` volume so it survives restarts; the MongoDB stack keeps everything
(including binaries in GridFS) in the `mongo-data` volume.

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
│   ├── db.js                   # storage façade (picks the backend)
│   ├── stores/                 # jsonStore (file) + mongoStore (MongoDB)
│   ├── migrate.js              # seed the configured database
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
