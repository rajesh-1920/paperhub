import { Router } from "express";
import { readDataset, writeDataset } from "../db.js";
import { verifyPassword, hashPassword } from "../auth/passwords.js";
import { publicUser, findAccountByEmail } from "../auth/users.js";
import {
  signAccessToken,
  createRefreshToken,
  hashRefreshSecret,
  splitRefreshToken,
} from "../auth/tokens.js";

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
    await writeDataset(dataset);

    res.json({
      ok: true,
      token: signAccessToken(account),
      refreshToken: refresh.token,
      user: publicUser(dataset, account),
    });
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
