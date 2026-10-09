# Security

## Threat model

PaperHub is a document-management app with a real backend boundary:

- **Authentication is server-side.** Credentials are `bcryptjs`-hashed
  (`server/auth/passwords.js`); sessions are short-lived JWT access tokens
  (default `15m`) + opaque refresh tokens (default `7d`, `sha256`-stored).
  Google sign-in verifies ID tokens against Google's certs
  (`server/auth/google.js`). `server/config.js:assertAuthConfig()` refuses to
  boot in production with a weak `JWT_SECRET`.
- **Authorization is server-enforced.** Every `/api/*` mutation checks the
  JWT (`server/middleware/auth.js:requireAuth/authorize`) plus per-resource
  ownership/ACL/team grants (`server/auth/ownership.js`). Non-staff callers
  are further constrained by `applyDatasetWritePolicy()` on the legacy bulk
  endpoint. Client-side role checks (`canAccessPathByRole`,
  `enforcePageAccess`) are UX conveniences only — the server never trusts
  them.
- **What is still client-observable:** the app is a multi-page server-rendered
  frontend, so route HTML/JS is public; only the _data_ is access-controlled
  (`projectDatasetForViewer` scopes `GET /api/dataset`; `requireResourceAccess`
  returns 404 instead of 403 so existence isn't leaked).

Earlier versions of this file described the pre-auth demo ("no auth, open
PUT /api/dataset"). That is **outdated and wrong** — the controls above are
implemented and covered by `tests/server.test.mjs`,
`tests/scoped-patch.test.mjs` and `tests/security.test.mjs`.

## What we harden

- **Output escaping.** All dataset/user-derived values go through
  `escapeHtml()` before `innerHTML`; plain text uses `textContent`
  (see `CONTRIBUTING.md`). `tests/security.test.mjs` asserts malicious file
  names cannot inject markup.
- **Input validation on both layers.** Client `ph*` mutators enforce
  allowlists/lengths; the server re-validates independently (status enums,
  name/description/folder allowlists, pagination clamps, PDF magic check,
  quota check). Never trust the client.
- **Security headers from Express.** `server/middleware/securityHeaders.js`
  sends `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` and a CSP on every deployment
  (`public/_headers` mirrors them for static hosts). The live DB file is
  blocked from static serving (`app.use("/assets/data", 404)` in
  `server/index.js`).
- **Abuse caps.** Global `/api/` rate limit (600/15m) plus tighter caps on
  `login`/`google` (10), `register` (20), `refresh` (60) and public
  share-link resolution (120). JSON bodies capped at `2mb`, PDF uploads at
  `100mb`.
- **Audit trail.** `POST /api/audit` stamps actor identity server-side
  (callers cannot forge `actorId`); auth/file/share events are recorded and
  capped at 1000 entries.

## Known follow-ups (not bugs — tracked work)

- CSP keeps `script-src 'unsafe-inline'` because a few pages still use inline
  handlers (`index.html`, `settings.html`). Externalise them to tighten to
  `script-src 'self'`.
- Access tokens are stateless JWTs (no server blacklist before expiry);
  `change-password` revokes refresh tokens. Short `ACCESS_TTL=15m` bounds the
  window. A token-version counter would close it fully.
- Rate limits are in-memory per process (fine for single-instance; use a
  shared store if you scale horizontally).
- `PUT /api/dataset` (bulk sync) is **deprecated** (`Deprecation: true` +
  `Sunset` header) in favour of scoped `PATCH` endpoints. It remains
  write-policy-enforced until removal.

## Reporting

Please **do not open a public issue for vulnerabilities**. Email the
maintainers privately (see `package.json:author` / repository contacts) with:

1. affected endpoint or page,
2. steps to reproduce (role, request, response),
3. impact assessment.

We aim to acknowledge within 72 hours. Low-severity hardening ideas are
welcome as public issues: https://github.com/rajesh-1920/paperhub/issues
