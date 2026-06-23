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
