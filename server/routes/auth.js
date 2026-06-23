import { Router } from "express";
import crypto from "node:crypto";
import { readDataset, writeDataset } from "../db.js";
import { verifyPassword, hashPassword } from "../auth/passwords.js";
import { publicUser, findAccountByEmail, buildUserProfile } from "../auth/users.js";
import {
  signAccessToken,
  createRefreshToken,
  hashRefreshSecret,
  splitRefreshToken,
} from "../auth/tokens.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugify(value) {
  return (
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "user"
  );
}

// Create + record a refresh token for an account and return the token pair.
// The caller persists the dataset (the refresh record is pushed onto it).
function issueSession(dataset, account) {
  const refresh = createRefreshToken();
  const now = Date.now();
  dataset.refreshTokens = dataset.refreshTokens || [];
  dataset.refreshTokens.push({
    id: refresh.id,
    userId: account.id,
    tokenHash: refresh.tokenHash,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + refresh.ttlMs).toISOString(),
    revoked: false,
  });
  return { token: signAccessToken(account), refreshToken: refresh.token };
}

// Authentication routes. Mounted at /api/auth.
export function authRouter() {
  const router = Router();

  // POST /api/auth/login — verify credentials, issue access + refresh tokens.
  router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const dataset = await readDataset();
    const account = findAccountByEmail(dataset, email);
    if (!account) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let ok = false;
    if (account.passwordHash) {
      ok = await verifyPassword(password, account.passwordHash);
    } else if (account.password != null) {
      // Legacy plaintext account: verify, then migrate to a hash on success.
      // The whole dataset is persisted below (with the new refresh token).
      ok = String(account.password) === String(password);
      if (ok) {
        account.passwordHash = await hashPassword(password);
        delete account.password;
      }
    }
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const session = issueSession(dataset, account);
    await writeDataset(dataset);

    res.json({ ok: true, ...session, user: publicUser(dataset, account) });
  });

  // POST /api/auth/register — self-service signup. Always creates a "user"
  // account (privileged roles are admin-provisioned), persisted to BOTH
  // authAccounts and users so the account is first-class, then auto-logged-in.
  router.post("/register", async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    if (!EMAIL_RE.test(String(email))) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const dataset = await readDataset();
    if (findAccountByEmail(dataset, email)) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const account = {
      id: `user-${slugify(String(email).split("@")[0] || name)}-${crypto.randomBytes(4).toString("hex")}`,
      name: String(name).trim(),
      email: String(email).toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "user",
      title: "User",
    };
    dataset.authAccounts = dataset.authAccounts || [];
    dataset.users = dataset.users || [];
    dataset.authAccounts.push(account);
    dataset.users.push(buildUserProfile(account));

    const session = issueSession(dataset, account);
    await writeDataset(dataset);

    res.status(201).json({ ok: true, ...session, user: publicUser(dataset, account) });
  });

  // POST /api/auth/refresh — exchange a valid refresh token for a new access token.
  router.post("/refresh", async (req, res) => {
    const { id, secret } = splitRefreshToken((req.body || {}).refreshToken);
    if (!id || !secret) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    const dataset = await readDataset();
    const record = (dataset.refreshTokens || []).find((t) => t.id === id);
    if (!record || record.revoked || record.tokenHash !== hashRefreshSecret(secret)) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(401).json({ error: "Refresh token expired" });
    }
    const account = (dataset.authAccounts || []).find((a) => a.id === record.userId);
    if (!account) {
      return res.status(401).json({ error: "Unknown account" });
    }

    res.json({ ok: true, token: signAccessToken(account) });
  });

  // POST /api/auth/logout — revoke a refresh token.
  router.post("/logout", async (req, res) => {
    const { id } = splitRefreshToken((req.body || {}).refreshToken);
    if (id) {
      const dataset = await readDataset();
      const record = (dataset.refreshTokens || []).find((t) => t.id === id);
      if (record && !record.revoked) {
        record.revoked = true;
        await writeDataset(dataset);
      }
    }
    res.json({ ok: true });
  });

  return router;
}
