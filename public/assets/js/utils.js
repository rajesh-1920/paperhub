function getElement(selector) {
  return document.querySelector(selector);
}

function getElements(selector) {
  return document.querySelectorAll(selector);
}

function createElement(tag, className = "", id = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (id) element.id = id;
  return element;
}

function addClass(element, className) {
  if (element) element.classList.add(className);
}

function removeClass(element, className) {
  if (element) element.classList.remove(className);
}

function toggleClass(element, className) {
  if (element) element.classList.toggle(className);
}

function hasClass(element, className) {
  return element && element.classList.contains(className);
}

function removeElement(element) {
  if (element) element.remove();
}

function showElement(element) {
  if (element) removeClass(element, "hidden");
}

function hideElement(element) {
  if (element) addClass(element, "hidden");
}

function addEvent(element, event, handler) {
  if (element) element.addEventListener(event, handler);
}

function removeEvent(element, event, handler) {
  if (element) element.removeEventListener(event, handler);
}

const PAPERHUB_APP_BASE_URL = (() => {
  const currentScript =
    document.currentScript ||
    Array.from(document.scripts || []).find(
      (script) => script.src && script.src.includes("/assets/js/utils.js"),
    );

  if (currentScript && currentScript.src) {
    return new URL("../../", currentScript.src).href;
  }

  return new URL("./", window.location.href).href;
})();

function resolveAppPath(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return new URL(normalizedPath, PAPERHUB_APP_BASE_URL).href;
}

const PAPERHUB_DATA_URL = resolveAppPath("assets/data/paperhub-backend.json");

/* ---------------------------------------------------------------------------
 * Data store — the JSON file is the database, served and persisted by the Node
 * backend (server/). The whole app reads through getPaperHubDataset() and
 * writes through the ph* mutators, so every action (upload, review decisions,
 * edits, settings) is saved to the JSON file and reflected on every page.
 *
 *   GET  /api/dataset  -> current dataset
 *   PUT  /api/dataset  -> persist the dataset (server writes the JSON file)
 *   POST /api/reset    -> restore the dataset from the pristine seed
 *
 * Reads/writes use synchronous XHR to preserve the app's synchronous data
 * model. If the API is unavailable, reads fall back to the static JSON file so
 * the UI still renders (read-only).
 * ------------------------------------------------------------------------- */

function paperhubApiUrl(path) {
  // The API lives at the server root, regardless of the current page's depth.
  return new URL(path, window.location.origin).href;
}

function fetchDatasetSync() {
  const sources = [paperhubApiUrl("/api/dataset"), PAPERHUB_DATA_URL];
  for (const url of sources) {
    try {
      const request = new XMLHttpRequest();
      request.open("GET", url, false);
      request.send(null);
      if (request.status >= 200 && request.status < 300 && request.responseText) {
        return JSON.parse(request.responseText);
      }
    } catch (error) {
      /* try the next source */
    }
  }
  return {};
}

function getPaperHubDataset() {
  if (window.__paperhubDataset) {
    return window.__paperhubDataset;
  }

  window.__paperhubDataset = fetchDatasetSync();
  return window.__paperhubDataset;
}

function persistPaperHubData() {
  try {
    const request = new XMLHttpRequest();
    request.open("PUT", paperhubApiUrl("/api/dataset"), false);
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify(getPaperHubDataset()));
    if (request.status < 200 || request.status >= 300) {
      console.warn("Unable to persist PaperHub data: HTTP", request.status);
    }
  } catch (error) {
    console.warn("Unable to persist PaperHub data", error);
  }
  notifyPaperHubChange();
}

function resetPaperHubData() {
  try {
    const request = new XMLHttpRequest();
    request.open("POST", paperhubApiUrl("/api/reset"), false);
    request.send(null);
  } catch (error) {
    console.warn("Unable to reset PaperHub data", error);
  }
  delete window.__paperhubDataset;
  notifyPaperHubChange();
}

/* ---------------------------------------------------------------------------
 * Live sync. Every write fires a `paperhub:change` event; the current page
 * registers a refresh via setPaperHubRefresh() so a status change re-renders
 * the open view immediately — no reload needed.
 * ------------------------------------------------------------------------- */

function notifyPaperHubChange() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("paperhub:change"));
  } catch (error) {
    /* CustomEvent unavailable — ignore */
  }
}

function setPaperHubRefresh(refresh) {
  if (typeof window !== "undefined") {
    window.__paperhubRefresh = typeof refresh === "function" ? refresh : null;
  }
}

if (typeof window !== "undefined" && !window.__paperhubSyncBound) {
  window.__paperhubSyncBound = true;
  window.addEventListener("paperhub:change", () => {
    if (typeof window.__paperhubRefresh === "function") {
      try {
        window.__paperhubRefresh();
      } catch (error) {
        console.warn("PaperHub refresh failed", error);
      }
    }
  });
}

function phFindUser(userId) {
  const dataset = getPaperHubDataset();
  return (dataset.users || []).find((user) => user.id === userId) || null;
}

function phMapReviewToFileStatus(status) {
  if (status === "completed" || status === "approved") return "completed";
  if (status === "rejected") return "rejected";
  if (status === "in-review" || status === "forwarded") return "reviewing";
  return "pending";
}

function phMapFileToReviewStatus(status) {
  if (status === "completed") return "completed";
  if (status === "rejected") return "rejected";
  if (status === "reviewing") return "in-review";
  return "pending";
}

/* ---------------------------------------------------------------------------
 * Cross-collection synchronization.
 * A document lives in dataset.files AND its owner's user.files; its review
 * lives in dataset.reviewQueue AND the owner's user.reviews. After a JSON round
 * trip these are separate objects, so a status change must touch every copy and
 * keep the file and its linked review consistent in BOTH directions, so the
 * change shows up the same on every page (files list, review queue/details,
 * dashboards).
 * ------------------------------------------------------------------------- */

function phApplyFileStatus(dataset, fileId, fileStatus) {
  (dataset.files || []).forEach((file) => {
    if (file.id === fileId) file.status = fileStatus;
  });
  (dataset.users || []).forEach((user) =>
    (user.files || []).forEach((file) => {
      if (file.id === fileId) file.status = fileStatus;
    }),
  );
}

function phApplyReviewStatus(dataset, reviewId, reviewStatus) {
  (dataset.reviewQueue || []).forEach((review) => {
    if (review.id === reviewId) review.status = reviewStatus;
  });
  (dataset.users || []).forEach((user) =>
    (user.reviews || []).forEach((review) => {
      if (review.id === reviewId) review.status = reviewStatus;
    }),
  );
}

// Resolve the file <-> review link from whichever id is known.
function phResolveLink(dataset, { fileId, reviewId }) {
  const queue = dataset.reviewQueue || [];
  let fid = fileId || null;
  let rid = reviewId || null;
  if (rid && !fid) {
    const match = queue.find((review) => review.id === rid);
    fid = (match && match.fileId) || fid;
  }
  if (fid && !rid) {
    const match = queue.find((review) => review.fileId === fid);
    rid = (match && match.id) || rid;
  }
  return { fid, rid };
}

// Keep the aggregate dashboard counters in step with the files.
function phRecomputeDashboardStats(dataset) {
  const files = dataset.files || [];
  dataset.dashboardStats = dataset.dashboardStats || {};
  dataset.dashboardStats.totalDocuments = files.length;
  dataset.dashboardStats.pendingReview = files.filter(
    (file) => file.status === "pending" || file.status === "reviewing",
  ).length;
  dataset.dashboardStats.processedDocuments = files.filter(
    (file) => file.status === "completed",
  ).length;
}

// Allowlists and limits guard the mutators against malformed input (e.g. an
// out-of-range status, an oversized name, or an empty comment) before anything
// is written to the persistent store.
const PH_REVIEW_STATUSES = [
  "pending",
  "in-review",
  "completed",
  "rejected",
  "approved",
  "forwarded",
];
const PH_FILE_STATUSES = ["pending", "reviewing", "completed", "rejected"];
const PH_MAX_NAME_LENGTH = 255;
const PH_MAX_COMMENT_LENGTH = 2000;

function phSanitizeName(name) {
  // Strip ASCII control characters (incl. NUL) then clamp length.
  // eslint-disable-next-line no-control-regex
  const stripped = String(name || "").replace(/[\u0000-\u001f\u007f]/g, "");
  return stripped.slice(0, PH_MAX_NAME_LENGTH);
}

function phAddFile(file, reviewItem) {
  const dataset = getPaperHubDataset();
  dataset.files = dataset.files || [];
  dataset.files.unshift(file);

  const owner = phFindUser(file.ownerId);
  if (owner) {
    owner.files = owner.files || [];
    owner.files.unshift(file);
  }

  if (reviewItem) {
    dataset.reviewQueue = dataset.reviewQueue || [];
    dataset.reviewQueue.unshift(reviewItem);
    if (owner) {
      owner.reviews = owner.reviews || [];
      owner.reviews.unshift(reviewItem);
    }
  }

  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

function phUpdateFileStatus(fileId, status) {
  if (!PH_FILE_STATUSES.includes(status)) return;
  const dataset = getPaperHubDataset();
  const { fid, rid } = phResolveLink(dataset, { fileId });
  if (fid) phApplyFileStatus(dataset, fid, status);
  if (rid) phApplyReviewStatus(dataset, rid, phMapFileToReviewStatus(status));
  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

function phDeleteFile(fileId) {
  const dataset = getPaperHubDataset();
  dataset.files = (dataset.files || []).filter((file) => file.id !== fileId);
  (dataset.users || []).forEach((user) => {
    user.files = (user.files || []).filter((file) => file.id !== fileId);
  });
  dataset.reviewQueue = (dataset.reviewQueue || []).filter((review) => review.fileId !== fileId);
  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

function phUpdateUser(userId, patch) {
  const dataset = getPaperHubDataset();
  const user = phFindUser(userId);
  if (user) {
    Object.assign(user, patch);
  }
  const account = (dataset.authAccounts || []).find((entry) => entry.id === userId);
  if (account) {
    if (patch.name) account.name = patch.name;
    if (patch.email) account.email = String(patch.email).toLowerCase();
    if (patch.title) account.title = patch.title;
    if (patch.role) account.role = patch.role;
  }
  persistPaperHubData();
  return user;
}

function phAddUser(account, profile) {
  const dataset = getPaperHubDataset();
  dataset.authAccounts = dataset.authAccounts || [];
  dataset.users = dataset.users || [];
  dataset.authAccounts.push(account);
  dataset.users.push(profile);
  persistPaperHubData();
}

function phSetReviewStatus(reviewId, status) {
  if (!PH_REVIEW_STATUSES.includes(status)) return;
  const dataset = getPaperHubDataset();
  const { fid, rid } = phResolveLink(dataset, { reviewId });
  if (rid) phApplyReviewStatus(dataset, rid, status);
  if (fid) phApplyFileStatus(dataset, fid, phMapReviewToFileStatus(status));
  phRecomputeDashboardStats(dataset);
  persistPaperHubData();
}

function phAddReviewComment(reviewId, comment) {
  const text = String(comment?.text || "").trim();
  if (!text) return;
  const safeComment = { ...comment, text: text.slice(0, PH_MAX_COMMENT_LENGTH) };
  const dataset = getPaperHubDataset();
  const push = (review) => {
    review.comments = review.comments || [];
    review.comments.push(safeComment);
  };
  (dataset.reviewQueue || []).forEach((review) => {
    if (review.id === reviewId) push(review);
  });
  (dataset.users || []).forEach((user) =>
    (user.reviews || []).forEach((review) => {
      if (review.id === reviewId) push(review);
    }),
  );
  persistPaperHubData();
}

function phSetNotificationRead(userId, notificationId, read = true) {
  const user = phFindUser(userId);
  if (user) {
    (user.notifications || []).forEach((notification) => {
      if (String(notification.id) === String(notificationId)) notification.read = read;
    });
  }
  persistPaperHubData();
}

function phMarkAllNotificationsRead(userId) {
  const user = phFindUser(userId);
  if (user) {
    (user.notifications || []).forEach((notification) => {
      notification.read = true;
    });
  }
  persistPaperHubData();
}

function phSaveUserPreferences(userId, prefs) {
  const user = phFindUser(userId);
  if (user) {
    user.preferences = Object.assign({}, user.preferences, prefs);
    if (prefs.language) user.language = prefs.language;
    if (prefs.timezone) user.timezone = prefs.timezone;
  }
  persistPaperHubData();
}

function phSetPaymentStatus(userId, status) {
  const user = phFindUser(userId);
  if (user && user.payment) {
    user.payment.status = status;
    user.payment.lastUpdated = formatDate(new Date(), "DD MMM YYYY, HH:mm");
  }
  persistPaperHubData();
}

function showToast(message, type = "info", duration = 3000) {
  const container = getOrCreateToastContainer();
  const toastId = "toast-" + Date.now();

  const toastClasses = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  };

  const toast = createElement(
    "div",
    `toast ${toastClasses[type] || toastClasses.info} text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in`,
    toastId,
  );
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    fadeOut(toast, () => removeElement(toast));
  }, duration);

  return toastId;
}

function getOrCreateToastContainer() {
  let container = getElement("#toast-container");
  if (!container) {
    container = createElement(
      "div",
      "fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm",
      "toast-container",
    );
    // Announce toasts to assistive tech as they appear.
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    document.body.appendChild(container);
  }
  return container;
}

function showSuccess(message, duration = 3000) {
  return showToast(message, "success", duration);
}

function showError(message, duration = 3000) {
  return showToast(message, "error", duration);
}

function showWarning(message, duration = 3000) {
  return showToast(message, "warning", duration);
}

function showInfo(message, duration = 3000) {
  return showToast(message, "info", duration);
}

function fadeIn(element, duration = 300) {
  element.style.opacity = "0";
  element.style.transition = `opacity ${duration}ms ease-in`;
  setTimeout(() => {
    element.style.opacity = "1";
  }, 10);
}

function fadeOut(element, callback, duration = 300) {
  element.style.opacity = "1";
  element.style.transition = `opacity ${duration}ms ease-out`;
  element.style.opacity = "0";
  setTimeout(() => {
    if (callback) callback();
  }, duration);
}

const StorageKey = {
  USER: "paperhub-user",
  USER_ROLE: "paperhub-user-role",
  THEME: "paperhub-theme",
  PREFERENCES: "paperhub-preferences",
};

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}

function getStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }

    try {
      return JSON.parse(value);
    } catch (parseError) {
      return value;
    }
  } catch (error) {
    console.error("Storage error:", error);
    return defaultValue;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}

function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}

function setCurrentUser(user) {
  setStorage(StorageKey.USER, user);
  setStorage(StorageKey.USER_ROLE, user.role);
}

function getCurrentUser() {
  return getStorage(StorageKey.USER);
}

function getCurrentUserRole() {
  return getStorage(StorageKey.USER_ROLE, "user");
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function hasRole(role) {
  const currentRole = getCurrentUserRole();
  return typeof role === "string" ? currentRole === role : role.includes(currentRole);
}

function logout() {
  removeStorage(StorageKey.USER);
  removeStorage(StorageKey.USER_ROLE);
  window.location.href = resolveAppPath("pages/auth/login.html");
}

function setTheme(isDark) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }

  try {
    localStorage.setItem(StorageKey.THEME, isDark ? "dark" : "light");
  } catch (error) {
    console.error("Storage error:", error);
  }
}

function getTheme() {
  const stored = getStorage(StorageKey.THEME);
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function toggleTheme() {
  const isDark = !getTheme();
  setTheme(isDark);
  return isDark;
}

function initializeTheme() {
  const isDark = getTheme();
  setTheme(isDark);
}

function formatDate(date, format = "MMM DD, YYYY") {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const yyyy = d.getFullYear();
  const MM = months[d.getMonth()];
  const DD = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", yyyy)
    .replace("MMM", MM)
    .replace("DD", DD)
    .replace("HH", HH)
    .replace("mm", mm)
    .replace("ss", ss);
}

function formatTime(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return formatDate(date);
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPassword(password) {
  return password && password.length >= 8;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function formatFileSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.min(sizes.length - 1, Math.floor(Math.log(value) / Math.log(k))));
  return Math.round((value / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showSuccess("Copied to clipboard!");
    })
    .catch(() => {
      showError("Failed to copy to clipboard");
    });
}

function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function redirect(url, delay = 0) {
  if (delay > 0) {
    setTimeout(() => {
      window.location.href = url;
    }, delay);
  } else {
    window.location.href = url;
  }
}

function reloadPage() {
  window.location.reload();
}

function goBack() {
  window.history.back();
}

function getCurrentPage() {
  return window.location.pathname;
}

function getQueryParam(param) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(param);
}

function getAllQueryParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
});

async function apiCall(endpoint) {
  const delay = 500;

  return new Promise((resolve) => {
    setTimeout(() => {
      const dataset = typeof getPaperHubDataset === "function" ? getPaperHubDataset() : {};
      const mockResponses = {
        "/api/dashboard/stats": {
          success: true,
          data: dataset.dashboardStats || {},
        },
        "/api/files": {
          success: true,
          data: Array.isArray(dataset.files) ? dataset.files : [],
        },
      };

      resolve(mockResponses[endpoint] || { success: true, data: {} });
    }, delay);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRole(role) {
  const safeRole = String(role || "user").toLowerCase();

  if (safeRole === "admin") return "admin";
  if (safeRole === "teacher" || safeRole === "officer") return "officer";
  if (safeRole === "student" || safeRole === "user") return "user";
  return "user";
}

const PAPERHUB_ROLE_STORAGE_KEY = "paperhub-role";
const PAPERHUB_CURRENT_USER_STORAGE_KEY = "paperhub-current-user-id";

// Always read users from the live dataset so additions (admin add-user) and
// any array replacement by the ph* mutators are reflected, including after
// SPA-style navigation. Capturing the array once would go stale.
function getMockUsers() {
  const dataset = getPaperHubDataset();
  return Array.isArray(dataset.users) ? dataset.users : [];
}

function getDashboardRole(role) {
  return normalizeRole(role);
}

function getDashboardRouteForRole(role) {
  const dashboardRole = getDashboardRole(role);
  return resolveAppPath(`pages/dashboard/${dashboardRole}.html`);
}

function getDashboardRouteForUser(user) {
  return getDashboardRouteForRole(user?.role || "user");
}

function getMockUserById(userId) {
  const value = String(userId || "");
  return getMockUsers().find((user) => user.id === value) || null;
}

function getMockUserByIdentity(user) {
  if (!user) {
    return null;
  }

  const id = String(user.id || "").trim();
  const email = String(user.email || "")
    .trim()
    .toLowerCase();
  const name = String(user.name || "")
    .trim()
    .toLowerCase();

  return (
    getMockUsers().find((candidate) => candidate.id === id) ||
    getMockUsers().find(
      (candidate) =>
        String(candidate.email || "")
          .trim()
          .toLowerCase() === email,
    ) ||
    getMockUsers().find(
      (candidate) =>
        String(candidate.name || "")
          .trim()
          .toLowerCase() === name,
    ) ||
    null
  );
}

function getDefaultUserForRole(role) {
  const normalizedRole = normalizeRole(role);
  return getMockUsers().find((user) => user.role === normalizedRole) || null;
}

function setStoredRole(role) {
  const normalizedRole = normalizeRole(role);
  try {
    localStorage.setItem(PAPERHUB_ROLE_STORAGE_KEY, normalizedRole);
  } catch (error) {
    console.warn("Unable to persist role", error);
  }
  return normalizedRole;
}

function getStoredRole() {
  try {
    const storedRole = localStorage.getItem(PAPERHUB_ROLE_STORAGE_KEY);
    if (storedRole) {
      return normalizeRole(storedRole);
    }

    return normalizeRole(localStorage.getItem(StorageKey.USER_ROLE));
  } catch (error) {
    return "user";
  }
}

function setCurrentUserById(userId) {
  const selectedUser = getMockUserById(userId);
  const nextUser = selectedUser || getDefaultUserForRole(getStoredRole());

  if (!nextUser) {
    return null;
  }

  try {
    localStorage.setItem(PAPERHUB_CURRENT_USER_STORAGE_KEY, nextUser.id);
  } catch (error) {
    console.warn("Unable to persist current user", error);
  }

  if (typeof setCurrentUser === "function") {
    setCurrentUser(nextUser);
  }

  setStoredRole(nextUser.role);
  return nextUser;
}

function getCurrentUserData() {
  const authUser = getCurrentUser();
  if (authUser && authUser.name && authUser.email) {
    const matchedUser = getMockUserByIdentity(authUser);
    const datasetUser = matchedUser || getDefaultUserForRole(authUser.role);
    if (datasetUser) {
      if (matchedUser) {
        return {
          ...datasetUser,
          ...authUser,
          role: normalizeRole(datasetUser.role || authUser.role),
        };
      }

      return {
        ...datasetUser,
        role: normalizeRole(datasetUser.role || authUser.role),
      };
    }

    return {
      ...authUser,
      role: normalizeRole(authUser.role),
    };
  }

  try {
    const savedUserId = localStorage.getItem(PAPERHUB_CURRENT_USER_STORAGE_KEY);
    const selectedUser = getMockUserById(savedUserId);
    if (selectedUser) {
      setStoredRole(selectedUser.role);
      return selectedUser;
    }
  } catch (error) {
    console.warn("Unable to read current user", error);
  }

  const fallbackUser = getDefaultUserForRole(getStoredRole());
  if (!fallbackUser) {
    return null;
  }
  setCurrentUserById(fallbackUser.id);
  return fallbackUser;
}

function getCurrentUserFiles() {
  const user = getCurrentUserData();
  return user && Array.isArray(user.files) ? user.files : [];
}

function getCurrentUserPayment() {
  const user = getCurrentUserData();
  return user ? user.payment || null : null;
}

function getCurrentUserNotifications() {
  const user = getCurrentUserData();
  return user && Array.isArray(user.notifications) ? user.notifications : [];
}

function canAccessPathByRole(pathname, role) {
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

function enforcePageAccess() {
  const currentUser = getCurrentUserData();
  const hasAccess = canAccessPathByRole(window.location.pathname, currentUser.role);
  if (hasAccess) {
    return true;
  }

  const redirectPath = getDashboardRouteForUser(currentUser);
  window.location.replace(redirectPath);
  return false;
}
