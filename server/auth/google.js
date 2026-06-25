import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { authConfig } from "../config.js";

// Server-side verification of a Google Identity Services ID token (the
// "credential" the browser receives). We NEVER trust the client's claim of who
// the user is: the token is verified against Google's published RSA keys, and we
// require a matching audience (our OAuth client id), a Google issuer, a valid
// signature/expiry, and a verified email before accepting it.

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

// Google rotates its signing keys; cache them until the response's max-age.
let certCache = { keys: null, expiresAt: 0 };

async function fetchGoogleCerts() {
  const now = Date.now();
  if (certCache.keys && now < certCache.expiresAt) {
    return certCache.keys;
  }
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error("Unable to fetch Google signing keys");
  }
  const data = await res.json();
  const cacheControl = res.headers.get("cache-control") || "";
  const maxAge = /max-age=(\d+)/.exec(cacheControl);
  certCache = {
    keys: data.keys || [],
    expiresAt: now + (maxAge ? Number(maxAge[1]) : 3600) * 1000,
  };
  return certCache.keys;
}

// Verify a Google ID token and return a minimal, trusted profile. Throws on any
// validation failure. `deps.fetchCerts` is injectable for tests.
export async function verifyGoogleIdToken(credential, env = process.env, deps = {}) {
  const { googleClientId } = authConfig(env);
  if (!googleClientId) {
    throw new Error("Google sign-in is not configured");
  }
  if (!credential || typeof credential !== "string") {
    throw new Error("Missing Google credential");
  }

  const decoded = jwt.decode(credential, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error("Malformed Google credential");
  }

  const keys = await (deps.fetchCerts || fetchGoogleCerts)();
  const jwk = (keys || []).find((k) => k.kid === decoded.header.kid);
  if (!jwk) {
    throw new Error("Unknown Google signing key");
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const payload = jwt.verify(credential, publicKey, {
    algorithms: ["RS256"],
    audience: googleClientId,
    issuer: GOOGLE_ISSUERS,
  });

  if (!payload.email) {
    throw new Error("Google credential has no email");
  }
  // Only accept a Google-verified email — otherwise an attacker could claim any
  // address and take over a matching account.
  if (payload.email_verified !== true && payload.email_verified !== "true") {
    throw new Error("Google email is not verified");
  }

  return {
    email: String(payload.email).toLowerCase(),
    name: payload.name || String(payload.email).split("@")[0],
    sub: String(payload.sub || ""),
    picture: payload.picture || null,
  };
}
