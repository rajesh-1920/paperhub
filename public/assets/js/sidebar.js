/**
 * PaperHub Sidebar Module
 * Handles sidebar navigation, role-based visibility, collapse, and mobile responsiveness
 */
(function () {
<<<<<<< HEAD
  // Configuration Constants
  const CONFIG = {
    ROLE_STORAGE_KEY: "paperhub-role",
    COLLAPSE_STORAGE_KEY: "paperhub-sidebar-collapsed",
    MOBILE_BREAKPOINT: 768,
    DASHBOARD_ROUTES: {
      admin: "/pages/dashboard/admin.html",
      officer: "/pages/dashboard/officer.html",
      user: "/pages/dashboard/user.html",
    },
  };

  /**
   * Normalize role names for consistency
   * Handles legacy role names like "student" and "teacher"
   */
  function normalizeRole(role) {
    const normalized = String(role || "user").toLowerCase();
    const roleMap = { student: "user", teacher: "officer" };
    const mapped = roleMap[normalized];

    return mapped || (["admin", "officer", "user"].includes(normalized) ? normalized : "user");
=======
  const ROLE_STORAGE_KEY = "paperhub-role";
  const COLLAPSE_STORAGE_KEY = "paperhub-sidebar-collapsed";
  const ROLE_ROUTE = {
    admin: "/pages/dashboard/admin.html",
    officer: "/pages/dashboard/officer.html",
    user: "/pages/dashboard/user.html",
  };

  const ROLE_LABEL = {
    admin: "ADMIN",
    officer: "OFFICER",
    user: "USER",
  };

  const QUICK_ACTIONS = {
    user: [
      { label: "Upload", href: "/pages/file/upload.html" },
      { label: "Payments", href: "/pages/payment/payment.html" },
    ],
    officer: [
      { label: "Reviews", href: "/pages/review/review-queue.html" },
      { label: "Files", href: "/pages/file/file-details.html" },
    ],
    admin: [
      { label: "Users", href: "/pages/dashboard/admin.html#users" },
      { label: "Reports", href: "/pages/dashboard/admin.html#reports" },
    ],
  };

  const INSIGHT_CONFIG = {
    user: {
      title: "Keep your submissions moving",
      body: "Upload pending documents and review payment status in one flow.",
      buttonLabel: "Open Upload",
      buttonHref: "/pages/file/upload.html",
    },
    officer: {
      title: "Review queue is waiting",
      body: "Prioritize high-impact documents and complete approvals faster.",
      buttonLabel: "Open Reviews",
      buttonHref: "/pages/review/review-queue.html",
    },
    admin: {
      title: "System insights ready",
      body: "Monitor user activity, approval trends, and policy compliance.",
      buttonLabel: "Open Reports",
      buttonHref: "/pages/dashboard/admin.html#reports",
    },
  };

  const MENU_CONFIG = {
    user: {
      workspace: [
        {
          label: "Dashboard",
          href: ROLE_ROUTE.user,
          icon: `
            <path d="M3 10l9-7 9 7"></path>
            <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10"></path>
            <path d="M9 21v-6h6v6"></path>
          `,
        },
        {
          label: "Upload",
          href: "/pages/file/upload.html",
          icon: `
            <path d="M12 16V4"></path>
            <path d="M7 9l5-5 5 5"></path>
            <path d="M5 20h14"></path>
          `,
        },
        {
          label: "Files",
          href: "/pages/file/file-details.html",
          icon: `
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <path d="M14 2v6h6"></path>
          `,
        },
        {
          label: "Payments",
          href: "/pages/payment/payment.html",
          icon: `
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <path d="M2 10h20"></path>
          `,
        },
      ],
      admin: [],
    },
    officer: {
      workspace: [
        {
          label: "Dashboard",
          href: ROLE_ROUTE.officer,
          icon: `
            <path d="M3 10l9-7 9 7"></path>
            <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10"></path>
            <path d="M9 21v-6h6v6"></path>
          `,
        },
        {
          label: "Files",
          href: "/pages/file/file-details.html",
          icon: `
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <path d="M14 2v6h6"></path>
          `,
        },
        {
          label: "Reviews",
          href: "/pages/review/review-queue.html",
          icon: `
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12A9 9 0 1112 3"></path>
          `,
        },
      ],
      admin: [],
    },
    admin: {
      workspace: [
        {
          label: "Dashboard",
          href: ROLE_ROUTE.admin,
          icon: `
            <path d="M3 10l9-7 9 7"></path>
            <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10"></path>
            <path d="M9 21v-6h6v6"></path>
          `,
        },
        {
          label: "Files",
          href: "/pages/file/file-details.html",
          icon: `
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <path d="M14 2v6h6"></path>
          `,
        },
      ],
      admin: [
        {
          label: "Users",
          href: "/pages/dashboard/admin.html#users",
          icon: `
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <path d="M20 8v6"></path>
            <path d="M23 11h-6"></path>
          `,
        },
        {
          label: "Reports",
          href: "/pages/dashboard/admin.html#reports",
          icon: `
            <path d="M3 3v18h18"></path>
            <path d="M7 14l4-4 3 3 5-6"></path>
          `,
        },
        {
          label: "Settings",
          href: "/pages/account/settings.html",
          icon: `
            <circle cx="12" cy="12" r="3"></circle>
            <path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 .6 1.65 1.65 0 00-.4 1V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-.4-1 1.65 1.65 0 00-1-.6 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-.6-1 1.65 1.65 0 00-1-.4H3a2 2 0 010-4h.09a1.65 1.65 0 001-.4 1.65 1.65 0 00.6-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6c.3-.23.69-.39 1-.6V4a2 2 0 014 0v.09c0 .38.14.74.4 1 .31.21.7.37 1 .6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82c.23.3.39.69.6 1 .26.31.62.45 1 .4H21a2 2 0 010 4h-.09c-.38 0-.74.14-1 .4-.21.31-.37.7-.6 1z"
            ></path>
          `,
        },
      ],
    },
  };

  const LINK_CLASS =
    "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-slate-600 transition duration-200 hover:-translate-y-[1px] hover:border-cyan-300/70 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 dark:text-slate-300 dark:hover:border-cyan-300/35 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100 dark:focus:ring-cyan-300/35";
  const ACTIVE_CLASS = [
    "border-cyan-300/70",
    "bg-gradient-to-r",
    "from-cyan-100",
    "to-blue-100/80",
    "text-cyan-800",
    "ring-1",
    "ring-cyan-300/80",
    "dark:border-cyan-300/45",
    "dark:from-cyan-400/18",
    "dark:to-blue-400/16",
    "dark:text-cyan-100",
    "dark:ring-cyan-300/35",
  ];

  function normalizeRole(role) {
    const value = String(role || "user").toLowerCase();
    if (value === "student") return "user";
    if (value === "teacher") return "officer";
    if (value === "admin" || value === "officer" || value === "user") {
      return value;
    }
    return "user";
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
  }

  /**
   * Get current user role from options or localStorage
   */
  function getCurrentRole(explicitRole) {
    if (explicitRole) return normalizeRole(explicitRole);

    if (typeof getCurrentUserData === "function") {
      return normalizeRole(getCurrentUserData()?.role);
    }

    try {
      return normalizeRole(localStorage.getItem(CONFIG.ROLE_STORAGE_KEY));
    } catch (error) {
      console.warn("Unable to read sidebar role", error);
      return "user";
    }
  }

<<<<<<< HEAD
  /**
   * Check if element's role restriction matches user's role
   */
  function matchesRole(roles, role) {
    if (!roles) return true;

    const allowedRoles = roles
      .split(",")
      .map((item) => normalizeRole(item.trim()))
      .filter(Boolean);

    return allowedRoles.length === 0 || allowedRoles.includes(role);
  }

  /**
   * Apply role-based visibility to sidebar items
   */
  function applyRoleVisibility(role) {
    // Hide/show sidebar links based on role
    document.querySelectorAll("[data-sidebar-roles]").forEach((element) => {
      const visible = matchesRole(element.getAttribute("data-sidebar-roles"), role);
      element.classList.toggle("hidden", !visible);
    });

    // Hide/show section dividers based on role
    document.querySelectorAll("[data-sidebar-divider-roles]").forEach((element) => {
      const visible = matchesRole(element.getAttribute("data-sidebar-divider-roles"), role);
      element.classList.toggle("hidden", !visible);
    });

    // Update dashboard link to role-specific dashboard
    const dashboardLink = document.querySelector("[data-dashboard-link]");
    if (dashboardLink) {
      const href = CONFIG.DASHBOARD_ROUTES[role] || CONFIG.DASHBOARD_ROUTES.user;
      dashboardLink.setAttribute("href", href);
    }
=======
  function escapeHtmlValue(value) {
    return escapeHtml(String(value ?? ""));
  }

  function dashboardRouteForRole(role) {
    return ROLE_ROUTE[normalizeRole(role)] || ROLE_ROUTE.user;
  }

  function getMenuConfig(role) {
    return MENU_CONFIG[normalizeRole(role)] || MENU_CONFIG.user;
  }

  function iconWrapper(svgPath) {
    return `
      <svg class="h-5 w-5 shrink-0 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
        ${svgPath}
      </svg>
    `;
  }

  function buildLink(item, currentPath, currentHash) {
    const url = new URL(item.href, window.location.origin);
    const isHashLink = Boolean(url.hash);
    const samePath = normalizePath(url.pathname) === currentPath;
    const sameHash = !isHashLink || url.hash === currentHash;
    const isActive = samePath && sameHash;

    return `
      <a
        href="${escapeHtmlValue(item.href)}"
        data-sidebar-link
        class="${LINK_CLASS}${isActive ? ` ${ACTIVE_CLASS.join(" ")}` : ""}"
        ${isActive ? 'aria-current="page"' : ""}
      >
        ${iconWrapper(item.icon)}
        <span class="truncate" data-sidebar-label>${escapeHtmlValue(item.label)}</span>
      </a>
    `;
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
  }

  /**
   * Normalize URL path for comparison
   */
  function normalizePath(path) {
    const normalized = String(path || "")
      .replace(/[?#].*$/, "")
      .replace(/index\.html$/, "")
      .replace(/\/+$/, "");

    return normalized || "/";
  }

<<<<<<< HEAD
  /**
   * Highlight active link based on current page
   */
  function applyActiveLink() {
=======
  function renderMenu(sidebar, role) {
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
    const currentPath = normalizePath(window.location.pathname);
    const currentHash = window.location.hash || "";
    const config = getMenuConfig(role);

    const workspaceMenu = sidebar.querySelector("#sidebarWorkspaceMenu");
    const adminSection = sidebar.querySelector("#sidebarAdminSection");
    const adminMenu = sidebar.querySelector("#sidebarAdminMenu");

<<<<<<< HEAD
      // Remove active styles
      link.classList.remove("bg-cyan-50", "text-cyan-800", "ring-1", "ring-cyan-200");

      // Apply active styles if match
      if (isMatch) {
        link.classList.add("bg-cyan-50", "text-cyan-800", "ring-1", "ring-cyan-200");
=======
    if (workspaceMenu) {
      workspaceMenu.innerHTML = config.workspace
        .map((item) => buildLink(item, currentPath, currentHash))
        .join("");
    }

    if (adminSection && adminMenu) {
      adminMenu.innerHTML = config.admin
        .map((item) => buildLink(item, currentPath, currentHash))
        .join("");
      adminSection.classList.toggle("hidden", config.admin.length === 0);
    }

    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          closeMobileSidebar(sidebar);
        }
      });
    });
  }

  function renderQuickActions(sidebar, role) {
    const quickActions = sidebar.querySelector("#sidebarQuickActions");
    const actions = QUICK_ACTIONS[role] || QUICK_ACTIONS.user;

    if (!quickActions) {
      return;
    }

    quickActions.innerHTML = actions
      .map(
        (action) => `
          <a
            href="${escapeHtmlValue(action.href)}"
            class="inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 dark:border-cyan-400/20 dark:bg-[#0d1f39]/80 dark:text-slate-100 dark:hover:border-cyan-300/45 dark:hover:bg-cyan-400/12 dark:hover:text-cyan-100"
          >
            ${escapeHtmlValue(action.label)}
          </a>
        `,
      )
      .join("");
  }

  function renderInsights(sidebar, role) {
    const card = sidebar.querySelector("#sidebarInsightCard");
    const title = sidebar.querySelector("#sidebarInsightTitle");
    const body = sidebar.querySelector("#sidebarInsightBody");
    const button = sidebar.querySelector("#sidebarInsightButton");
    const buttonText = sidebar.querySelector("#sidebarInsightButtonText");
    const config = INSIGHT_CONFIG[role] || INSIGHT_CONFIG.user;

    if (!card || !title || !body || !button || !buttonText) {
      return;
    }

    title.textContent = config.title;
    body.textContent = config.body;
    buttonText.textContent = config.buttonLabel;
    button.setAttribute("href", config.buttonHref);
  }

  function applyUserSummary(role) {
    const user = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
    const nameElement = document.querySelector("[data-sidebar-user-name]");
    const roleElement = document.querySelector("[data-sidebar-user-role]");
    const dashboardLink = document.querySelector("[data-dashboard-link]");

    if (nameElement && user) {
      nameElement.textContent = user.name;
    }

    if (roleElement) {
      roleElement.textContent = ROLE_LABEL[role] || ROLE_LABEL.user;

      roleElement.classList.remove(
        "border-cyan-300/30",
        "bg-cyan-500/10",
        "text-cyan-100",
        "border-cyan-300/60",
        "text-cyan-700",
        "border-amber-300/30",
        "bg-amber-500/10",
        "text-amber-100",
        "border-amber-300/60",
        "bg-amber-50",
        "text-amber-700",
        "border-violet-300/30",
        "bg-violet-500/10",
        "text-violet-100",
        "border-violet-300/60",
        "bg-violet-50",
        "text-violet-700",
      );

      if (role === "admin") {
        roleElement.classList.add(
          "border-amber-300/60",
          "bg-amber-50",
          "text-amber-700",
          "dark:border-amber-300/30",
          "dark:bg-amber-500/10",
          "dark:text-amber-100",
        );
      } else if (role === "officer") {
        roleElement.classList.add(
          "border-violet-300/60",
          "bg-violet-50",
          "text-violet-700",
          "dark:border-violet-300/30",
          "dark:bg-violet-500/10",
          "dark:text-violet-100",
        );
      } else {
        roleElement.classList.add(
          "border-cyan-300/60",
          "bg-cyan-50",
          "text-cyan-700",
          "dark:border-cyan-300/30",
          "dark:bg-cyan-500/10",
          "dark:text-cyan-100",
        );
      }
    }

    if (dashboardLink) {
      dashboardLink.setAttribute("href", dashboardRouteForRole(role));
    }
  }

  function applyActiveLink(sidebar) {
    const currentPath = normalizePath(window.location.pathname);
    const currentHash = window.location.hash || "";

    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const url = new URL(href, window.location.origin);
      const isHashLink = Boolean(url.hash);
      const samePath = normalizePath(url.pathname) === currentPath;
      const sameHash = !isHashLink || url.hash === currentHash;
      const isActive = samePath && sameHash;

      link.classList.remove(...ACTIVE_CLASS);
      if (isActive) {
        link.classList.add(...ACTIVE_CLASS);
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

<<<<<<< HEAD
  /**
   * Open mobile sidebar with animation
   */
  function openMobileSidebar(sidebar, overlay) {
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("translate-x-0");
    overlay.classList.remove("hidden");
  }

  /**
   * Close mobile sidebar with animation
   */
  function closeMobileSidebar(sidebar, overlay) {
    sidebar.classList.remove("translate-x-0");
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }

  /**
   * Toggle sidebar collapse state (desktop)
   */
  function setCollapsed(sidebar, isCollapsed, shouldPersist) {
=======
  function setCollapsed(sidebar, isCollapsed, persist = false) {
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
    const collapseButton = document.getElementById("sidebarCollapseBtn");
    const labels = sidebar.querySelectorAll(
      "[data-sidebar-label], [data-sidebar-section-title], [data-sidebar-brand], [data-sidebar-user-card]",
    );
    const extras = sidebar.querySelectorAll("[data-sidebar-extra]");

    // Update sidebar width classes
    sidebar.classList.toggle("md:w-20", isCollapsed);
    sidebar.classList.toggle("md:w-72", !isCollapsed);

    // Center icons when collapsed
    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      link.classList.toggle("md:justify-center", isCollapsed);
      link.classList.toggle("md:px-2", isCollapsed);
    });

<<<<<<< HEAD
    // Hide labels when collapsed
    labels.forEach((label) => {
      label.classList.toggle("md:hidden", isCollapsed);
=======
    labels.forEach((element) => {
      element.classList.toggle("md:hidden", isCollapsed);
    });

    extras.forEach((element) => {
      element.classList.toggle("md:hidden", isCollapsed);
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
    });

    document.body.classList.toggle("sidebar-collapsed", isCollapsed);
    document.body.classList.toggle("sidebar-expanded", !isCollapsed);

    // Update collapse button state
    if (collapseButton) {
      collapseButton.setAttribute("aria-expanded", String(!isCollapsed));
      collapseButton.setAttribute(
        "aria-label",
        isCollapsed ? "Expand sidebar" : "Collapse sidebar",
      );
      collapseButton.classList.toggle("rotate-180", isCollapsed);
    }

    // Persist state if requested
    if (shouldPersist) {
      try {
        localStorage.setItem(CONFIG.COLLAPSE_STORAGE_KEY, String(isCollapsed));
      } catch (error) {
        console.warn("Unable to persist sidebar state", error);
      }
    }
  }

  /**
   * Retrieve persisted collapse state from localStorage
   */
  function getPersistedCollapseState() {
    try {
      return localStorage.getItem(CONFIG.COLLAPSE_STORAGE_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

<<<<<<< HEAD
  /**
   * Handle sidebar responsiveness on viewport change
   */
  function syncSidebarForViewport(sidebar, overlay, close) {
    if (window.innerWidth >= CONFIG.MOBILE_BREAKPOINT) {
=======
  function openMobileSidebar(sidebar, overlay) {
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("translate-x-0");
    overlay.classList.remove("hidden");
  }

  function closeMobileSidebar(sidebar, overlay = document.getElementById("sidebarOverlay")) {
    if (!sidebar || !overlay) {
      return;
    }

    sidebar.classList.remove("translate-x-0");
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }

  function syncViewportState(sidebar, overlay) {
    if (window.innerWidth >= 768) {
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
      overlay.classList.add("hidden");
      sidebar.classList.remove("-translate-x-full");
      sidebar.classList.add("translate-x-0");
    } else {
<<<<<<< HEAD
      close();
    }
  }

  /**
   * Initialize sidebar and attach event listeners
   */
=======
      closeMobileSidebar(sidebar, overlay);
    }
  }

>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
  function initPaperHubSidebar(options) {
    const sidebar = document.getElementById("paperhubSidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar || !overlay) return;

    // Apply role-based visibility
    const role = getCurrentRole(options?.user?.role || options?.role);
    renderMenu(sidebar, role);
    renderQuickActions(sidebar, role);
    renderInsights(sidebar, role);
    applyUserSummary(role);
    applyActiveLink(sidebar);

    // Get DOM elements
    const externalToggle = document.getElementById("sidebarToggle");
    const fallbackToggle = document.getElementById("sidebarMobileToggle");
    const closeButton = document.getElementById("sidebarClose");
    const collapseButton = document.getElementById("sidebarCollapseBtn");

    // Define event handlers
    const open = () => openMobileSidebar(sidebar, overlay);
    const close = () => closeMobileSidebar(sidebar, overlay);
<<<<<<< HEAD
    const syncForViewport = () => syncSidebarForViewport(sidebar, overlay, close);
=======
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e

    // Hide fallback toggle if external toggle exists
    if (externalToggle && fallbackToggle) {
      fallbackToggle.classList.add("hidden");
    }

    // Attach toggle listeners
    externalToggle?.addEventListener("click", open);
    fallbackToggle?.addEventListener("click", open);
    closeButton?.addEventListener("click", close);
    overlay.addEventListener("click", close);

    // Attach collapse button listener (desktop)
    collapseButton?.addEventListener("click", () => {
      const shouldCollapse = !sidebar.classList.contains("md:w-20");
      setCollapsed(sidebar, shouldCollapse, true);
    });

<<<<<<< HEAD
    // Close mobile sidebar when link is clicked
    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < CONFIG.MOBILE_BREAKPOINT) {
          close();
        }
      });
    });

    // Close on Escape key (mobile)
=======
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && window.innerWidth < CONFIG.MOBILE_BREAKPOINT) {
        close();
      }
    });

<<<<<<< HEAD
    // Handle viewport changes
    window.addEventListener("resize", syncForViewport);
=======
    window.addEventListener("resize", () => syncViewportState(sidebar, overlay));
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e

    // Initialize desktop collapse state
    if (window.innerWidth >= CONFIG.MOBILE_BREAKPOINT) {
      setCollapsed(sidebar, getPersistedCollapseState(), false);
    }

<<<<<<< HEAD
    // Initial sync
    syncForViewport();
=======
    syncViewportState(sidebar, overlay);
>>>>>>> def8f75a745ed0103b4f4a83df3cab52ae750e1e
  }

  // Export initialization function
  window.initPaperHubSidebar = initPaperHubSidebar;
})();
