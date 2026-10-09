// @ts-check
/**
 * PaperHub ESM — pure validation / role helpers.
 *
 * Mirrors `public/assets/js/utils.js` (legacy globals) exactly. New code
 * should import from here; legacy pages keep working unchanged.
 */

/**
 * @param {unknown} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email ?? ""));
}

/**
 * @param {unknown} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
  return !!password && String(password).length >= 8;
}

/**
 * @param {unknown} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
  try {
    new URL(String(url));
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize any role label to admin | officer | user.
 * @param {unknown} role
 * @returns {"admin" | "officer" | "user"}
 */
export function normalizeRole(role) {
  const safeRole = String(role || "user").toLowerCase();

  if (safeRole === "admin") return "admin";
  if (safeRole === "teacher" || safeRole === "officer") return "officer";
  if (safeRole === "student" || safeRole === "user") return "user";
  return "user";
}

/**
 * Pure route guard — same matrix as legacy `canAccessPathByRole`.
 * @param {unknown} pathname
 * @param {unknown} role
 * @returns {boolean}
 */
export function canAccessPathByRole(pathname, role) {
  const path = String(pathname || "").toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (path.includes("/pages/dashboard/admin.html")) {
    return normalizedRole === "admin";
  }

  if (path.includes("/pages/dashboard/officer.html")) {
    return normalizedRole === "officer" || normalizedRole === "admin";
  }

  if (path.includes("/pages/dashboard/user.html")) {
    return normalizedRole === "user" || normalizedRole === "admin";
  }

  if (path.includes("/pages/review/review-queue.html")) {
    return normalizedRole === "officer" || normalizedRole === "admin";
  }

  if (path.includes("/pages/review/review-details.html")) {
    return true;
  }

  if (path.includes("/pages/payment/")) {
    return normalizedRole === "user" || normalizedRole === "admin";
  }

  if (path.includes("/pages/file/upload.html")) {
    return normalizedRole === "user";
  }

  return true;
}

/**
 * @param {unknown} role
 * @returns {string} dashboard page path (app-relative, no origin)
 */
export function getDashboardPathForRole(role) {
  const normalized = normalizeRole(role);
  return `pages/dashboard/${normalized}.html`;
}
