import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { authConfig } from "../config.js";

// Token service: short-lived signed JWT access tokens, plus opaque refresh
// tokens whose secret is only ever stored hashed (server-side, revocable).

export function signAccessToken(account, env = process.env) {
  const { jwtSecret, accessTtl } = authConfig(env);
  return jwt.sign({ sub: account.id, role: account.role, name: account.name }, jwtSecret, {
    expiresIn: accessTtl,
  });
}

export function verifyAccessToken(token, env = process.env) {
  try {
    return jwt.verify(String(token || ""), authConfig(env).jwtSecret);
  } catch {
    return null;
  }
}

// Convert "15m"/"7d"/"30s"/"12h" to milliseconds (0 if unparseable).
export function parseDuration(value) {
  const match = /^(\d+)([smhd])$/.exec(String(value || "").trim());
  if (!match) {
    return 0;
  }
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * units[match[2]];
}

export function hashRefreshSecret(secret) {
  return crypto.createHash("sha256").update(String(secret)).digest("hex");
}

// A refresh token is "<id>.<secret>"; the server stores only sha256(secret).
export function createRefreshToken(env = process.env) {
  const id = crypto.randomBytes(9).toString("hex");
  const secret = crypto.randomBytes(32).toString("hex");
  return {
    id,
    token: `${id}.${secret}`,
    tokenHash: hashRefreshSecret(secret),
    ttlMs: parseDuration(authConfig(env).refreshTtl),
  };
}

export function splitRefreshToken(token) {
  const [id, secret] = String(token || "").split(".");
  return { id: id || "", secret: secret || "" };
}
