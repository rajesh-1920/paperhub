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

function showToast(message, type = "info", duration = 3000) {
  const getOrCreateToastContainer = () => {
    const existing = getElement("#toast-container");
    if (existing) {
      return existing;
    }

    const container = createElement("div", "", "toast-container");
    container.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
  };

  const toastId = "toast-" + Date.now();
  const toastHTML = `
    <div class="toast alert alert-${type}" id="${toastId}">
      ${message}
    </div>
  `;

  const container = getOrCreateToastContainer();
  container.insertAdjacentHTML("beforeend", toastHTML);

  const toastElement = getElement("#" + toastId);

  setTimeout(() => {
    removeClass(toastElement, "show");
    setTimeout(() => removeElement(toastElement), 300);
  }, duration);

  addClass(toastElement, "show");
  return toastId;
}

function showSuccess(message, duration = 3000) {
  return showToast(message, "success", duration);
}

function showError(message, duration = 3000) {
  return showToast(message, "danger", duration);
}

function showWarning(message, duration = 3000) {
  return showToast(message, "warning", duration);
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

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
