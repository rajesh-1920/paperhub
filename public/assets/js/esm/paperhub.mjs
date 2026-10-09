// @ts-check
/**
 * PaperHub ESM barrel — single import point for modernized frontend code.
 *
 * Usage (in a `type="module"` script):
 *   import { escapeHtml, apiFetch, normalizeRole } from "../esm/paperhub.mjs";
 *
 * Legacy classic scripts (`utils.js`, `main.js`, ...) keep working via
 * globals; migrate leaf pages first (auth/activity/share-view/profile).
 */

export {
  escapeHtml,
  formatDate,
  formatTime,
  timeAgo,
  formatFileSize,
  formatCurrency,
  slugify,
} from "./format.mjs";

export {
  isValidEmail,
  isValidPassword,
  isValidUrl,
  normalizeRole,
  canAccessPathByRole,
  getDashboardPathForRole,
} from "./validate.mjs";

export { paperhubApiUrl, getAuthHeaders, apiFetch, apiGet } from "./api.mjs";

export { createDatasetStore } from "./store.mjs";

export {
  SESSION_KEY,
  PREFS_KEY,
  readSession,
  writeSession,
  clearSession,
  readPrefs,
  writePrefs,
} from "./session.mjs";
