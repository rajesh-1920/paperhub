# PaperHub API reference

Base URL: same origin as the app (Express serves `public/` + `/api/*`).
Auth: `Authorization: Bearer <access-token>` unless marked public.
All JSON bodies are capped at `2mb`; PDF bodies at `100mb`.

## Health

| Method | Path          | Auth   | Response       |
| ------ | ------------- | ------ | -------------- |
| GET    | `/api/health` | public | `{ ok: true }` |

## Auth — `server/routes/auth.js` (mounted `/api/auth`)

| Method | Path               | Auth                  | Notes                                                                                                                                   |
| ------ | ------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/login`           | rate-limited (10/15m) | `{ email, password }` → `{ ok, token, refreshToken, user }`. Legacy plaintext auto-migrates to hash. 401 on bad creds (no enumeration). |
| POST   | `/register`        | rate-limited (20/15m) | `{ name, email, password>=8 }` → 201 + session. Always role `user`. 409 if email exists.                                                |
| POST   | `/google`          | rate-limited (10/15m) | `{ credential }` → find-or-create by email. 501 if `GOOGLE_CLIENT_ID=""`.                                                               |
| GET    | `/providers`       | public                | `{ google, googleClientId }` — drives login-page button.                                                                                |
| POST   | `/refresh`         | rate-limited (60/15m) | `{ refreshToken }` → `{ ok, token }`. 401 on unknown/revoked/expired.                                                                   |
| POST   | `/change-password` | `requireAuth`         | `{ currentPassword, newPassword>=8 }` → revokes all user refresh tokens.                                                                |
| POST   | `/logout`          | public                | `{ refreshToken? }` → revokes it; always `{ ok: true }`.                                                                                |

Token defaults: `ACCESS_TTL=15m`, `REFRESH_TTL=7d` (override via env).

## Dataset (bulk — DEPRECATED)

| Method | Path           | Auth                        | Notes                                                                                                                                            |
| ------ | -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/dataset` | `optionalAuth` (`no-store`) | Viewer-scoped projection (guest → shell; user → own folders + minimal others; staff → full, sanitized).                                          |
| PUT    | `/api/dataset` | `requireAuth`               | **Deprecated** (`Deprecation: true`, `Sunset: Sat, 01 Aug 2026`). Enforced by `applyDatasetWritePolicy`. New code must use scoped `PATCH` below. |
| POST   | `/api/reset`   | `requireAuth` + `admin`     | Destructive reseed from `server/seed.json`.                                                                                                      |

## Files — `server/routes/files.js` + `server/index.js`

| Method | Path                                                                                                | Auth                          | Notes                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/files/search?q=&folderId=&status=&tag=&sort=name\|size\|date&dir=&page=&pageSize≤100&shared=` | `requireAuth`                 | Owner + admin + ACL/team grants; trashed excluded; `shared=1` = "shared with me".                                    |
| PATCH  | `/api/files/:id/status`                                                                             | `officer`/`admin`             | `{ status: pending\|reviewing\|completed\|rejected }`. Owners cannot self-approve (403). 404 for invisible ids.      |
| PATCH  | `/api/files/:id`                                                                                    | owner / ACL-grantee / `admin` | `{ name?, description≤2000?, folderId? }`. Names sanitized (control chars stripped, ≤255). Unknown `folderId` → 400. |
| PUT    | `/api/files/:id/content`                                                                            | `requireAuth`                 | Raw `application/pdf` ≤100mb; `%PDF` magic + quota checked. → `{ size, pages }`.                                     |
| GET    | `/api/files/:id/content`                                                                            | public                        | `application/pdf inline, no-store, nosniff`. 404 if no bytes.                                                        |
| DELETE | `/api/files/:id/content`                                                                            | `requireAuth`                 | Removes stored bytes.                                                                                                |
| POST   | `/api/files/:id/copy`                                                                               | `requireAuth`                 | `{ targetId }` → copies bytes.                                                                                       |
| POST   | `/api/files/:id/versions`                                                                           | `requireAuth`                 | Raw PDF → archives `${id}__v<hex>` + promotes to current.                                                            |

## Users (scoped) — `server/routes/users.js` (mounted `/api/users`)

| Method | Path                    | Auth                 | Notes                                                                                                                                              |
| ------ | ----------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| PATCH  | `/me/preferences`       | `requireAuth` (self) | Allowlist: `language`, `timezone` (≤64), `theme: light\|dark`, `bio` (≤500). Mirrors `language`/`timezone` top-level like `phSaveUserPreferences`. |
| PATCH  | `/me/notifications/:id` | `requireAuth` (self) | `{ read: boolean }`. 404 for foreign ids.                                                                                                          |
| PATCH  | `/:id/preferences`      | `admin`              | Support flow for any user.                                                                                                                         |

## Share — `server/routes/share.js` (mounted `/api/share`)

| Method | Path              | Auth                           | Notes                                                                                                                                                          |
| ------ | ----------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/`               | `requireAuth`                  | `{ resourceType: file\|folder, resourceId, permission: view\|comment\|edit, expiresAt?, password? }` → 201 `{ token, link }`. Caller must access the resource. |
| GET    | `/mine`           | `requireAuth`                  | Own links (admin: all), hashes stripped.                                                                                                                       |
| DELETE | `/:token`         | creator or `admin`             | Soft revoke (`revoked=true`).                                                                                                                                  |
| GET    | `/:token`         | public, rate-limited (120/15m) | Revoked→404, expired→410, password→401 (via `x-share-password` or `?password`). Increments `accessCount`.                                                      |
| GET    | `/:token/content` | public, rate-limited           | Same validation + file-only → PDF bytes.                                                                                                                       |

## Audit — `server/routes/audit.js` (mounted `/api/audit`)

| Method | Path | Auth                           | Notes                                                                                                         |
| ------ | ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/`  | `requireAuth` (`pageSize≤200`) | Admin: all; others: own `actorId` events. Newest first.                                                       |
| POST   | `/`  | `requireAuth`                  | `{ action*≤64, resourceType?, resourceId?, resourceName?, metadata? }`. Actor stamped from JWT (unforgeable). |

## Reviews — `server/routes/reviews.js` (mounted `/api/reviews`)

| Method | Path       | Auth                       | Notes                                                                                                                                                                                 |
| ------ | ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/forward` | `officer` (`admin` passes) | `{ reviewId, documentName, comment?, ownerName? }` → best-effort admin email; never fails the request (`{ emailed: { sent } }`). Does not write the dataset (avoids racing bulk PUT). |

## Errors

`400` invalid payload · `401` missing/bad credentials / password-required ·
`403` forbidden · `404` not found (also for invisible resources) ·
`410` share link expired · `413` quota / payload cap · `415` non-PDF ·
`429` rate-limited (`Retry-After`) · `409` email exists · `501` Google disabled.
