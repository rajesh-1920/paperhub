const COMPONENT_CACHE_KEY = "paperhub-component-cache";

const PAPERHUB_MAIN_APP_BASE_URL = (() => {
  const currentScript =
    document.currentScript ||
    Array.from(document.scripts || []).find(
      (script) => script.src && script.src.includes("/assets/js/main.js"),
    );

  if (currentScript && currentScript.src) {
    return new URL("../../", currentScript.src).href;
  }

  return new URL("./", window.location.href).href;
})();

function resolveMainAppUrl(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return new URL(normalizedPath, PAPERHUB_MAIN_APP_BASE_URL).href;
}

(function applyInitialThemePreference() {
  const root = document.documentElement;

  try {
    const storedTheme = localStorage.getItem("paperhub-theme");
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = storedTheme ? storedTheme === "dark" : prefersDark;

    root.classList.toggle("dark", useDark);
  } catch (error) {
    console.warn("Unable to apply initial theme preference", error);
  }
})();

async function initApp() {
  ensureStyles([
    "assets/css/components/navbar.css",
    "assets/css/components/sidebar.css",
    "assets/css/components/footer.css",
    "assets/css/components/breadcrumbs.css",
    "assets/css/components/table.css",
    "assets/css/components/file.css",
    "assets/css/components/upload.css",
    "assets/css/components/timeline.css",
    "assets/css/components/review.css",
    "assets/css/components/contact.css",
    "assets/css/components/account.css",
    "assets/css/components/payment.css",
    "assets/css/dark-mode.css",
  ]);

  await Promise.all([
    ensureScript({
      globalKey: "initPaperHubNavbar",
      selector: 'script[data-paperhub-navbar="true"]',
      src: "assets/js/navbar.js",
      datasetKey: "paperhubNavbar",
      errorMessage: "Unable to load navbar module.",
    }),
    loadComponents(),
  ]);

  if (document.getElementById("paperhubNavbar")) {
    document.body.classList.add("paperhub-has-navbar");
  }

  if (typeof enforcePageAccess === "function") {
    const canRender = enforcePageAccess();
    if (!canRender) {
      return;
    }
  }

  initNavbar();
  applyCurrentUserPageData();
  initPageSpecificForms();

  if (typeof setPaperHubRefresh === "function") {
    setPaperHubRefresh(paperhubSyncRefresh);
  }

  // When the page is restored from the back/forward cache, DOMContentLoaded
  // does not fire again — re-pull the dataset and re-render so counts (e.g. a
  // freshly uploaded file) are never stale.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) {
      return;
    }
    if (typeof refreshPaperHubDataset === "function") {
      refreshPaperHubDataset();
    }
    paperhubSyncRefresh();
  });
}

// Re-render every dynamic surface on the current page after a data change, so a
// status update reflects everywhere at once (files list, review queue/details,
// dashboards) without a reload.
function paperhubSyncRefresh() {
  const body = document.body;
  try {
    if (body.classList.contains("review-queue-page") && typeof refreshReviewQueue === "function") {
      refreshReviewQueue();
    } else if (
      body.classList.contains("review-details-page") &&
      typeof refreshReviewDetails === "function"
    ) {
      refreshReviewDetails();
    } else if (body.classList.contains("file-details-page") && typeof loadFileList === "function") {
      loadFileList();
    }
  } catch (error) {
    console.warn("Page refresh failed", error);
  }
  applyCurrentUserPageData();
}

function ensureStyles(styles) {
  styles.forEach((href) => {
    const resolvedHref = resolveMainAppUrl(href);
    const alreadyLoaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
      (link) => link.href === resolvedHref,
    );

    if (alreadyLoaded) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = resolvedHref;
    link.dataset.paperhubStyle = "true";
    document.head.appendChild(link);
  });
}

function applyCurrentUserPageData() {
  if (typeof getCurrentUserData !== "function") {
    return;
  }

  const user = getCurrentUserData();
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const dashboardRoute =
    typeof getDashboardRouteForUser === "function"
      ? getDashboardRouteForUser(user)
      : "/pages/dashboard/user.html";

  const applyText = (selector, value) => {
    if (value === undefined || value === null) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      if ("value" in element && ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) {
        element.value = String(value);
        return;
      }

      element.textContent = String(value);
    });
  };

  const applyCheckbox = (selector, value) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element instanceof HTMLInputElement) {
        element.checked = Boolean(value);
      }
    });
  };

  const applyRoleBadge = (selector, role) => {
    const normalizedRole = String(role || "user").toLowerCase();
    const roleStyles = {
      admin: ["bg-rose-50", "text-rose-700", "border-rose-200"],
      officer: ["bg-cyan-50", "text-cyan-700", "border-cyan-200"],
      user: ["bg-emerald-50", "text-emerald-700", "border-emerald-200"],
    };

    const classes = roleStyles[normalizedRole] || roleStyles.user;

    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = normalizedRole.toUpperCase();
      element.classList.remove(
        "bg-rose-50",
        "text-rose-700",
        "border-rose-200",
        "bg-cyan-50",
        "text-cyan-700",
        "border-cyan-200",
        "bg-emerald-50",
        "text-emerald-700",
        "border-emerald-200",
      );
      element.classList.add(...classes);
    });
  };

  const toTitleCase = (value) =>
    String(value || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (character) => character.toUpperCase());

  applyText("[data-user-name]", user.name);
  applyText("[data-user-email]", user.email);
  applyText("[data-user-role]", roleLabel);
  applyText("[data-user-title]", user.title);
  applyText("[data-user-department]", user.department);
  applyText("[data-user-last-login]", user.lastLogin);
  applyText("[data-user-company]", user.company);
  applyText("[data-user-phone]", user.phone);
  applyText("[data-user-address]", user.address);
  applyText("[data-user-timezone]", user.timezone);
  applyText("[data-user-language]", user.language);
  applyText("[data-user-bio]", user.bio);
  applyCheckbox("[data-user-twofactor]", user.twoFactorEnabled);
  applyText("[data-user-twofactor-label]", user.twoFactorEnabled ? "Enabled" : "Disabled");
  applyText("[data-user-account-status]", user.accountStatus || "Active");
  applyText("[data-user-joined-date]", user.joinedDate);
  applyText("[data-user-plan-name]", user.plan?.name);
  applyText("[data-user-plan-cycle]", user.plan?.cycle);
  applyText("[data-user-plan-renewal]", user.plan?.renewal);
  applyText("[data-user-plan-seats]", user.plan?.seats);
  applyText("[data-user-plan-status]", user.plan?.status);
  applyRoleBadge("[data-profile-role-badge]", user.role);
  applyText("[data-dashboard-description]", user.dashboard?.description);

  document.querySelectorAll("[data-user-dashboard-link]").forEach((element) => {
    if (element.tagName.toLowerCase() === "a") {
      element.setAttribute("href", dashboardRoute);
    }
  });

  const stats = user.dashboard?.stats || {};
  document.querySelectorAll("[data-dashboard-stat]").forEach((element) => {
    const key = element.getAttribute("data-dashboard-stat");
    if (key && Object.prototype.hasOwnProperty.call(stats, key)) {
      element.textContent = String(stats[key]);
    }
  });

  document.querySelectorAll("[data-user-dashboard-stats]").forEach((container) => {
    const entries = Object.entries(stats);
    const labelMap = {
      totalSubmissions: "Uploaded Files",
      totalUsers: "Total Users",
      documents: "Uploaded Files",
      pendingReview: "Pending Reviews",
      pendingReviews: "Pending Reviews",
      approved: "Approved Files",
      rejected: "Rejected Files",
      alerts: "Alerts",
    };

    container.innerHTML = entries
      .map(
        ([key, value]) => `
          <div class="profile-stat-card">
            <span class="profile-stat-label">${escapeHtml(labelMap[key] || toTitleCase(key))}</span>
            <strong>${escapeHtml(String(value))}</strong>
          </div>
        `,
      )
      .join("");
  });

  const files = (Array.isArray(user.files) ? user.files : []).filter((file) => !file.deletedAt);
  const approvedFiles = files.filter((file) => file.status === "completed").length;
  const rejectedFiles = files.filter((file) => file.status === "rejected").length;
  const pendingFiles =
    Number(user.dashboard?.stats?.pendingReview ?? user.dashboard?.stats?.pendingReviews ?? 0) ||
    (Array.isArray(user.reviews)
      ? user.reviews.filter(
          (review) => review.status === "pending" || review.status === "in-review",
        ).length
      : 0);

  applyText("[data-user-file-count]", files.length);
  applyText("[data-user-file-approved]", approvedFiles);
  applyText("[data-user-file-rejected]", rejectedFiles);
  applyText("[data-user-file-pending]", pendingFiles);

  document.querySelectorAll("[data-user-permissions]").forEach((container) => {
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    container.innerHTML = permissions
      .map(
        (permission) =>
          `<span class="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">${escapeHtml(permission)}</span>`,
      )
      .join(" ");
  });

  document.querySelectorAll("[data-user-connected-apps]").forEach((container) => {
    const apps = Array.isArray(user.connectedApps) ? user.connectedApps : [];

    container.innerHTML = apps
      .map(
        (app) => `
          <li>
            <div>
              <strong>${escapeHtml(app.name)}</strong>
              <div class="muted">${escapeHtml(app.provider || "Connected app")}</div>
            </div>
            <span class="badge badge-info">${escapeHtml(app.status || "Connected")}</span>
          </li>
        `,
      )
      .join("");
  });

  document.querySelectorAll("[data-user-files]").forEach((container) => {
    container.innerHTML = files
      .slice(0, 5)
      .map((file) => {
        const uploadedAt = file.uploadedAt
          ? new Date(file.uploadedAt).toLocaleDateString()
          : "Recently";
        const statusLabel = String(file.status || "pending");

        return `
          <li class="profile-file-row">
            <div>
              <strong>${escapeHtml(file.name)}</strong>
              <span>${escapeHtml(uploadedAt)} • ${escapeHtml(formatFileSize(file.size || 0))}</span>
            </div>
            <span class="badge badge-info">${escapeHtml(statusLabel)}</span>
          </li>
        `;
      })
      .join("");
  });

  document.querySelectorAll("[data-user-activity]").forEach((container) => {
    const items = Array.isArray(user.notifications) ? user.notifications.slice(0, 6) : [];

    container.innerHTML = items
      .map((item) => {
        const when = item.createdAt ? phTimeAgo(item.createdAt) : "";
        const ts = item.createdAt ? new Date(item.createdAt).toISOString() : "";
        const icon =
          item.category === "review"
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 20l9-5-9-11-9 11 9 5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : item.category === "billing"
              ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M21 10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
              : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.2"/></svg>';

        return `
          <li class="activity-item">
            <div class="activity-icon" aria-hidden="true">${icon}</div>
            <div class="activity-body">
              <div class="activity-head">
                <strong class="activity-title">${escapeHtml(item.title)}</strong>
                <time class="activity-time muted" datetime="${escapeHtml(ts)}">${escapeHtml(when)}</time>
              </div>
              <p class="activity-desc muted">${escapeHtml(item.description)}</p>
            </div>
          </li>
        `;
      })
      .join("");
  });

  if (typeof getCurrentUserPayment === "function") {
    const payment = getCurrentUserPayment();
    if (payment) {
      applyText("[data-payment-status]", payment.status);
      applyText("[data-payment-total-due]", payment.totalDue);
      applyText("[data-payment-last-updated]", payment.lastUpdated);
      applyText("[data-payment-next-review]", payment.nextReview);
    }
  }

  if (document.body.classList.contains("dashboard-shell")) {
    renderDashboard(user);
  }

  if (document.body.classList.contains("payment-page")) {
    renderPaymentPage(user);
  }
}

function phPill(label, variant) {
  return `<span class="accent-pill pill-${variant}">${escapeHtml(label)}</span>`;
}

function phStatusVariant(status) {
  const value = String(status || "").toLowerCase();
  if (["completed", "approved", "active", "settled"].includes(value)) return "emerald";
  if (["reviewing", "in-review", "pending", "pending approval", "revision"].includes(value))
    return "amber";
  if (["rejected", "failed", "overdue"].includes(value)) return "rose";
  return "slate";
}

function phPriorityVariant(priority) {
  const value = String(priority || "").toLowerCase();
  if (value === "high") return "rose";
  if (value === "medium") return "amber";
  return "slate";
}

function phRoleVariant(role) {
  const value = String(role || "").toLowerCase();
  if (value === "admin") return "rose";
  if (value === "officer") return "amber";
  return "sky";
}

function phRoleLabel(role) {
  const map = { admin: "Admin", officer: "Officer", user: "Student" };
  return map[String(role || "").toLowerCase()] || "User";
}

function phStatusLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "in-review") return "In Review";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function phTimeAgo(iso) {
  if (!iso) return "Recently";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Recently";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function phFileEmoji(name) {
  const ext = String(name || "")
    .split(".")
    .pop()
    .toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "doc" || ext === "docx") return "📝";
  if (ext === "xls" || ext === "xlsx") return "📊";
  if (["png", "jpg", "jpeg"].includes(ext)) return "🖼️";
  return "📎";
}

function phRenderInto(selector, html) {
  document.querySelectorAll(selector).forEach((node) => {
    node.innerHTML = html;
  });
}

function phSetText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = String(value);
  });
}

function renderDashboard(user) {
  const dataset = typeof getPaperHubDataset === "function" ? getPaperHubDataset() : {};
  const allFiles = Array.isArray(dataset.files) ? dataset.files : [];
  const allUsers = Array.isArray(dataset.users) ? dataset.users : [];
  const queue = Array.isArray(dataset.reviewQueue) ? dataset.reviewQueue : [];
  const role = normalizeRole(user.role);
  // Active (non-trashed) files only, matching the synced embedded stats.
  const userFiles = (Array.isArray(user.files) ? user.files : []).filter((f) => !f.deletedAt);

  const setStat = (key, value) => {
    document.querySelectorAll(`[data-dashboard-stat="${key}"]`).forEach((node) => {
      node.textContent = String(value);
    });
  };

  if (role === "admin") {
    setStat("totalUsers", allUsers.length);
    setStat("documents", allFiles.length);
    setStat("approved", allFiles.filter((file) => file.status === "completed").length);
    setStat(
      "alerts",
      allFiles.filter((file) => file.status === "pending" || file.status === "reviewing").length,
    );
    renderAdminDashboard(allUsers, allFiles, queue, dataset);
  } else if (role === "officer") {
    setStat(
      "pendingReviews",
      queue.filter((item) => item.status === "pending" || item.status === "in-review").length,
    );
    setStat("approved", queue.filter((item) => item.status === "completed").length);
    setStat("rejected", queue.filter((item) => item.status === "rejected").length);
    setStat("assignedStudents", new Set(queue.map((item) => item.submittedBy)).size);
    renderOfficerDashboard(queue);
  } else {
    setStat("totalSubmissions", userFiles.length);
    setStat(
      "pendingReview",
      userFiles.filter((file) => file.status === "reviewing" || file.status === "pending").length,
    );
    setStat("approved", userFiles.filter((file) => file.status === "completed").length);
    setStat("rejected", userFiles.filter((file) => file.status === "rejected").length);
    renderUserDashboard(user, userFiles);
  }
}

function renderAdminDashboard(allUsers, allFiles, queue, dataset) {
  const emptyRow = (cols, message) =>
    `<tr><td colspan="${cols}" class="muted">${escapeHtml(message)}</td></tr>`;

  const userRows = allUsers
    .map(
      (account) => `
        <tr>
          <td class="font-semibold">${escapeHtml(account.name)}</td>
          <td>${phPill(phRoleLabel(account.role), phRoleVariant(account.role))}</td>
          <td>${phPill(account.accountStatus || "Active", (account.accountStatus || "Active") === "Active" ? "emerald" : "rose")}</td>
          <td>${escapeHtml(formatDate(account.joinedDate))}</td>
          <td><button type="button" data-admin-edit data-user-id="${escapeHtml(account.id)}" class="font-semibold text-teal-700 hover:text-teal-800 transition-colors">Edit</button></td>
        </tr>`,
    )
    .join("");
  phRenderInto("[data-admin-users]", userRows || emptyRow(5, "No users found"));

  setupAdminUserManagement();

  const pendingRows = queue
    .filter((item) => item.status === "pending" || item.status === "in-review")
    .slice(0, 5)
    .map(
      (item) => `
        <tr>
          <td class="font-semibold">${escapeHtml(item.submittedBy)}</td>
          <td>${escapeHtml(item.reviewer)}</td>
          <td>${phPill(phStatusLabel(item.priority), phPriorityVariant(item.priority))}</td>
        </tr>`,
    )
    .join("");
  phRenderInto("[data-admin-pending]", pendingRows || emptyRow(3, "Queue is clear"));

  const palettes = [
    {
      border: "border-emerald-100",
      bg: "bg-emerald-50",
      head: "text-emerald-900",
      body: "text-emerald-700",
      foot: "text-emerald-600",
    },
    {
      border: "border-blue-100",
      bg: "bg-blue-50",
      head: "text-blue-900",
      body: "text-blue-700",
      foot: "text-blue-600",
    },
    {
      border: "border-sky-100",
      bg: "bg-sky-50",
      head: "text-sky-900",
      body: "text-sky-700",
      foot: "text-sky-600",
    },
  ];
  const activity = allFiles
    .slice()
    .sort(
      (left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime(),
    )
    .slice(0, 4)
    .map((file, index) => {
      const palette = palettes[index % palettes.length];
      return `
        <div class="rounded-lg border ${palette.border} ${palette.bg} p-3.5">
          <p class="font-semibold ${palette.head}">${phFileEmoji(file.name)} ${escapeHtml(file.fileType || "Document")} ${escapeHtml(phStatusLabel(file.status))}</p>
          <p class="${palette.body} mt-1.5">${escapeHtml(file.ownerName)} uploaded ${escapeHtml(file.name)}</p>
          <p class="text-xs ${palette.foot} mt-2 font-medium">${escapeHtml(phTimeAgo(file.uploadedAt))}</p>
        </div>`;
    })
    .join("");
  phRenderInto("[data-admin-activity]", activity || `<p class="muted">No recent activity</p>`);

  const infra = Array.isArray(dataset.infrastructure) ? dataset.infrastructure : [];
  const infraRows = infra
    .map((entry) => {
      const ok = entry.state === "ok";
      const wrap = ok ? "bg-emerald-50" : "bg-blue-50";
      const dot = ok ? "text-emerald-600" : "text-blue-600";
      return `
        <div class="flex items-center justify-between p-2 rounded-lg ${wrap}">
          <span class="text-slate-700">${escapeHtml(entry.label)}</span>
          <span class="font-semibold ${dot}">${ok ? "● " : ""}${escapeHtml(entry.value)}</span>
        </div>`;
    })
    .join("");
  phRenderInto("[data-admin-infrastructure]", infraRows);
}

function setupAdminUserManagement() {
  const modal = document.getElementById("adminUserModal");
  const addButton = document.getElementById("adminAddUserBtn");
  const form = document.getElementById("adminUserForm");
  if (!modal || !form || modal.dataset.bound === "true") {
    return;
  }
  modal.dataset.bound = "true";

  const titleEl = document.getElementById("adminUserModalTitle");
  const passwordField = modal.querySelector("[data-admin-password-field]");
  const statusField = modal.querySelector("[data-admin-status-field]");
  const field = (id) => document.getElementById(id);

  const openModal = (mode, account) => {
    const isEdit = mode === "edit";
    titleEl.textContent = isEdit ? "Edit User" : "Add User";
    field("adminUserId").value = account ? account.id : "";
    field("adminUserName").value = account ? account.name : "";
    field("adminUserEmail").value = account ? account.email : "";
    field("adminUserRole").value = account ? normalizeRole(account.role) : "user";
    field("adminUserTitle").value = account ? account.title || "" : "";
    field("adminUserStatus").value = account ? account.accountStatus || "Active" : "Active";
    if (passwordField) passwordField.hidden = isEdit;
    if (statusField) statusField.hidden = !isEdit;
    modal.classList.remove("hidden");
  };

  const closeModal = () => modal.classList.add("hidden");

  if (addButton) {
    addButton.addEventListener("click", () => openModal("add"));
  }

  // Admin Toolkit shortcuts.
  document.querySelectorAll("[data-admin-action]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-admin-action");
      if (action === "add-user") {
        openModal("add");
      } else if (action === "reports" || action === "analytics") {
        window.location.href = resolveAppPath("pages/review/review-queue.html");
      } else if (action === "security") {
        window.location.href = resolveAppPath("pages/account/settings.html");
      }
    });
  });

  modal.querySelectorAll("[data-admin-modal-close]").forEach((node) => {
    node.addEventListener("click", closeModal);
  });

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-admin-edit]");
    if (!editButton) return;
    const account = phFindUser(editButton.getAttribute("data-user-id"));
    if (account) openModal("edit", account);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = field("adminUserId").value;
    const name = field("adminUserName").value.trim();
    const email = field("adminUserEmail").value.trim().toLowerCase();
    const role = normalizeRole(field("adminUserRole").value);
    const title = field("adminUserTitle").value.trim() || phRoleLabel(role);

    if (!name || !email) {
      showError("Name and email are required");
      return;
    }

    if (id) {
      phUpdateUser(id, { name, email, role, title, accountStatus: field("adminUserStatus").value });
      showSuccess(`Updated ${name}`);
    } else {
      const dataset = getPaperHubDataset();
      const exists = (dataset.authAccounts || []).some(
        (entry) => String(entry.email).toLowerCase() === email,
      );
      if (exists) {
        showError("An account with this email already exists");
        return;
      }
      const newId = `${role}-${slugify(name)}-${Date.now().toString(36)}`;
      const account = {
        id: newId,
        name,
        email,
        password: field("adminUserPassword").value || "user01",
        role,
        title,
      };
      phAddUser(account, buildNewUserProfile(account));
      showSuccess(`Added ${name}`);
    }

    closeModal();
    applyCurrentUserPageData();
  });
}

function buildNewUserProfile(account) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    title: account.title,
    department: "General",
    lastLogin: "Just now",
    joinedDate: today,
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

function renderOfficerDashboard(queue) {
  const emptyRow = (cols, message) =>
    `<tr><td colspan="${cols}" class="muted">${escapeHtml(message)}</td></tr>`;

  const pendingRows = queue
    .filter((item) => item.status === "pending" || item.status === "in-review")
    .slice(0, 5)
    .map(
      (item) => `
        <tr>
          <td class="font-semibold">${escapeHtml(item.submittedBy)}</td>
          <td>${phFileEmoji(item.documentName)} ${escapeHtml(item.documentName)}</td>
          <td>${escapeHtml(formatDate(item.submittedDate))}</td>
          <td>${phPill(phStatusLabel(item.priority), phPriorityVariant(item.priority))}</td>
          <td><a href="../review/review-details.html?id=${encodeURIComponent(item.id)}" data-app-href="pages/review/review-details.html?id=${encodeURIComponent(item.id)}" class="font-semibold text-amber-700 hover:text-amber-800 transition-colors">Review →</a></td>
        </tr>`,
    )
    .join("");
  phRenderInto("[data-officer-pending]", pendingRows || emptyRow(5, "No pending submissions"));

  const activityRows = queue
    .filter((item) => item.status === "completed")
    .slice(0, 5)
    .map((item) => {
      const note =
        item.comments && item.comments.length
          ? item.comments[item.comments.length - 1].text
          : item.summary;
      return `
        <tr>
          <td class="font-semibold">${escapeHtml(item.submittedBy)}</td>
          <td>${phFileEmoji(item.documentName)} ${escapeHtml(item.documentName)}</td>
          <td>${phPill("Approved", "emerald")}</td>
          <td>${escapeHtml(formatDate(item.submittedDate))}</td>
          <td><span class="text-emerald-700 font-medium">${escapeHtml(note)}</span></td>
        </tr>`;
    })
    .join("");
  phRenderInto("[data-officer-activity]", activityRows || emptyRow(5, "No recent decisions"));

  const highPending = queue.filter(
    (item) =>
      item.priority === "high" && (item.status === "pending" || item.status === "in-review"),
  ).length;
  phSetText(
    "[data-officer-highlight]",
    `High-priority queue: ${highPending} file${highPending === 1 ? "" : "s"}`,
  );

  // Point the hero "Latest Review" link at a real review so it never lands on
  // the not-found state (the static markup carries no ?id=).
  const latest = queue[0];
  document.querySelectorAll("[data-officer-latest-review]").forEach((link) => {
    link.setAttribute(
      "href",
      latest
        ? `../review/review-details.html?id=${encodeURIComponent(latest.id)}`
        : "../review/review-queue.html",
    );
  });

  const next = officerNextReview();
  phSetText("[data-officer-next-label]", `Next: ${next ? next.documentName : "queue is clear"}`);
  setupOfficerShortcuts();
}

// The highest-priority item still awaiting a decision.
function officerNextReview() {
  const dataset = getPaperHubDataset();
  const queue = Array.isArray(dataset.reviewQueue) ? dataset.reviewQueue : [];
  const open = queue.filter((r) => r.status === "pending" || r.status === "in-review");
  const weight = (p) => (p === "high" ? 3 : p === "medium" ? 2 : 1);
  return open.sort((a, b) => weight(b.priority) - weight(a.priority))[0] || null;
}

function setupOfficerShortcuts() {
  document.querySelectorAll("[data-officer-action]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    button.addEventListener("click", () => {
      const next = officerNextReview();
      if (!next) {
        showInfo("The review queue is clear.");
        return;
      }
      const action = button.getAttribute("data-officer-action");

      if (action === "open" || action === "notes") {
        const href = resolveAppPath(
          `pages/review/review-details.html?id=${encodeURIComponent(next.id)}`,
        );
        window.location.href = href;
        return;
      }

      const decision = action === "approve" ? "completed" : "rejected";
      if (
        !window.confirm(
          `${action === "approve" ? "Approve" : "Request revision on"} "${next.documentName}"?`,
        )
      ) {
        return;
      }
      phSetReviewStatus(next.id, decision);
      showSuccess(
        `${next.documentName} ${action === "approve" ? "approved" : "sent back for revision"}`,
      );
    });
  });
}

function renderUserDashboard(user, userFiles) {
  const emptyRow = (cols, message) =>
    `<tr><td colspan="${cols}" class="muted">${escapeHtml(message)}</td></tr>`;

  const submissionRows = userFiles
    .slice()
    .sort(
      (left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime(),
    )
    .slice(0, 5)
    .map(
      (file) => `
        <tr>
          <td class="font-semibold">${phFileEmoji(file.name)} ${escapeHtml(file.name)}</td>
          <td>${escapeHtml(file.fileType || "Document")}</td>
          <td>${escapeHtml(formatDate(file.uploadedAt))}</td>
          <td>${phPill(phStatusLabel(file.status), phStatusVariant(file.status))}</td>
          <td><a href="../file/files.html" data-app-href="pages/file/files.html" class="text-sky-700 font-semibold hover:text-sky-800 transition-colors">Open →</a></td>
        </tr>`,
    )
    .join("");
  phRenderInto("[data-user-submissions]", submissionRows || emptyRow(5, "No submissions yet"));

  const total = userFiles.length;
  const completed = userFiles.filter((file) => file.status === "completed").length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  document.querySelectorAll("[data-user-health-fill]").forEach((node) => {
    node.style.width = `${percent}%`;
  });
  phSetText("[data-user-health-label]", `${percent}%`);

  const pending = userFiles.filter(
    (file) => file.status === "reviewing" || file.status === "pending",
  );
  const nextFile = pending[0];
  if (nextFile) {
    phSetText("[data-user-nextstep-title]", `Follow up on ${nextFile.name}`);
    phSetText(
      "[data-user-nextstep-note]",
      `You have ${pending.length} submission${pending.length === 1 ? "" : "s"} awaiting officer review.`,
    );
  } else {
    phSetText("[data-user-nextstep-title]", "You're all caught up");
    phSetText(
      "[data-user-nextstep-note]",
      "Every submission has been reviewed. Upload a new document any time.",
    );
  }
}

function renderPaymentPage(user) {
  const payment = user.payment || {};
  const files = Array.isArray(user.files) ? user.files : [];
  const notifications = Array.isArray(user.notifications) ? user.notifications : [];
  const reviews = Array.isArray(user.reviews) ? user.reviews : [];

  const applyText = (selector, value) => {
    if (value === undefined || value === null) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = String(value);
    });
  };

  const formatCurrency = (amount) => {
    const value = Number(amount || 0);
    return `BDT ${value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const deriveAmount = (file, index) => {
    const sizeBase = Math.max(250, Math.round((Number(file.size || 0) / 1024) * 0.6));
    return sizeBase + index * 75;
  };

  const invoiceItems = document.querySelector("[data-payment-invoice-items]");
  if (invoiceItems) {
    const items = files.slice(0, 4);
    invoiceItems.innerHTML = items.length
      ? items
          .map((file, index) => {
            const amount = deriveAmount(file, index);
            return `
              <div class="invoice-item">
                <span>${escapeHtml(file.name)}</span>
                <span>${escapeHtml(formatCurrency(amount))}</span>
              </div>
            `;
          })
          .join("")
      : `
        <div class="invoice-item">
          <span>No active invoices</span>
          <span>${escapeHtml(formatCurrency(0))}</span>
        </div>
      `;
  }

  const subtotal = files
    .slice(0, 4)
    .reduce((sum, file, index) => sum + deriveAmount(file, index), 0);
  const tax = Math.round(subtotal * 0.1);
  const total =
    payment.totalDue && typeof payment.totalDue === "string" && payment.totalDue.includes("BDT")
      ? payment.totalDue
      : formatCurrency(subtotal + tax);

  applyText("[data-payment-subtotal]", formatCurrency(subtotal));
  applyText("[data-payment-tax]", formatCurrency(tax));
  applyText("[data-payment-total-due]", total);
  applyText("[data-kpi-outstanding]", total);
  applyText(
    "[data-kpi-upcoming]",
    formatCurrency(
      reviews.filter((review) => review.status === "pending" || review.status === "in-review")
        .length * 250,
    ),
  );
  applyText("[data-kpi-paid]", formatCurrency(notifications.length * 325));
  applyText(
    "[data-payment-note]",
    user.role === "user"
      ? "Payments unlock automatically after document approval is complete."
      : "This account does not have an active payment lock.",
  );
  applyText(
    "[data-payment-approval-note]",
    user.role === "user"
      ? "Approval usually takes 1-2 business days."
      : "No approval delay applies to this account.",
  );
  applyText(
    "[data-payment-method-note]",
    user.role === "user"
      ? "Linked to the current Bangladesh student workspace."
      : "This account uses platform-level billing.",
  );

  const paymentMethods = document.querySelector("[data-payment-methods]");
  if (paymentMethods) {
    const planName = escapeHtml(user.plan?.name || "Plan");
    const planCycle = escapeHtml(user.plan?.cycle || "Billing cycle");
    const planStatus = escapeHtml(user.plan?.status || "Active");
    const primaryMethod = user.connectedApps?.[0]?.name || "Workspace billing";

    paymentMethods.innerHTML = `
      <div class="method-row">
        <div>
          <strong>${planName}</strong>
          <div class="muted small">${planCycle} • ${planStatus}</div>
        </div>
        <button class="btn btn-outline btn-sm" disabled>${escapeHtml(primaryMethod)}</button>
      </div>
    `;
  }

  const paymentHistory = document.querySelector("[data-payment-history]");
  if (paymentHistory) {
    const entries = reviews.slice(0, 3);
    paymentHistory.innerHTML = entries
      .map((review, index) => {
        const amount = formatCurrency(deriveAmount(files[index] || { size: 0 }, index));
        const statusLabel =
          review.status === "completed"
            ? "Completed"
            : review.status === "pending"
              ? "Pending"
              : "Processing";
        const historyDate = review.submittedDate
          ? new Date(review.submittedDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "Recent";

        return `
          <tr>
            <td>${escapeHtml(historyDate)}</td>
            <td>${escapeHtml(review.documentName)}</td>
            <td>${escapeHtml(amount)}</td>
            <td><span class="badge ${statusLabel === "Completed" ? "badge-success" : "badge-warning"}">${escapeHtml(statusLabel)}</span></td>
          </tr>
        `;
      })
      .join("");
  }

  if (paymentHistory && !paymentHistory.children.length) {
    paymentHistory.innerHTML = `
      <tr>
        <td colspan="4">No payment history available</td>
      </tr>
    `;
  }

  const versionFileName = document.querySelectorAll("[data-version-file-name]");
  versionFileName.forEach((element) => {
    element.textContent = files[0]?.name || "No file selected";
  });

  const confirmBtn = document.getElementById("confirmPaymentBtn");
  if (confirmBtn) {
    const isPayable = user.role === "user" && /pending/i.test(payment.status || "");
    confirmBtn.classList.toggle("hidden", !isPayable);
    if (confirmBtn.dataset.bound !== "true") {
      confirmBtn.dataset.bound = "true";
      confirmBtn.addEventListener("click", () => {
        if (typeof phSetPaymentStatus === "function") {
          phSetPaymentStatus(user.id, "Paid");
        }
        showSuccess("Payment confirmed");
        applyCurrentUserPageData();
      });
    }
  }
}

async function ensureScript({ globalKey, selector, src, datasetKey, errorMessage }) {
  if (typeof window[globalKey] === "function") {
    return;
  }

  if (!document.querySelector(selector)) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = resolveMainAppUrl(src);
      script.dataset[datasetKey] = "true";
      script.onload = resolve;
      script.onerror = () => {
        console.warn(errorMessage);
        resolve();
      };
      document.body.appendChild(script);
    });
  }
}

async function loadComponents() {
  const componentsToLoad = [
    { id: "navbar-container", file: "components/navbar.html" },
    { id: "sidebar-container", file: "components/sidebar.html" },
    { id: "footer-container", file: "components/footer.html" },
  ];

  const getComponentCache = () => {
    try {
      const cachedValue = sessionStorage.getItem(COMPONENT_CACHE_KEY);
      return cachedValue ? JSON.parse(cachedValue) : {};
    } catch (error) {
      console.warn("Unable to read component cache", error);
      return {};
    }
  };

  const setComponentCache = (cache) => {
    try {
      sessionStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn("Unable to persist component cache", error);
    }
  };

  const cache = getComponentCache();
  const containers = new Map(
    componentsToLoad.map((component) => [component.file, getElement("#" + component.id)]),
  );

  delete cache["components/navbar.html"];
  delete cache["components/sidebar.html"];

  componentsToLoad.forEach((component) => {
    const container = containers.get(component.file);
    if (container && cache[component.file]) {
      container.innerHTML = cache[component.file];
    }
  });

  const pendingComponents = componentsToLoad.filter((component) => {
    return !cache[component.file] && containers.get(component.file);
  });

  if (pendingComponents.length === 0) {
    return;
  }

  const fetchedComponents = await Promise.all(
    pendingComponents.map(async (component) => {
      const container = containers.get(component.file);

      try {
        const response = await fetch(resolveMainAppUrl(component.file), { cache: "no-cache" });
        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const html = await response.text();
        container.innerHTML = html;
        return [component.file, html];
      } catch (error) {
        console.error(`Error loading ${component.file}:`, error);
        return null;
      }
    }),
  );

  const nextCache = { ...cache };
  fetchedComponents.forEach((entry) => {
    if (entry) {
      const [file, html] = entry;
      nextCache[file] = html;
    }
  });

  if (Object.keys(nextCache).length > 0) {
    setComponentCache(nextCache);
  }
}

function initNavbar() {
  const tryInit = (attemptsLeft) => {
    try {
      if (typeof window.initPaperHubNavbar === "function") {
        const navbar = document.getElementById("paperhubNavbar");
        if (navbar) {
          window.initPaperHubNavbar();
          return true;
        }
      }
    } catch (err) {
      console.warn("initNavbar attempt failed:", err);
    }

    if (attemptsLeft > 0) {
      setTimeout(() => tryInit(attemptsLeft - 1), 120);
    }
    return false;
  };

  tryInit(5);
}

function initPageSpecificForms() {
  const registerSimpleForm = (formId, successMessage, options = {}) => {
    const form = getElement(`#${formId}`);
    if (!form) {
      return;
    }

    addEvent(form, "submit", (event) => {
      event.preventDefault();
      showSuccess(successMessage);

      if (options.resetAfterSubmit) {
        form.reset();
      }
    });
  };

  registerSimpleForm("contactForm", "Your message has been sent to support", {
    resetAfterSubmit: true,
  });
  registerSimpleForm("profileForm", "Profile updated successfully");

  const darkModeToggle = getElement("#settingsDarkMode");
  if (darkModeToggle) {
    darkModeToggle.checked = document.documentElement.classList.contains("dark");
    addEvent(darkModeToggle, "change", () => {
      const useDark = Boolean(darkModeToggle.checked);
      document.documentElement.classList.toggle("dark", useDark);

      try {
        localStorage.setItem("paperhub-theme", useDark ? "dark" : "light");
      } catch (error) {
        console.warn("Unable to persist theme preference", error);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initApp);
