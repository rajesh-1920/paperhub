import test from "node:test";
import assert from "node:assert/strict";
import { readFile, copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "tests/fixtures/dataset.json");

async function startTestServer() {
  const dir = await mkdtemp(join(tmpdir(), "paperhub-"));
  const dbFile = join(dir, "db.json");
  const seedFile = join(dir, "seed.json");
  await copyFile(SEED, dbFile);
  await copyFile(SEED, seedFile);
  process.env.PAPERHUB_DB_FILE = dbFile;
  process.env.PAPERHUB_SEED_FILE = seedFile;
  process.env.PAPERHUB_UPLOAD_DIR = join(dir, "uploads");
  process.env.BCRYPT_ROUNDS = "4"; // keep auth tests fast

  const { createApp } = await import("../server/index.js");
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, dbFile };
}

test("API serves the dataset and persists writes to the JSON file", async (t) => {
  const { server, base, dbFile } = await startTestServer();
  t.after(() => server.close());

  const dataset = await dumpDataset(base);
  assert.ok(Array.isArray(dataset.users) && dataset.users.length > 0, "GET returns the dataset");

  // Writes require authentication.
  assert.equal(
    (
      await fetch(`${base}/api/dataset`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dataset),
      })
    ).status,
    401,
    "unauthenticated PUT rejected",
  );

  const token = await tokenFor(base);
  dataset.users[0].name = "Server Test User";
  const put = await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(dataset),
  });
  assert.equal(put.status, 200, "PUT accepted");

  const rereadRes = await fetch(`${base}/api/dataset`, { headers: bearer(token) });
  assert.equal(
    rereadRes.headers.get("cache-control"),
    "no-store",
    "dataset GET is uncacheable so counts never go stale",
  );
  const reread = await rereadRes.json();
  assert.equal(reread.users[0].name, "Server Test User", "GET reflects the write");

  const onDisk = JSON.parse(await readFile(dbFile, "utf8"));
  assert.equal(onDisk.users[0].name, "Server Test User", "JSON file on disk updated");
});

async function login(base, email, password) {
  return fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

// Mutating routes require a bearer token; default to the seed admin.
async function tokenFor(base, email = "rajesh.biswas@paperhub.com.bd", password = "admin01") {
  return (await (await login(base, email, password)).json()).token;
}
const bearer = (token) => ({ authorization: `Bearer ${token}` });

// GET /api/dataset is now scoped to the caller, so inspecting full server state
// in a test requires authentication. Default to the seed admin (full view).
async function dumpDataset(base, token) {
  const t = token || (await tokenFor(base));
  return (await fetch(`${base}/api/dataset`, { headers: bearer(t) })).json();
}

test("auth: login issues tokens, refresh renews, bad creds rejected", async (t) => {
  const { server, base, dbFile } = await startTestServer();
  t.after(() => server.close());

  // Wrong password and unknown email are both 401 (no user enumeration).
  assert.equal((await login(base, "rajesh.biswas@paperhub.com.bd", "nope")).status, 401);
  assert.equal((await login(base, "ghost@nowhere.test", "admin01")).status, 401);

  const res = await login(base, "rajesh.biswas@paperhub.com.bd", "admin01");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token, "access token issued");
  assert.ok(body.refreshToken, "refresh token issued");
  assert.equal(body.user.role, "admin");
  assert.equal(body.user.password, undefined, "no plaintext leaks");
  assert.equal(body.user.passwordHash, undefined, "no hash leaks");

  // Reads never leak credentials or refresh tokens.
  const exposed = await dumpDataset(base);
  assert.ok(
    exposed.authAccounts.every((a) => a.password === undefined && a.passwordHash === undefined),
    "credentials stripped from dataset reads",
  );
  assert.deepEqual(exposed.refreshTokens, [], "refresh tokens never leave the server");

  // The legacy plaintext password was migrated to a hash (verified on disk).
  const onDisk = JSON.parse(await readFile(dbFile, "utf8"));
  const account = onDisk.authAccounts.find((a) => a.email === "rajesh.biswas@paperhub.com.bd");
  assert.ok(account.passwordHash, "password hashed on login");
  assert.equal(account.password, undefined, "plaintext removed");

  // Refresh exchanges the refresh token for a fresh access token.
  const refreshed = await fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: body.refreshToken }),
  });
  assert.equal(refreshed.status, 200);
  assert.ok((await refreshed.json()).token, "new access token issued");

  // After logout the refresh token is revoked.
  await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: body.refreshToken }),
  });
  const afterLogout = await fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: body.refreshToken }),
  });
  assert.equal(afterLogout.status, 401, "revoked refresh token rejected");
});

test("auth: register creates a first-class user and auto-logs-in", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const register = (body) =>
    fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  assert.equal(
    (await register({ name: "New", email: "new@paperhub.test", password: "short" })).status,
    400,
    "weak password rejected",
  );

  const res = await register({
    name: "New Person",
    email: "New@PaperHub.test",
    password: "longenough1",
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.token && body.refreshToken, "auto-logged-in");
  assert.equal(body.user.role, "user", "self-signup is always a user");
  assert.equal(body.user.email, "new@paperhub.test", "email normalized");
  assert.equal(body.user.passwordHash, undefined);

  const dataset = await dumpDataset(base);
  assert.ok(
    dataset.authAccounts.some((a) => a.email === "new@paperhub.test"),
    "account persisted",
  );
  assert.ok(
    dataset.users.some((u) => u.email === "new@paperhub.test"),
    "first-class user profile",
  );

  assert.equal(
    (await register({ name: "Dup", email: "new@paperhub.test", password: "longenough1" })).status,
    409,
    "duplicate email rejected",
  );

  assert.equal(
    (await login(base, "new@paperhub.test", "longenough1")).status,
    200,
    "can log in with the new credentials",
  );
});

test("auth: change-password rotates the password and old one stops working", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const first = await (await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")).json();

  const change = (body, bearer) =>
    fetch(`${base}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });

  assert.equal(
    (await change({ currentPassword: "user01", newPassword: "newpass12" })).status,
    401,
    "requires auth",
  );
  assert.equal(
    (await change({ currentPassword: "wrong", newPassword: "newpass12" }, first.token)).status,
    401,
    "wrong current password rejected",
  );

  const ok = await change({ currentPassword: "user01", newPassword: "newpass12" }, first.token);
  assert.equal(ok.status, 200);

  assert.equal(
    (await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")).status,
    401,
    "old password fails",
  );
  assert.equal(
    (await login(base, "mahmud.hasan@paperhub.edu.bd", "newpass12")).status,
    200,
    "new password works",
  );
});

test("dataset PUT preserves server-only credentials it never sent to the client", async (t) => {
  const { server, base, dbFile } = await startTestServer();
  t.after(() => server.close());

  // Log in to migrate an account to a hash, then round-trip the (credential-less)
  // dataset back via PUT and confirm the hash survives.
  const { token } = await (await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")).json();
  const exposed = await dumpDataset(base);
  exposed.users[0].name = "Renamed Via PUT";
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(exposed),
  });

  const onDisk = JSON.parse(await readFile(dbFile, "utf8"));
  const account = onDisk.authAccounts.find((a) => a.email === "mahmud.hasan@paperhub.edu.bd");
  assert.ok(account.passwordHash, "passwordHash preserved through a round-tripped PUT");
  assert.equal(
    (await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")).status,
    200,
    "still logs in",
  );
});

test("search: owner-scoped, filtered, sorted and paginated", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  assert.equal((await fetch(`${base}/api/files/search`)).status, 401, "requires auth");

  const { token, user } = await (
    await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")
  ).json();
  const search = (qs) => fetch(`${base}/api/files/search?${qs}`, { headers: bearer(token) });

  const all = await (await search("pageSize=5")).json();
  assert.ok(all.total > 0, "the user has files");
  assert.ok(all.items.length <= 5, "page size respected");
  assert.ok(
    all.items.every((f) => f.ownerId === user.id),
    "owner-scoped",
  );
  assert.equal(all.page, 1);
  assert.ok(all.pages >= 1);

  // A text query never widens the result set.
  const term = all.items[0].name.slice(0, 4);
  const q = await (await search(`q=${encodeURIComponent(term)}`)).json();
  assert.ok(q.total >= 1 && q.total <= all.total);

  // Sort by name ascending.
  const byName = await (await search("sort=name&dir=asc&pageSize=100")).json();
  const names = byName.items.map((f) => f.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b)),
    "sorted by name asc",
  );
});

test("search: a team-scoped ACL grant gives team members access", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const adminToken = await tokenFor(base);
  const ds = await dumpDataset(base);
  const officer = ds.users.find((u) => u.role === "officer");
  const file = ds.files.find((f) => f.ownerId !== officer.id);
  ds.teams.push({
    id: "team-rev",
    name: "Reviewers",
    ownerId: "admin-rajesh.biswas",
    createdAt: "2026-01-01T00:00:00.000Z",
    members: [{ userId: officer.id, role: "member" }],
  });
  file.acl = [
    {
      principalType: "team",
      principalId: "team-rev",
      permission: "view",
      grantedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(adminToken) },
    body: JSON.stringify(ds),
  });

  const { token } = await (await login(base, "rajdip.roy@paperhub.com.bd", "officer01")).json();
  const shared = await (
    await fetch(`${base}/api/files/search?shared=1&pageSize=100`, { headers: bearer(token) })
  ).json();
  assert.ok(
    shared.items.some((f) => f.id === file.id),
    "team member sees the team-shared file",
  );
});

test("search: includes files shared via an ACL grant (shared=1 excludes own)", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const adminToken = await tokenFor(base);
  const ds = await dumpDataset(base);
  const officer = ds.users.find((u) => u.role === "officer");
  const someFile = ds.files.find((f) => f.ownerId !== officer.id);
  someFile.acl = [
    {
      principalType: "user",
      principalId: officer.id,
      permission: "view",
      grantedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(adminToken) },
    body: JSON.stringify(ds),
  });

  const { token } = await (await login(base, "rajdip.roy@paperhub.com.bd", "officer01")).json();
  const shared = await (
    await fetch(`${base}/api/files/search?shared=1&pageSize=100`, { headers: bearer(token) })
  ).json();
  assert.ok(
    shared.items.some((f) => f.id === someFile.id),
    "shared file visible to the grantee",
  );
  assert.ok(
    shared.items.every((f) => f.ownerId !== officer.id),
    "shared=1 excludes own files",
  );
});

test("share: create, resolve, password-protect, revoke", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const { token: userToken, user } = await (
    await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")
  ).json();
  const ds = await dumpDataset(base);
  const ownFile = ds.files.find((f) => f.ownerId === user.id);

  // Create a share link for an owned file.
  const created = await fetch(`${base}/api/share`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(userToken) },
    body: JSON.stringify({ resourceType: "file", resourceId: ownFile.id, permission: "view" }),
  });
  assert.equal(created.status, 201);
  const { token: shareToken } = await created.json();
  assert.ok(shareToken);

  // Resolve it publicly (no auth) — and shareLinks never leak in the dataset.
  const resolved = await (await fetch(`${base}/api/share/${shareToken}`)).json();
  assert.equal(resolved.resource.id, ownFile.id);
  assert.deepEqual((await dumpDataset(base)).shareLinks, []);

  // /mine lists it without leaking the password hash.
  const mine = await (await fetch(`${base}/api/share/mine`, { headers: bearer(userToken) })).json();
  assert.ok(mine.items.some((l) => l.token === shareToken));
  assert.ok(mine.items.every((l) => l.passwordHash === undefined));

  // A password-protected link rejects the wrong password.
  const locked = await (
    await fetch(`${base}/api/share`, {
      method: "POST",
      headers: { "content-type": "application/json", ...bearer(userToken) },
      body: JSON.stringify({ resourceType: "file", resourceId: ownFile.id, password: "secret12" }),
    })
  ).json();
  assert.equal((await fetch(`${base}/api/share/${locked.token}`)).status, 401, "password required");
  assert.equal(
    (await fetch(`${base}/api/share/${locked.token}?password=secret12`)).status,
    200,
    "correct password resolves",
  );

  // Revoke makes it 404.
  await fetch(`${base}/api/share/${shareToken}`, { method: "DELETE", headers: bearer(userToken) });
  assert.equal((await fetch(`${base}/api/share/${shareToken}`)).status, 404, "revoked link gone");
});

test("auth: events are recorded to the audit log (and not exposed to clients)", async (t) => {
  const { server, base, dbFile } = await startTestServer();
  t.after(() => server.close());

  await login(base, "rajesh.biswas@paperhub.com.bd", "admin01"); // success
  await login(base, "rajesh.biswas@paperhub.com.bd", "wrong-pass"); // failure

  const onDisk = JSON.parse(await readFile(dbFile, "utf8"));
  const actions = onDisk.auditLog.map((e) => e.action);
  assert.ok(actions.includes("auth.login"), "successful login audited");
  assert.ok(actions.includes("auth.login_failed"), "failed login audited");

  const exposed = await dumpDataset(base);
  assert.deepEqual(exposed.auditLog, [], "audit log is not exposed in dataset reads");
});

test("audit: POST records an actor-stamped event; GET is scoped by role", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const { token: userToken, user } = await (
    await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")
  ).json();

  // The server stamps the actor — a forged actorId in the body is ignored.
  const posted = await fetch(`${base}/api/audit`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearer(userToken) },
    body: JSON.stringify({ action: "file.upload", resourceName: "x.pdf", actorId: "someone-else" }),
  });
  assert.equal(posted.status, 201);

  // The user sees their own event.
  const mine = await (await fetch(`${base}/api/audit`, { headers: bearer(userToken) })).json();
  const entry = mine.items.find((e) => e.action === "file.upload");
  assert.ok(entry, "own event listed");
  assert.equal(entry.actorId, user.id, "actor stamped from the token, not the body");

  // Another user does not see it; the admin does.
  const otherToken = await tokenFor(base, "rajdip.roy@paperhub.com.bd", "officer01");
  const other = await (await fetch(`${base}/api/audit`, { headers: bearer(otherToken) })).json();
  assert.ok(!other.items.some((e) => e.actorId === user.id), "users only see their own events");

  const adminToken = await tokenFor(base);
  const all = await (await fetch(`${base}/api/audit`, { headers: bearer(adminToken) })).json();
  assert.ok(
    all.items.some((e) => e.actorId === user.id),
    "admin sees all events",
  );

  assert.equal((await fetch(`${base}/api/audit`)).status, 401, "audit read requires auth");
});

test("auth: repeated login attempts are rate limited", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  let limited = false;
  for (let i = 0; i < 40; i++) {
    const res = await login(base, "rajesh.biswas@paperhub.com.bd", "wrong-pass");
    if (res.status === 429) {
      limited = true;
      break;
    }
  }
  assert.ok(limited, "too many login attempts eventually return 429");
});

test("write policy: a non-admin can't escalate roles or write others' data", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const { token, user } = await (
    await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")
  ).json();
  const ds = await dumpDataset(base);

  ds.users.find((u) => u.id === user.id).role = "admin"; // attempt self-escalation
  ds.files.push({ id: "file-inject", name: "x.pdf", ownerId: "ghost-user" }); // others' file
  const ownFile = ds.files.find((f) => f.ownerId === user.id);
  ownFile.name = "My Renamed.pdf"; // own file (allowed)

  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(ds),
  });

  const after = await dumpDataset(base);
  assert.equal(after.users.find((u) => u.id === user.id).role, "user", "no self-escalation");
  assert.ok(!after.files.some((f) => f.id === "file-inject"), "can't add a file owned by another");
  assert.equal(
    after.files.find((f) => f.id === ownFile.id).name,
    "My Renamed.pdf",
    "own file change persisted",
  );
});

test("write policy: an officer may update another user's file (review flow)", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const { token, user: officer } = await (
    await login(base, "rajdip.roy@paperhub.com.bd", "officer01")
  ).json();
  const ds = await dumpDataset(base);
  const target = ds.files.find((f) => f.ownerId && f.ownerId !== officer.id);
  target.status = "completed";
  // mirror to the owner's embedded copy, like the review mutators do
  const owner = ds.users.find((u) => u.id === target.ownerId);
  (owner.files || []).forEach((f) => {
    if (f.id === target.id) f.status = "completed";
  });

  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(ds),
  });

  const after = await dumpDataset(base);
  assert.equal(
    after.files.find((f) => f.id === target.id).status,
    "completed",
    "officer's review decision persisted (not reverted by the write policy)",
  );
});

test("write policy: an admin may change a user's role", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const adminToken = await tokenFor(base);
  const ds = await dumpDataset(base);
  const someUser = ds.users.find((u) => u.role === "user");
  someUser.role = "officer";
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(adminToken) },
    body: JSON.stringify(ds),
  });
  const after = await dumpDataset(base);
  assert.equal(after.users.find((u) => u.id === someUser.id).role, "officer", "admin changed role");
});

test("dataset exposes the new SaaS collections and round-trips them", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const NEW = ["folders", "shareLinks", "tags", "auditLog", "teams", "refreshTokens"];
  const dataset = await dumpDataset(base);
  for (const key of NEW) {
    assert.ok(Array.isArray(dataset[key]), `${key} is defaulted to an array`);
  }

  dataset.folders.push({ id: "folder-1", name: "Reports", parentId: null });
  dataset.tags.push({ id: "tag-1", label: "Important", slug: "important" });
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(await tokenFor(base)) },
    body: JSON.stringify(dataset),
  });

  const reread = await dumpDataset(base);
  assert.equal(reread.folders[0]?.name, "Reports", "folders persisted");
  assert.equal(reread.tags[0]?.slug, "important", "tags persisted");
});

test("API rejects an invalid dataset payload", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(await tokenFor(base)) },
    body: JSON.stringify({ not: "a dataset" }),
  });
  assert.equal(res.status, 400, "invalid payload rejected");
});

test("file content: stores and serves real PDF bytes, rejects non-PDF", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const pdf = Buffer.from("%PDF-1.4\nhello world\n%%EOF\n");
  const token = await tokenFor(base);

  // Uploading bytes requires authentication.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-x/content`, {
        method: "PUT",
        headers: { "content-type": "application/pdf" },
        body: pdf,
      })
    ).status,
    401,
    "unauthenticated upload rejected",
  );

  const put = await fetch(`${base}/api/files/file-x/content`, {
    method: "PUT",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: pdf,
  });
  assert.equal(put.status, 200, "PDF accepted");

  const get = await fetch(`${base}/api/files/file-x/content`);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("content-type"), "application/pdf");
  const back = Buffer.from(await get.arrayBuffer());
  assert.ok(back.equals(pdf), "bytes round-trip unchanged");

  const notPdf = await fetch(`${base}/api/files/file-y/content`, {
    method: "PUT",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: Buffer.from("this is not a pdf"),
  });
  assert.equal(notPdf.status, 415, "non-PDF rejected by magic-byte check");

  const missing = await fetch(`${base}/api/files/file-z/content`);
  assert.equal(missing.status, 404, "unknown file content is 404");
});

test("file content: copy duplicates the binary to a new id (auth required)", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const token = await tokenFor(base);
  const pdf = Buffer.from("%PDF-1.4\ncopy me\n%%EOF\n");
  await fetch(`${base}/api/files/file-src/content`, {
    method: "PUT",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: pdf,
  });

  const copy = (body, withAuth) =>
    fetch(`${base}/api/files/file-src/copy`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(withAuth ? bearer(token) : {}) },
      body: JSON.stringify(body),
    });

  assert.equal((await copy({ targetId: "file-dst" }, false)).status, 401, "requires auth");

  const res = await copy({ targetId: "file-dst" }, true);
  assert.equal(res.status, 200);

  const got = Buffer.from(await (await fetch(`${base}/api/files/file-dst/content`)).arrayBuffer());
  assert.ok(got.equals(pdf), "duplicated bytes are identical");
});

test("quota: uploading beyond a user's storage limit is rejected (413)", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const { token, user } = await (
    await login(base, "mahmud.hasan@paperhub.edu.bd", "user01")
  ).json();

  // Give the user a tiny limit and register a target file they own.
  const ds = await dumpDataset(base);
  ds.users.find((u) => u.id === user.id).storage = { limitBytes: 10 };
  ds.files.push({ id: "file-quota", name: "q.pdf", ownerId: user.id, size: 5 });
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(ds),
  });

  const res = await fetch(`${base}/api/files/file-quota/content`, {
    method: "PUT",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: Buffer.from("%PDF-1.4\nthis exceeds ten bytes easily\n%%EOF\n"),
  });
  assert.equal(res.status, 413, "over-quota upload rejected");
});

test("file versions: a new version archives bytes and becomes the current content", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());
  const token = await tokenFor(base);

  const v1 = Buffer.from("%PDF-1.4\nversion one\n%%EOF\n");
  const v2 = Buffer.from("%PDF-1.4\nversion two is longer\n%%EOF\n");
  await fetch(`${base}/api/files/file-v/content`, {
    method: "PUT",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: v1,
  });

  assert.equal(
    (
      await fetch(`${base}/api/files/file-v/versions`, {
        method: "POST",
        headers: { "content-type": "application/pdf" },
        body: v2,
      })
    ).status,
    401,
    "adding a version requires auth",
  );

  const added = await fetch(`${base}/api/files/file-v/versions`, {
    method: "POST",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: v2,
  });
  assert.equal(added.status, 200);
  const { versionId, contentRef } = await added.json();
  assert.ok(versionId && contentRef === `file-v__${versionId}`);

  // Current content is now v2.
  const current = Buffer.from(
    await (await fetch(`${base}/api/files/file-v/content`)).arrayBuffer(),
  );
  assert.ok(current.equals(v2), "current content updated to the new version");

  // The archived version is byte-identical and survives a dataset prune.
  // Reuse the existing token: a fresh login would write the dataset (refresh
  // token) and prune the not-yet-referenced version binary out from under us.
  const dataset = await dumpDataset(base, token);
  dataset.files.push({ id: "file-v", name: "v.pdf", versions: [{ versionId, contentRef }] });
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(dataset),
  });
  const archived = Buffer.from(
    await (await fetch(`${base}/api/files/${contentRef}/content`)).arrayBuffer(),
  );
  assert.ok(archived.equals(v2), "archived version retained byte-identical");
});

test("file content: orphaned binaries are pruned when the dataset drops the file", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const token = await tokenFor(base);
  const pdf = Buffer.from("%PDF-1.4\norphan\n%%EOF\n");
  await fetch(`${base}/api/files/file-orphan/content`, {
    method: "PUT",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: pdf,
  });
  assert.equal((await fetch(`${base}/api/files/file-orphan/content`)).status, 200, "stored");

  // Persist a dataset that does not reference file-orphan.
  const dataset = await dumpDataset(base);
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(dataset),
  });

  assert.equal(
    (await fetch(`${base}/api/files/file-orphan/content`)).status,
    404,
    "orphan binary pruned",
  );
});

test("file content: a version's binary is retained through orphan pruning", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const token = await tokenFor(base);
  const pdf = Buffer.from("%PDF-1.4\nversion one\n%%EOF\n");
  // A version binary is stored under the file's versioned content ref.
  await fetch(`${base}/api/files/file-ver__v1/content`, {
    method: "PUT",
    headers: { "content-type": "application/pdf", ...bearer(token) },
    body: pdf,
  });

  // The dataset references it via the file's versions[] (no current binary).
  // Reuse the existing token (a fresh login would prune this binary early).
  const dataset = await dumpDataset(base, token);
  dataset.files.push({
    id: "file-ver",
    name: "v.pdf",
    status: "pending",
    versions: [{ versionId: "v1", contentRef: "file-ver__v1" }],
  });
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(token) },
    body: JSON.stringify(dataset),
  });

  assert.equal(
    (await fetch(`${base}/api/files/file-ver__v1/content`)).status,
    200,
    "version binary kept by the version-aware prune",
  );
});

test("API reset restores the dataset from the seed", async (t) => {
  const { server, base, dbFile } = await startTestServer();
  t.after(() => server.close());

  const adminToken = await tokenFor(base);
  const dataset = await dumpDataset(base);
  dataset.users[0].name = "Temporarily Changed";
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(adminToken) },
    body: JSON.stringify(dataset),
  });

  // Reset is destructive and admin-only.
  assert.equal((await fetch(`${base}/api/reset`, { method: "POST" })).status, 401, "needs auth");
  const userToken = await tokenFor(base, "mahmud.hasan@paperhub.edu.bd", "user01");
  assert.equal(
    (await fetch(`${base}/api/reset`, { method: "POST", headers: bearer(userToken) })).status,
    403,
    "non-admin forbidden",
  );

  const reset = await (
    await fetch(`${base}/api/reset`, { method: "POST", headers: bearer(adminToken) })
  ).json();
  assert.notEqual(reset.users[0].name, "Temporarily Changed", "reset restores seed values");

  const onDisk = JSON.parse(await readFile(dbFile, "utf8"));
  assert.notEqual(onDisk.users[0].name, "Temporarily Changed", "file restored on disk");
});

test("security: the raw runtime DB is never served as a static file", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  // The JSON store lives under public/assets/data, but it holds credentials and
  // tokens — it must not be downloadable as a static asset.
  assert.equal(
    (await fetch(`${base}/assets/data/paperhub-backend.json`)).status,
    404,
    "the runtime DB file is blocked",
  );
  assert.equal(
    (await fetch(`${base}/assets/data/anything.json`)).status,
    404,
    "the data dir is blocked",
  );
  // Other static assets and the access-controlled API still work.
  assert.equal(
    (await fetch(`${base}/assets/js/utils.js`)).status,
    200,
    "other static assets served",
  );
  assert.equal((await fetch(`${base}/api/dataset`)).status, 200, "dataset reachable via the API");
});

test("privacy: GET /api/dataset is scoped to the caller", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());
  const get = (tok) =>
    fetch(`${base}/api/dataset`, tok ? { headers: bearer(tok) } : {}).then((r) => r.json());

  // Guest: a bare shell — no files, users, or accounts.
  const guest = await get(null);
  assert.equal((guest.files || []).length, 0, "guest sees no files");
  assert.equal((guest.users || []).length, 0, "guest sees no users");
  assert.equal((guest.authAccounts || []).length, 0, "guest sees no accounts");

  // Regular user: PaperHub is a shared document space, so a regular user sees
  // EVERY file (all owners, all statuses). Other users' PII/accounts stay
  // private — their profiles are reduced to a public name/role label.
  const userTok = await tokenFor(base, "mahmud.hasan@paperhub.edu.bd", "user01");
  const u = await get(userTok);
  assert.ok((u.files || []).length > 0, "user sees files");
  assert.ok(
    (u.files || []).some((f) => f.ownerId === "user-mahmud.hasan"),
    "user sees their own files",
  );
  assert.ok(
    (u.files || []).some((f) => f.ownerId !== "user-mahmud.hasan"),
    "user also sees other users' files (shared document space)",
  );
  assert.equal((u.authAccounts || []).length, 0, "account list withheld from a regular user");
  const otherUser = (u.users || []).find((x) => x.id !== "user-mahmud.hasan");
  assert.ok(otherUser, "other users still listed for name labels");
  assert.equal(otherUser.email, undefined, "other users' email/PII stripped");
  assert.equal(
    (otherUser.files || []).length,
    0,
    "other users' files not embedded in their profile",
  );
  const self = (u.users || []).find((x) => x.id === "user-mahmud.hasan");
  assert.ok(self && self.email, "the viewer's own record stays complete");

  // Staff: full cross-user visibility.
  const offTok = await tokenFor(base, "rajdip.roy@paperhub.com.bd", "officer01");
  const o = await get(offTok);
  assert.ok(
    (o.files || []).some((f) => f.ownerId !== "officer-rajdip.roy"),
    "officer sees other users' files",
  );
  const adminTok = await tokenFor(base, "rajesh.biswas@paperhub.com.bd", "admin01");
  const a = await get(adminTok);
  assert.ok((a.authAccounts || []).length > 0, "admin sees the account list");
});

test("privacy: a regular user's scoped PUT does not erase other users' data", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());
  const userTok = await tokenFor(base, "mahmud.hasan@paperhub.edu.bd", "user01");
  const adminTok = await tokenFor(base, "rajesh.biswas@paperhub.com.bd", "admin01");

  const scoped = await fetch(`${base}/api/dataset`, { headers: bearer(userTok) }).then((r) =>
    r.json(),
  );
  const put = await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(userTok) },
    body: JSON.stringify(scoped),
  });
  assert.equal(put.status, 200, "scoped PUT accepted");

  const full = await fetch(`${base}/api/dataset`, { headers: bearer(adminTok) }).then((r) =>
    r.json(),
  );
  assert.equal((full.users || []).length, 3, "all users preserved after the scoped PUT");
  assert.ok(
    (full.files || []).some((f) => f.ownerId === "officer-rajdip.roy"),
    "another user's files preserved",
  );
});

test("file content: accepts a PDF whose %PDF header follows a BOM/whitespace", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());
  const token = await tokenFor(base, "mahmud.hasan@paperhub.edu.bd", "user01");
  const put = (buf) =>
    fetch(`${base}/api/files/file-lenient/content`, {
      method: "PUT",
      headers: { "content-type": "application/pdf", ...bearer(token) },
      body: buf,
    });

  // Real PDFs may carry a leading newline or UTF-8 BOM before %PDF — accept them.
  assert.equal((await put(Buffer.from("\n%PDF-1.4\nx\n%%EOF"))).status, 200, "leading newline ok");
  assert.equal(
    (await put(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("%PDF-1.4\nx")])))
      .status,
    200,
    "BOM-prefixed ok",
  );
  // Something that is genuinely not a PDF is still rejected.
  assert.equal(
    (await put(Buffer.from("this is plain text, definitely not a pdf"))).status,
    415,
    "non-PDF rejected",
  );
});
