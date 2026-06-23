# PaperHub

[![CI](https://github.com/rajesh-1920/paperhub/actions/workflows/ci.yml/badge.svg)](https://github.com/rajesh-1920/paperhub/actions/workflows/ci.yml)

PaperHub is a static, SaaS-style **document-management frontend** built with
HTML, Tailwind CSS, and vanilla JavaScript — no framework, no bundler. It has a
public landing page, role-based auth, dashboards for users/officers/admins,
file and review workflows, payment screens, and account pages.

It is **fully interactive**: uploads, reviews, edits, settings, and payments
persist in the browser via a `localStorage`-backed store layered over a JSON
seed dataset. See [ARCHITECTURE.md](ARCHITECTURE.md) for how it works.

> ⚠️ **Demo only.** Authentication, authorization, and persistence are entirely
> client-side and trivially bypassable. Do not deploy with real data. See
> [SECURITY.md](SECURITY.md).

## Quick start

```bash
npm install
npm run dev        # serve public/ (cache disabled) and open a browser
# or: npm run serve  # serve public/ on http://localhost:8000
```

### Demo logins

| Role    | Email                           | Password    |
| ------- | ------------------------------- | ----------- |
| Admin   | `rajesh.biswas@paperhub.com.bd` | `admin01`   |
| Officer | `rajdip.roy@paperhub.com.bd`    | `officer01` |
| User    | `mahmud.hasan@paperhub.edu.bd`  | `user01`    |

To reset everything to the original sample data: **Settings → Security → Reset
demo data** (or clear the site's `localStorage`).

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
├── public/                     # everything served
│   ├── index.html
│   ├── _headers                # security headers for static hosts
│   ├── components/             # navbar / sidebar / footer partials
│   ├── pages/                  # auth, dashboard, file, review, payment, account, support
│   └── assets/
│       ├── data/paperhub-backend.json   # seed "database"
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

Serve `public/` on any static host. Hosts that read a `_headers` file (Netlify,
Cloudflare Pages) automatically apply the bundled security headers. The compiled
`public/assets/css/tailwind.css` is committed, so no build step is needed at
deploy time.

## License

[MIT](LICENSE)
