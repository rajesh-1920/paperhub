/**
 * PaperHub - Utility Functions
 * Shared utility functions used across the application
 */

// ==================== DOM Utilities ====================

/**
 * Safely select DOM element
 */
function getElement(selector) {
  return document.querySelector(selector);
}

/**
 * Get multiple DOM elements
 */
function getElements(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Create element with classes
 */
function createElement(tag, className = "", id = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (id) element.id = id;
  return element;
}

/**
 * Add class to element
 */
function addClass(element, className) {
  if (element) element.classList.add(className);
}

/**
 * Remove class from element
 */
function removeClass(element, className) {
  if (element) element.classList.remove(className);
}

/**
 * Toggle class on element
 */
function toggleClass(element, className) {
  if (element) element.classList.toggle(className);
}

/**
 * Check if element has class
 */
function hasClass(element, className) {
  return element ? element.classList.contains(className) : false;
}

/**
 * Set multiple attributes at once
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach((key) => {
    element.setAttribute(key, attributes[key]);
  });
}

/**
 * Remove element from DOM
 */
function removeElement(element) {
  if (element) element.remove();
}

/**
 * Show element
 */
function showElement(element) {
  if (element) removeClass(element, "hidden");
}

/**
 * Hide element
 */
function hideElement(element) {
  if (element) addClass(element, "hidden");
}

// ==================== Event Utilities ====================

/**
 * Add event listener with cleanup
 */
function addEvent(element, event, handler) {
  if (element) element.addEventListener(event, handler);
  return () => element?.removeEventListener(event, handler);
}

/**
 * Add multiple events at once
 */
function addEvents(element, events) {
  Object.entries(events).forEach(([event, handler]) => {
    element.addEventListener(event, handler);
  });
}

/**
 * Debounce function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ==================== Storage Utilities ====================

/**
 * Get from localStorage
 */
function getStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    console.error("Storage get error:", e);
    return defaultValue;
  }
}

/**
 * Set to localStorage
 */
function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Storage set error:", e);
    return false;
  }
}

/**
 * Remove from localStorage
 */
function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error("Storage remove error:", e);
    return false;
  }
}

/**
 * Clear all localStorage
 */
function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (e) {
    console.error("Storage clear error:", e);
    return false;
  }
}

// ==================== Session Utilities ====================

/**
 * Get user session from storage
 */
function getSession() {
  return getStorage("session", null);
}

/**
 * Set user session
 */
function setSession(session) {
  return setStorage("session", session);
}

/**
 * Clear user session
 */
function clearSession() {
  return removeStorage("session");
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  return getSession() !== null;
}

/**
 * Get current user
 */
function getCurrentUser() {
  const session = getSession();
  return session ? session.user : null;
}

// ==================== Validation Utilities ====================

/**
 * Validate email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

/**
 * Validate required field
 */
function isRequired(value) {
  return value && value.trim().length > 0;
}

/**
 * Get form data as object
 */
function getFormData(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData);
}

/**
 * Validate form object
 */
function validateForm(formData, rules) {
  const errors = {};

  Object.entries(rules).forEach(([field, rule]) => {
    const value = formData[field] || "";

    if (rule.required && !isRequired(value)) {
      errors[field] = `${rule.label} is required`;
    } else if (rule.type === "email" && !isValidEmail(value)) {
      errors[field] = "Invalid email format";
    } else if (rule.type === "password" && value && !isStrongPassword(value)) {
      errors[field] =
        "Password must be at least 8 characters with uppercase, lowercase, number and special character";
    } else if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `${rule.label} must be at least ${rule.minLength} characters`;
    } else if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${rule.label} must be at most ${rule.maxLength} characters`;
    } else if (rule.match && value !== formData[rule.match]) {
      errors[field] = `${rule.label} does not match`;
    }
  });

  return errors;
}

// ==================== Toast Utilities ====================

/**
 * Show toast notification
 */
function showToast(message, type = "info", duration = 3000) {
  const toastId = "toast-" + Date.now();
  const toastHTML = `
    <div class="toast alert alert-${type}" id="${toastId}">
      ${message}
    </div>
  `;

  const container = getElement("#toast-container") || createToastContainer();
  container.insertAdjacentHTML("beforeend", toastHTML);

  const toastElement = getElement("#" + toastId);

  setTimeout(() => {
    removeClass(toastElement, "show");
    setTimeout(() => removeElement(toastElement), 300);
  }, duration);

  addClass(toastElement, "show");
  return toastId;
}

/**
 * Create toast container if not exists
 */
function createToastContainer() {
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
}

/**
 * Show success toast
 */
function showSuccess(message, duration = 3000) {
  return showToast(message, "success", duration);
}

/**
 * Show error toast
 */
function showError(message, duration = 3000) {
  return showToast(message, "danger", duration);
}

/**
 * Show warning toast
 */
function showWarning(message, duration = 3000) {
  return showToast(message, "warning", duration);
}

/**
 * Show info toast
 */
function showInfo(message, duration = 3000) {
  return showToast(message, "info", duration);
}

// ==================== Modal Utilities ====================

/**
 * Show modal
 */
function showModal(modalId) {
  const modal = getElement("#" + modalId);
  if (modal) {
    addClass(modal, "active");
    showElement(modal);
  }
}

/**
 * Hide modal
 */
function hideModal(modalId) {
  const modal = getElement("#" + modalId);
  if (modal) {
    removeClass(modal, "active");
    hideElement(modal);
  }
}

/**
 * Toggle modal
 */
function toggleModal(modalId) {
  const modal = getElement("#" + modalId);
  if (modal) {
    toggleClass(modal, "active");
    toggleClass(modal, "hidden");
  }
}

// ==================== Formatting Utilities ====================

/**
 * Format date
 */
function formatDate(date, format = "MM/DD/YYYY") {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return format
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ==================== API Utilities ====================

/**
 * Mock API call with delay
 */
async function apiCall(endpoint, options = {}) {
  const { method = "GET", body = null, delay = 500 } = options;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Mock response based on endpoint
      const mockResponses = {
        "/api/auth/login": {
          success: true,
          data: {
            token: "mock-token-" + Date.now(),
            user: {
              id: "1",
              name: "John Doe",
              email: "john@paperhub.com",
              role: "user",
              avatar: "https://ui-avatars.com/api/?name=John+Doe",
            },
          },
        },
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

// ==================== Keyboard Utilities ====================

/**
 * Handle keyboard shortcut
 */
function onKeyPress(key, callback, element = window) {
  const handler = (e) => {
    if (e.key.toLowerCase() === key.toLowerCase()) {
      callback(e);
    }
  };
  element.addEventListener("keypress", handler);
  return () => element.removeEventListener("keypress", handler);
}

/**
 * Handle keyboard combination
 */
function onKeyCombo(keys, callback, element = document) {
  const handler = (e) => {
    const pressed = keys.every(
      (key) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key.toLowerCase(),
    );
    if (pressed) {
      e.preventDefault();
      callback(e);
    }
  };
  element.addEventListener("keydown", handler);
  return () => element.removeEventListener("keydown", handler);
}

// ==================== Scroll Utilities ====================

/**
 * Smooth scroll to element
 */
function scrollToElement(element, offset = 0) {
  const elementPosition = element.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: elementPosition - offset,
    behavior: "smooth",
  });
}

/**
 * Scroll to top
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Check if element is in viewport
 */
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

// ==================== Array/Object Utilities ====================

/**
 * Deep clone object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects
 */
function mergeObjects(...objects) {
  return Object.assign({}, ...objects);
}

/**
 * Filter object by keys
 */
function filterObject(obj, keys) {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
}
