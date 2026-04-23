/**
 * PaperHub Sidebar Module
 * Handles sidebar navigation, role-based visibility, collapse, and mobile responsiveness
 */
(function () {
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
  }

  /**
   * Get current user role from options or localStorage
   */
  function getCurrentRole(explicitRole) {
    if (explicitRole) return normalizeRole(explicitRole);

    try {
      return normalizeRole(localStorage.getItem(CONFIG.ROLE_STORAGE_KEY));
    } catch (error) {
      console.warn("Unable to read sidebar role", error);
      return "user";
    }
  }

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

  /**
   * Highlight active link based on current page
   */
  function applyActiveLink() {
    const currentPath = normalizePath(window.location.pathname);

    document.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      const href = normalizePath(link.getAttribute("href"));
      const isMatch = href !== "/" && (currentPath === href || currentPath.startsWith(href + "/"));

      // Remove active styles
      link.classList.remove("bg-cyan-50", "text-cyan-800", "ring-1", "ring-cyan-200");

      // Apply active styles if match
      if (isMatch) {
        link.classList.add("bg-cyan-50", "text-cyan-800", "ring-1", "ring-cyan-200");
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

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
    const collapseButton = document.getElementById("sidebarCollapseBtn");
    const labels = sidebar.querySelectorAll(
      "[data-sidebar-label], [data-sidebar-section-title], [data-sidebar-brand]",
    );

    // Update sidebar width classes
    sidebar.classList.toggle("md:w-20", isCollapsed);
    sidebar.classList.toggle("md:w-72", !isCollapsed);

    // Center icons when collapsed
    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      link.classList.toggle("md:justify-center", isCollapsed);
    });

    // Hide labels when collapsed
    labels.forEach((label) => {
      label.classList.toggle("md:hidden", isCollapsed);
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

  /**
   * Handle sidebar responsiveness on viewport change
   */
  function syncSidebarForViewport(sidebar, overlay, close) {
    if (window.innerWidth >= CONFIG.MOBILE_BREAKPOINT) {
      overlay.classList.add("hidden");
      sidebar.classList.remove("-translate-x-full");
      sidebar.classList.add("translate-x-0");
    } else {
      close();
    }
  }

  /**
   * Initialize sidebar and attach event listeners
   */
  function initPaperHubSidebar(options) {
    const sidebar = document.getElementById("paperhubSidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar || !overlay) return;

    // Apply role-based visibility
    const role = getCurrentRole(options?.user?.role || options?.role);
    applyRoleVisibility(role);
    applyActiveLink();

    // Get DOM elements
    const externalToggle = document.getElementById("sidebarToggle");
    const fallbackToggle = document.getElementById("sidebarMobileToggle");
    const closeButton = document.getElementById("sidebarClose");
    const collapseButton = document.getElementById("sidebarCollapseBtn");

    // Define event handlers
    const open = () => openMobileSidebar(sidebar, overlay);
    const close = () => closeMobileSidebar(sidebar, overlay);
    const syncForViewport = () => syncSidebarForViewport(sidebar, overlay, close);

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

    // Close mobile sidebar when link is clicked
    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < CONFIG.MOBILE_BREAKPOINT) {
          close();
        }
      });
    });

    // Close on Escape key (mobile)
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && window.innerWidth < CONFIG.MOBILE_BREAKPOINT) {
        close();
      }
    });

    // Handle viewport changes
    window.addEventListener("resize", syncForViewport);

    // Initialize desktop collapse state
    if (window.innerWidth >= CONFIG.MOBILE_BREAKPOINT) {
      setCollapsed(sidebar, getPersistedCollapseState(), false);
    }

    // Initial sync
    syncForViewport();
  }

  // Export initialization function
  window.initPaperHubSidebar = initPaperHubSidebar;
})();
