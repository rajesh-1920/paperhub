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
