// @ts-check
/**
 * PaperHub ESM — consolidated session storage (Phase 4).
 *
 * Legacy code scatters auth/session state across many localStorage keys
 * (paperhub-user, paperhub-user-role, paperhub-auth-token,
 * paperhub-refresh-token, paperhub-theme, paperhub-role,
 * paperhub-current-user-id, paperhub-sidebar-state). This module consolidates
 * NEW writes into two versioned keys while reading legacy keys as fallback,
 * so migration is non-breaking:
 *
 *   paperhub-session:v1 { user, tokens: { access, refresh } }
 *   paperhub-prefs:v1    { theme, sidebar }
 *
 * All helpers take a Storage-like object ({getItem,setItem,removeItem}) so
 * they are unit-testable in Node with a plain-object stub.
 */

export const SESSION_KEY = "paperhub-session:v1";
export const PREFS_KEY = "paperhub-prefs:v1";

const LEGACY = {
  user: "paperhub-user",
  role: "paperhub-user-role",
  token: "paperhub-auth-token",
  refresh: "paperhub-refresh-token",
  theme: "paperhub-theme",
  altRole: "paperhub-role",
  userId: "paperhub-current-user-id",
  sidebar: "paperhub-sidebar-state",
};

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} key
 * @returns {any}
 */
function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return undefined;
  }
}

/**
 * Read the session. Prefers the consolidated key, falls back to legacy keys.
 * @param {Pick<Storage, "getItem">} storage
 * @returns {{ user: any | null, token: string, refreshToken: string }}
 */
export function readSession(storage) {
  const consolidated = readJson(storage, SESSION_KEY);
  if (consolidated && typeof consolidated === "object") {
    return {
      user: consolidated.user ?? null,
      token: consolidated.tokens?.access ?? "",
      refreshToken: consolidated.tokens?.refresh ?? "",
    };
  }
  return {
    user: readJson(storage, LEGACY.user) ?? null,
    token: String(readJson(storage, LEGACY.token) ?? ""),
    refreshToken: String(readJson(storage, LEGACY.refresh) ?? ""),
  };
}

/**
 * Write the session to the consolidated key AND legacy keys (dual-write keeps
 * old pages working until every page migrates to readSession()).
 * @param {Pick<Storage, "getItem" | "setItem" | "removeItem">} storage
 * @param {{ user?: any | null, token?: string, refreshToken?: string }} session
 */
export function writeSession(storage, { user = null, token = "", refreshToken = "" } = {}) {
  const payload = { v: 1, user, tokens: { access: token, refresh: refreshToken } };
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(payload));
    storage.setItem(LEGACY.user, JSON.stringify(user));
    storage.setItem(LEGACY.token, JSON.stringify(token));
    storage.setItem(LEGACY.refresh, JSON.stringify(refreshToken));
    if (user && typeof user === "object" && user.role) {
      storage.setItem(LEGACY.role, JSON.stringify(user.role));
    }
  } catch {
    /* storage full / unavailable — session simply won't persist */
  }
}

/**
 * Clear both consolidated and legacy session keys.
 * @param {Pick<Storage, "removeItem">} storage
 */
export function clearSession(storage) {
  for (const key of [SESSION_KEY, LEGACY.user, LEGACY.role, LEGACY.token, LEGACY.refresh]) {
    try {
      storage.removeItem(key);
    } catch {
      /* best effort */
    }
  }
}

/**
 * Read UI prefs with legacy fallback.
 * @param {Pick<Storage, "getItem">} storage
 * @returns {{ theme: string | null, sidebar: string | null }}
 */
export function readPrefs(storage) {
  const consolidated = readJson(storage, PREFS_KEY);
  if (consolidated && typeof consolidated === "object") {
    return { theme: consolidated.theme ?? null, sidebar: consolidated.sidebar ?? null };
  }
  return {
    theme: readJson(storage, LEGACY.theme) ?? null,
    sidebar: readJson(storage, LEGACY.sidebar) ?? null,
  };
}

/**
 * @param {Pick<Storage, "setItem">} storage
 * @param {{ theme?: string | null, sidebar?: string | null }} prefs
 */
export function writePrefs(storage, { theme = null, sidebar = null } = {}) {
  try {
    storage.setItem(PREFS_KEY, JSON.stringify({ v: 1, theme, sidebar }));
    if (theme != null) storage.setItem(LEGACY.theme, theme);
    if (sidebar != null) storage.setItem(LEGACY.sidebar, sidebar);
  } catch {
    /* best effort */
  }
}
