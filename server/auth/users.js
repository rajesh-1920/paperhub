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

// Projection of the whole dataset that is safe to send to a client: account
// credentials stripped, and the server-only refreshTokens/auditLog never leave
// (the audit log is exposed later through a dedicated, admin-scoped API).
export function sanitizeDataset(dataset) {
  return {
    ...dataset,
    authAccounts: (dataset.authAccounts || []).map(sanitizeAccount),
    refreshTokens: [],
    auditLog: [],
  };
}

// The client never receives credentials or refresh tokens, so a round-tripped
// whole-dataset PUT must not wipe them: restore each account's stored
// credentials (by id) and keep the server's refreshTokens untouched.
export function preserveServerSecrets(incoming, current) {
  const byId = new Map((current.authAccounts || []).map((a) => [a.id, a]));
  const authAccounts = (incoming.authAccounts || []).map((acc) => {
    const existing = byId.get(acc.id);
    if (!existing) {
      return acc; // a brand-new account (e.g. admin-added) keeps its own fields
    }
    const restored = { ...acc };
    if (!restored.passwordHash && existing.passwordHash) {
      restored.passwordHash = existing.passwordHash;
    }
    if (!restored.passwordHash && !restored.password && existing.password != null) {
      restored.password = existing.password;
    }
    return restored;
  });
  return {
    ...incoming,
    authAccounts,
    refreshTokens: current.refreshTokens || [],
    auditLog: current.auditLog || [],
  };
}

// A fresh, fully-shaped user profile for a new account, so dashboards and the
// file UI render without special-casing. Mirrors the client buildNewUserProfile.
export function buildUserProfile(account, todayIso = new Date().toISOString().slice(0, 10)) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    title: account.title || "User",
    department: account.department || "General",
    lastLogin: "Just now",
    joinedDate: todayIso,
    address: "Bangladesh",
    company: "PaperHub Bangladesh",
    phone: "",
    timezone: "UTC +06:00",
    language: "Bengali",
    bio: "New PaperHub account.",
    accountStatus: "Active",
    twoFactorEnabled: account.role !== "user",
    plan: {
      name: "Starter",
      cycle: "Billed yearly",
      renewal: "",
      seats: "1 seat",
      status: "Active",
    },
    connectedApps: [],
    permissions: [],
    dashboard: {
      description: "",
      stats: { totalSubmissions: 0, pendingReview: 0, approved: 0, rejected: 0 },
    },
    files: [],
    reviews: [],
    payment: { status: "Settled", totalDue: "BDT 0.00", lastUpdated: "", nextReview: "" },
    notifications: [],
  };
}
