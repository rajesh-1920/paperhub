import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyGoogleIdToken } from "../server/auth/google.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_ID = "test-client.apps.googleusercontent.com";

// A throwaway RSA keypair stands in for Google's signing key.
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-kid", alg: "RS256", use: "sig" };
const fetchCerts = async () => [jwk];
const env = { GOOGLE_CLIENT_ID: CLIENT_ID };

function googleToken(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "google-123",
    email: "newperson@gmail.com",
    email_verified: true,
    name: "New Person",
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256", keyid: overrides.kid || "test-kid" });
}

test("google verify: accepts a valid Google ID token", async () => {
  const profile = await verifyGoogleIdToken(googleToken(), env, { fetchCerts });
  assert.equal(profile.email, "newperson@gmail.com");
  assert.equal(profile.sub, "google-123");
  assert.equal(profile.name, "New Person");
});

test("google verify: rejects wrong audience / issuer / unverified email / expired", async () => {
  await assert.rejects(
    verifyGoogleIdToken(googleToken({ aud: "attacker-app" }), env, { fetchCerts }),
  );
  await assert.rejects(
    verifyGoogleIdToken(googleToken({ iss: "https://evil.test" }), env, { fetchCerts }),
  );
  await assert.rejects(
    verifyGoogleIdToken(googleToken({ email_verified: false }), env, { fetchCerts }),
    /not verified/,
  );
  const expired = googleToken({ exp: Math.floor(Date.now() / 1000) - 30 });
  await assert.rejects(verifyGoogleIdToken(expired, env, { fetchCerts }));
});

test("google verify: rejects a token signed by a different key (forgery)", async () => {
  const attacker = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const forged = jwt.sign(
    {
      sub: "x",
      email: "victim@gmail.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    attacker.privateKey,
    { algorithm: "RS256", keyid: "test-kid" },
  );
  await assert.rejects(verifyGoogleIdToken(forged, env, { fetchCerts }));
});

test("google verify: throws when not configured or credential is malformed", async () => {
  await assert.rejects(verifyGoogleIdToken(googleToken(), {}, { fetchCerts }), /not configured/);
  await assert.rejects(verifyGoogleIdToken("not-a-jwt", env, { fetchCerts }));
  await assert.rejects(verifyGoogleIdToken("", env, { fetchCerts }));
});

// --- route integration: POST /api/auth/google -------------------------------

async function startServer() {
  const dir = await mkdtemp(join(tmpdir(), "ph-google-"));
  process.env.PAPERHUB_DB_FILE = join(dir, "db.json");
  process.env.PAPERHUB_SEED_FILE = join(ROOT, "tests/fixtures/dataset.json");
  process.env.PAPERHUB_UPLOAD_DIR = join(dir, "up");
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  process.env.BCRYPT_ROUNDS = "4";
  const { createApp } = await import("../server/index.js");
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test("google route: providers reports google enabled; sign-in find-or-creates and issues tokens", async (t) => {
  const { server, base } = await startServer();
  // Intercept Google's JWKS fetch; pass everything else through to the real fetch.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) => {
    if (String(url).includes("googleapis.com/oauth2/v3/certs")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ keys: [jwk] }),
        headers: { get: () => "public, max-age=3600" },
      });
    }
    return realFetch(url, opts);
  };
  t.after(() => {
    globalThis.fetch = realFetch;
    delete process.env.GOOGLE_CLIENT_ID;
    server.close();
  });

  const providers = await (await realFetch(`${base}/api/auth/providers`)).json();
  assert.equal(providers.google, true);
  assert.equal(providers.googleClientId, CLIENT_ID);

  const post = (credential) =>
    fetch(`${base}/api/auth/google`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credential }),
    });

  // First sign-in: a brand-new Google user is created (201) and gets a session.
  const first = await post(googleToken());
  assert.equal(first.status, 201, "new google user created");
  const body = await first.json();
  assert.ok(body.token && body.refreshToken, "session issued");
  assert.equal(body.user.email, "newperson@gmail.com");
  assert.equal(body.user.role, "user");
  assert.equal(body.user.passwordHash, undefined, "no credential leaks");

  // Second sign-in with the same email: existing account, logs in (200).
  const second = await post(googleToken());
  assert.equal(second.status, 200, "existing google user logs in");

  // A forged/garbage credential is rejected.
  assert.equal((await post("garbage")).status, 401, "invalid credential rejected");
});
