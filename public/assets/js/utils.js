// ============================================================================
// PaperHub Utilities - DOM, Storage, API, and Helper Functions
// ============================================================================

// ---------- DOM MANIPULATION ----------
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

// ---------- NOTIFICATIONS/TOAST ----------
function showToast(message, type = "info", duration = 3000) {
  const container = getOrCreateToastContainer();
  const toastId = "toast-" + Date.now();
  
  const toastClasses = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500"
  };

  const toast = createElement("div", `toast ${toastClasses[type] || toastClasses.info} text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in`, toastId);
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
    container = createElement("div", "fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm", "toast-container");
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

// ---------- ANIMATIONS ----------
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

// ---------- LOCAL STORAGE ----------
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
    return value ? JSON.parse(value) : defaultValue;
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

// ---------- USER MANAGEMENT ----------
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
  window.location.href = "/pages/auth/login.html";
}

// ---------- THEME MANAGEMENT ----------
function setTheme(isDark) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
  setStorage(StorageKey.THEME, isDark ? "dark" : "light");
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

// ---------- DATE/TIME ----------
function formatDate(date, format = "MMM DD, YYYY") {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

// ---------- VALIDATION ----------
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

// ---------- FORMATTING ----------
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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

// ---------- UTILITIES ----------
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
  return new Promise(resolve => setTimeout(resolve, ms));
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showSuccess("Copied to clipboard!");
  }).catch(() => {
    showError("Failed to copy to clipboard");
  });
}

function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ---------- API HELPERS ----------
async function apiCall(url, options = {}) {
  const defaultOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return {
      success: true,
      data: await response.json(),
      status: response.status,
    };
  } catch (error) {
    console.error("API Call Error:", error);
    return {
      success: false,
      error: error.message,
      status: null,
    };
  }
}

function apiGet(url) {
  return apiCall(url, { method: "GET" });
}

function apiPost(url, data) {
  return apiCall(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

function apiPut(url, data) {
  return apiCall(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

function apiDelete(url) {
  return apiCall(url, { method: "DELETE" });
}

// ---------- PAGE HELPERS ----------
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

// ---------- INITIALIZATION ----------
document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
});

// Export for module usage if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getElement,
    getElements,
    createElement,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    removeElement,
    showElement,
    hideElement,
    addEvent,
    removeEvent,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    fadeIn,
    fadeOut,
    setStorage,
    getStorage,
    removeStorage,
    clearStorage,
    setCurrentUser,
    getCurrentUser,
    getCurrentUserRole,
    isLoggedIn,
    hasRole,
    logout,
    setTheme,
    getTheme,
    toggleTheme,
    initializeTheme,
    formatDate,
    formatTime,
    timeAgo,
    isValidEmail,
    isValidPassword,
    isValidUrl,
    formatFileSize,
    formatCurrency,
    slugify,
    debounce,
    throttle,
    delay,
    copyToClipboard,
    generateId,
    apiCall,
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
    redirect,
    reloadPage,
    goBack,
    getCurrentPage,
    getQueryParam,
    getAllQueryParams,
  };
}

  return `${month}/${day}/${year}`;
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

async function apiCall(endpoint) {
  const delay = 500;

  return new Promise((resolve) => {
    setTimeout(() => {
      const mockResponses = {
        "/api/dashboard/stats": {
          success: true,
          data: {
            totalDocuments: 156,
            pendingReview: 12,
            processedDocuments: 144,
            totalPayments: 2450.0,
          },
        },
        "/api/files": {
          success: true,
          data: [
            {
              id: "1",
              name: "Q4 Financial Report.pdf",
              size: 2048576,
              uploadedAt: new Date().toISOString(),
              status: "completed",
            },
            {
              id: "2",
              name: "Annual Summary.pdf",
              size: 1024000,
              uploadedAt: new Date().toISOString(),
              status: "reviewing",
            },
          ],
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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRole(role) {
  const VALID_ROLES = ["student", "teacher", "admin"];
  const safeRole = String(role || "student").toLowerCase();
  if (VALID_ROLES.includes(safeRole)) {
    return safeRole;
  }
  return "student";
}

const PAPERHUB_ROLE_STORAGE_KEY = "paperhub-role";
const PAPERHUB_CURRENT_USER_STORAGE_KEY = "paperhub-current-user-id";

const MOCK_USERS = [
  {
    id: "student-rajesh",
    name: "Rajesh Biswas",
    email: "rajesh18@cse.pstu.ac.bd",
    role: "student",
    title: "Final Year Student",
    department: "CSE",
    lastLogin: "Today, 09:12 AM",
    permissions: ["Upload Documents", "Track Submission", "Access Payment"],
    dashboard: {
      description: "Your personal workspace for uploads, approvals, and payment tracking.",
      stats: {
        totalSubmissions: 12,
        pendingReview: 3,
        approved: 8,
        rejected: 1,
      },
    },
    files: [
      {
        id: "s1",
        name: "Admission Form.pdf",
        size: 2048576,
        uploadedAt: "2026-04-18T08:30:00.000Z",
        status: "reviewing",
      },
      {
        id: "s2",
        name: "Transcript.pdf",
        size: 1024000,
        uploadedAt: "2026-04-15T10:15:00.000Z",
        status: "completed",
      },
    ],
    reviews: [],
    payment: {
      status: "Pending Approval",
      totalDue: "$1,265.00",
      lastUpdated: "Apr 18, 2026 - 10:30 AM",
      nextReview: "Apr 20, 2026",
    },
  },
  {
    id: "teacher-mahmud",
    name: "Mahmud Hasan",
    email: "mahmud.hasan@paperhub.edu",
    role: "teacher",
    title: "Document Review Officer",
    department: "Academic Review",
    lastLogin: "Today, 08:45 AM",
    permissions: ["Review Queue", "Approve / Reject", "Comment & Escalate"],
    dashboard: {
      description: "Prioritize pending submissions and keep review quality high.",
      stats: {
        pendingReviews: 7,
        approved: 24,
        rejected: 3,
        assignedStudents: 42,
      },
    },
    files: [
      {
        id: "t1",
        name: "Pending-Application-Batch.pdf",
        size: 1843200,
        uploadedAt: "2026-04-16T07:00:00.000Z",
        status: "reviewing",
      },
    ],
    reviews: [
      {
        id: "r1",
        documentName: "Admission Form.pdf",
        submittedBy: "Sarah Johnson",
        submittedDate: "2026-04-18",
        priority: "high",
        status: "pending",
      },
      {
        id: "r2",
        documentName: "Application.pdf",
        submittedBy: "Michael Chen",
        submittedDate: "2026-04-17",
        priority: "medium",
        status: "in-review",
      },
    ],
    payment: {
      status: "N/A",
      totalDue: "$0.00",
      lastUpdated: "Not Applicable",
      nextReview: "Not Applicable",
    },
  },
  {
    id: "admin-sadia",
    name: "Sadia Rahman",
    email: "sadia.rahman@paperhub.edu",
    role: "admin",
    title: "Platform Administrator",
    department: "Operations",
    lastLogin: "Today, 07:58 AM",
    permissions: ["User Management", "System Reports", "Global Approval Authority"],
    dashboard: {
      description: "Monitor platform health, user growth, and escalated approvals.",
      stats: {
        totalUsers: 245,
        documents: "1.2K",
        approved: 892,
        alerts: 2,
      },
    },
    files: [
      {
        id: "a1",
        name: "System-Audit-April.pdf",
        size: 2457600,
        uploadedAt: "2026-04-17T13:22:00.000Z",
        status: "completed",
      },
    ],
    reviews: [
      {
        id: "r3",
        documentName: "Research Paper.pdf",
        submittedBy: "James Brown",
        submittedDate: "2026-04-16",
        priority: "high",
        status: "pending",
      },
      {
        id: "r4",
        documentName: "Final Thesis.pdf",
        submittedBy: "Olivia Taylor",
        submittedDate: "2026-04-15",
        priority: "medium",
        status: "in-review",
      },
    ],
    payment: {
      status: "Cleared",
      totalDue: "$0.00",
      lastUpdated: "Apr 19, 2026 - 09:05 AM",
      nextReview: "Completed",
    },
  },
];

function getAllMockUsers() {
  return MOCK_USERS.slice();
}

function getDashboardRole(role) {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "teacher" || normalized === "officer") return "officer";
  return "user";
}

function getDashboardRouteForRole(role) {
  const dashboardRole = getDashboardRole(role);
  return `/pages/dashboard/${dashboardRole}.html`;
}

function getDashboardRouteForUser(user) {
  return getDashboardRouteForRole(user?.role || "student");
}

function getMockUserById(userId) {
  const value = String(userId || "");
  return MOCK_USERS.find((user) => user.id === value) || null;
}

function getDefaultUserForRole(role) {
  const normalizedRole = normalizeRole(role);
  return MOCK_USERS.find((user) => user.role === normalizedRole) || MOCK_USERS[0];
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
    return normalizeRole(localStorage.getItem(PAPERHUB_ROLE_STORAGE_KEY));
  } catch (error) {
    return "student";
  }
}

function setCurrentUserById(userId) {
  const selectedUser = getMockUserById(userId);
  const nextUser = selectedUser || getDefaultUserForRole(getStoredRole());

  try {
    localStorage.setItem(PAPERHUB_CURRENT_USER_STORAGE_KEY, nextUser.id);
  } catch (error) {
    console.warn("Unable to persist current user", error);
  }

  setStoredRole(nextUser.role);
  return nextUser;
}

function getCurrentUserData() {
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
  setCurrentUserById(fallbackUser.id);
  return fallbackUser;
}

function getCurrentUserFiles() {
  return getCurrentUserData().files || [];
}

function getCurrentUserReviews() {
  return getCurrentUserData().reviews || [];
}

function getCurrentUserPayment() {
  return getCurrentUserData().payment || null;
}

function canAccessPathByRole(pathname, role) {
  const path = String(pathname || "").toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (path.includes("/pages/dashboard/admin.html")) {
    return normalizedRole === "admin";
  }

  if (path.includes("/pages/dashboard/officer.html")) {
    return normalizedRole === "teacher" || normalizedRole === "admin";
  }

  if (path.includes("/pages/dashboard/user.html")) {
    return normalizedRole === "student" || normalizedRole === "admin";
  }

  if (path.includes("/pages/review/")) {
    return normalizedRole === "teacher" || normalizedRole === "admin";
  }

  if (path.includes("/pages/payment/")) {
    return normalizedRole === "student" || normalizedRole === "admin";
  }

  if (path.includes("/pages/file/upload.html")) {
    return normalizedRole === "student";
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
