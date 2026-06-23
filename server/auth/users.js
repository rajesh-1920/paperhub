// Helpers for turning an internal authAccount into a safe, client-facing user
// object. Credentials (password / passwordHash) must never leave the server.

export function sanitizeAccount(account) {
  if (!account) {
    return account;
  }
  const clone = { ...account };
  delete clone.password;
  delete clone.passwordHash;
  return clone;
}

// The full public profile: the user's dataset record merged with their account
// identity (id/email/role/title), credentials stripped.
export function publicUser(dataset, account) {
  if (!account) {
    return null;
  }
  const profile = (dataset.users || []).find((u) => u.id === account.id) || {};
  return { ...profile, ...sanitizeAccount(account) };
}

export function findAccountByEmail(dataset, email) {
  const lower = String(email || "").toLowerCase();
  return (dataset.authAccounts || []).find((a) => String(a.email).toLowerCase() === lower) || null;
}
