import bcrypt from "bcryptjs";
import { authConfig } from "../config.js";

// Password hashing service (bcryptjs — pure JS, no native build). Used by the
// auth endpoints and the migration backfill.

export function hashPassword(plain, env = process.env) {
  return bcrypt.hash(String(plain), authConfig(env).bcryptRounds);
}

export function verifyPassword(plain, hash) {
  if (!hash) {
    return Promise.resolve(false);
  }
  return bcrypt.compare(String(plain), String(hash));
}

// Idempotently convert any authAccount carrying a plaintext `password` into a
// bcrypt `passwordHash`, stripping the plaintext. Safe to run repeatedly: an
// account that already has a passwordHash is left untouched. Returns whether
// anything changed so the caller can avoid a needless write.
export async function backfillPasswords(dataset, env = process.env) {
  let changed = false;
  for (const account of dataset.authAccounts || []) {
    if (!account.passwordHash && account.password) {
      account.passwordHash = await hashPassword(account.password, env);
      delete account.password;
      changed = true;
    }
  }
  return { dataset, changed };
}
