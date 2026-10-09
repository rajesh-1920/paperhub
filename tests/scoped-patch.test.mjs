import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "tests/fixtures/dataset.json");

const ACCOUNTS = {
  admin: ["rajesh.biswas@paperhub.com.bd", "admin01"],
  officer: ["rajdip.roy@paperhub.com.bd", "officer01"],
  user: ["mahmud.hasan@paperhub.edu.bd", "user01"],
};

async function startTestServer() {
  const dir = await mkdtemp(join(tmpdir(), "paperhub-patch-"));
  const dbFile = join(dir, "db.json");
  const seedFile = join(dir, "seed.json");
  await copyFile(SEED, dbFile);
  await copyFile(SEED, seedFile);
  process.env.PAPERHUB_DB_FILE = dbFile;
  process.env.PAPERHUB_SEED_FILE = seedFile;
  process.env.PAPERHUB_UPLOAD_DIR = join(dir, "uploads");
  process.env.BCRYPT_ROUNDS = "4";

  const { createApp } = await import("../server/index.js");
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function login(base, role) {
  const [email, password] = ACCOUNTS[role];
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `${role} login works`);
  return (await res.json()).token;
}

const bearer = (token) => ({ authorization: `Bearer ${token}` });
const json = (token, body) => ({
  "content-type": "application/json",
  ...bearer(token),
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

async function adminDataset(base, adminToken) {
  const res = await fetch(`${base}/api/dataset`, { headers: bearer(adminToken) });
  assert.equal(res.status, 200);
  return res.json();
}

test("security headers are enforced by Express on every deployment", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.match(res.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
  assert.match(res.headers.get("content-security-policy") || "", /script-src/);
});

test("bulk PUT /api/dataset is deprecated but still compatible", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const adminToken = await login(base, "admin");
  const dataset = await adminDataset(base, adminToken);
  const put = await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(adminToken) },
    body: JSON.stringify(dataset),
  });
  assert.equal(put.status, 200);
  assert.equal(put.headers.get("deprecation"), "true");
});

test("PATCH /api/files/:id/status — officers decide, users cannot self-approve", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const [adminToken, officerToken, userToken] = await Promise.all([
    login(base, "admin"),
    login(base, "officer"),
    login(base, "user"),
  ]);

  // Unauthenticated → 401.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-003/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
    ).status,
    401,
  );

  // Bad enum → 400.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-003/status`, {
        method: "PATCH",
        headers: json(officerToken),
        body: JSON.stringify({ status: "approved-tomorrow" }),
      })
    ).status,
    400,
  );

  // Unknown file → 404.
  assert.equal(
    (
      await fetch(`${base}/api/files/nope/status`, {
        method: "PATCH",
        headers: json(officerToken),
        body: JSON.stringify({ status: "completed" }),
      })
    ).status,
    404,
  );

  // Owner (regular user) cannot change review status → 403.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-003/status`, {
        method: "PATCH",
        headers: json(userToken),
        body: JSON.stringify({ status: "completed" }),
      })
    ).status,
    403,
  );

  // Officer can.
  const ok = await fetch(`${base}/api/files/file-003/status`, {
    method: "PATCH",
    headers: json(officerToken),
    body: JSON.stringify({ status: "completed" }),
  });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).file.status, "completed");

  // Persisted server-side and visible to the owner.
  const dataset = await adminDataset(base, adminToken);
  assert.equal(dataset.files.find((f) => f.id === "file-003").status, "completed");
});

test("PATCH /api/files/:id — scoped metadata edit with sanitization", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const [adminToken, userToken] = await Promise.all([login(base, "admin"), login(base, "user")]);

  // Owner renames their own file; control chars stripped.
  const rename = await fetch(`${base}/api/files/file-001`, {
    method: "PATCH",
    headers: json(userToken),
    body: JSON.stringify({ name: "Clean name\u0000 with junk" }),
  });
  assert.equal(rename.status, 200);
  assert.equal((await rename.json()).file.name, "Clean name with junk");

  // Empty-after-sanitize (only control chars) → 400, mirroring phSanitizeName.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-001`, {
        method: "PATCH",
        headers: json(userToken),
        body: JSON.stringify({ name: "\u0000\u0001" }),
      })
    ).status,
    400,
  );

  // Unknown folder → 400.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-001`, {
        method: "PATCH",
        headers: json(userToken),
        body: JSON.stringify({ folderId: "nope" }),
      })
    ).status,
    400,
  );

  // Oversized description → 400.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-001`, {
        method: "PATCH",
        headers: json(userToken),
        body: JSON.stringify({ description: "x".repeat(2001) }),
      })
    ).status,
    400,
  );

  // Admin can edit anyone's file.
  const adminEdit = await fetch(`${base}/api/files/file-002`, {
    method: "PATCH",
    headers: json(adminToken),
    body: JSON.stringify({ description: "Admin note" }),
  });
  assert.equal(adminEdit.status, 200);

  // Unauthenticated → 401.
  assert.equal(
    (
      await fetch(`${base}/api/files/file-001`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      })
    ).status,
    401,
  );
});

test("PATCH /api/users/me/* — own preferences and notification read-state", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const [adminToken, userToken] = await Promise.all([login(base, "admin"), login(base, "user")]);

  const prefs = await fetch(`${base}/api/users/me/preferences`, {
    method: "PATCH",
    headers: json(userToken),
    body: JSON.stringify({ language: "English", timezone: "UTC", theme: "dark" }),
  });
  assert.equal(prefs.status, 200);
  assert.equal((await prefs.json()).preferences.language, "English");

  // Persisted + mirrored top-level like phSaveUserPreferences.
  const dataset = await adminDataset(base, adminToken);
  const me = dataset.users.find((u) => u.id === "user-mahmud.hasan");
  assert.equal(me.preferences.language, "English");
  assert.equal(me.language, "English");
  assert.equal(me.timezone, "UTC");

  // Bad theme → 400.
  assert.equal(
    (
      await fetch(`${base}/api/users/me/preferences`, {
        method: "PATCH",
        headers: json(userToken),
        body: JSON.stringify({ theme: "neon" }),
      })
    ).status,
    400,
  );

  // Notification read-state flips.
  const noteId = me.notifications[0].id;
  const flip = await fetch(`${base}/api/users/me/notifications/${noteId}`, {
    method: "PATCH",
    headers: json(userToken),
    body: JSON.stringify({ read: true }),
  });
  assert.equal(flip.status, 200);
  assert.equal((await flip.json()).notification.read, true);

  // Unknown notification → 404.
  assert.equal(
    (
      await fetch(`${base}/api/users/me/notifications/nope`, {
        method: "PATCH",
        headers: json(userToken),
        body: JSON.stringify({ read: true }),
      })
    ).status,
    404,
  );

  // Non-admin cannot PATCH someone else's preferences → 403.
  assert.equal(
    (
      await fetch(`${base}/api/users/admin-rajesh.biswas/preferences`, {
        method: "PATCH",
        headers: json(userToken),
        body: JSON.stringify({ theme: "dark" }),
      })
    ).status,
    403,
  );

  // Admin can (support flow).
  assert.equal(
    (
      await fetch(`${base}/api/users/user-mahmud.hasan/preferences`, {
        method: "PATCH",
        headers: json(adminToken),
        body: JSON.stringify({ theme: "light" }),
      })
    ).status,
    200,
  );
});

test("oversized JSON payloads are rejected", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const adminToken = await login(base, "admin");
  const big = await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(adminToken) },
    body: JSON.stringify({
      users: [],
      files: [],
      reviewQueue: [],
      authAccounts: [],
      pad: "x".repeat(3 * 1024 * 1024),
    }),
  });
  assert.equal(big.status, 413, "payloads over the 2mb JSON cap are rejected");
});
