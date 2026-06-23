# Security

## Threat model — read this first

PaperHub is a **frontend-only demo**. There is no backend server: the app ships
as static files and keeps all of its state in the browser. As a direct
consequence, the following are **intentional, documented limitations** — not
bugs:

- **Authentication is client-side.** Seed credentials (e.g. `admin01`) live in
  `public/assets/data/paperhub-backend.json` and in `localStorage`. They are
  sample values, not secrets. Login compares them in plain text.
- **Authorization (RBAC) is client-side and bypassable.** Role checks
  (`hasRole`, `canAccessPathByRole`, `enforcePageAccess`) read the role from
  `localStorage`. Anyone can set `localStorage["paperhub-user-role"] = "admin"`
  and reload. The route guards are UX, not a security boundary.
- **The data store is unsigned `localStorage`.** Anyone with DevTools can edit
  `localStorage["paperhub-db"]` and reload. There is no integrity check.

**Do not deploy PaperHub with real user data or real credentials.** A
production version would require a server that authenticates users, hashes
credentials, and enforces authorization on every mutation — none of which can
be done safely in a static frontend.

## What we _do_ harden

Even as a demo, the app applies the protections that are meaningful client-side:

- **Output escaping.** All dataset/user-derived values are passed through
  `escapeHtml()` before being interpolated into `innerHTML`. Plain text uses
  `textContent`. See the escaping policy in [CONTRIBUTING.md](CONTRIBUTING.md).
  A regression test (`tests/security.test.mjs`) asserts a malicious file name
  cannot inject markup into the version-history view.
- **Input validation at the store boundary.** The `ph*` mutators reject
  out-of-range statuses, empty/oversized comments, and strip control characters
  and clamp the length of uploaded file names.
- **Security headers for static hosts.** `public/_headers` ships a
  Content-Security-Policy plus `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a
  `Permissions-Policy`. Hosts that read a `_headers` file (Netlify, Cloudflare
  Pages) apply them automatically. The local `http-server` does **not** — and a
  `<meta>` CSP cannot set `frame-ancestors`, so framing protection requires the
  real response header.

## Known follow-ups (future work)

- The CSP keeps `script-src 'unsafe-inline'` because a few pages still use inline
  `<script>` blocks and event handlers (e.g. the landing page, `settings.html`).
  Externalising those scripts/handlers would allow tightening to
  `script-src 'self'`.

## Reporting

This is a learning/demo project. If you find an issue, please open a GitHub
issue: https://github.com/rajesh-1920/paperhub/issues
