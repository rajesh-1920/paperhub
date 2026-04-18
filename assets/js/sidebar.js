(function () {
  const ROLE_STORAGE_KEY = "paperhub-role";
  const COLLAPSE_STORAGE_KEY = "paperhub-sidebar-collapsed";
  const VALID_ROLES = ["admin", "officer", "user", "student", "teacher"];

  function normalizeRole(role) {
    const value = String(role || "user").toLowerCase();
    if (value === "student") return "user";
    if (value === "teacher") return "officer";
    return VALID_ROLES.includes(value) ? value : "user";
  }

  function getCurrentRole(explicitRole) {
    if (explicitRole) {
      return normalizeRole(explicitRole);
    }

    try {
      return normalizeRole(localStorage.getItem(ROLE_STORAGE_KEY));
    } catch (error) {
      console.warn("Unable to read sidebar role", error);
      return "user";
    }
  }

  function matchesRole(roles, role) {
    if (!roles) return true;

    const allowed = roles
      .split(",")
      .map((item) => normalizeRole(item.trim()))
      .filter(Boolean);

    return allowed.length === 0 || allowed.includes(role);
  }

  function applyRoleVisibility(role) {
    document.querySelectorAll("[data-sidebar-roles]").forEach((element) => {
      const visible = matchesRole(element.getAttribute("data-sidebar-roles"), role);
      element.classList.toggle("hidden", !visible);
      if (visible && element.tagName === "A") {
        element.classList.add("flex");
      }
    });

    document.querySelectorAll("[data-sidebar-divider-roles]").forEach((element) => {
      const visible = matchesRole(element.getAttribute("data-sidebar-divider-roles"), role);
      element.classList.toggle("hidden", !visible);
    });

    const dashboardLink = document.querySelector("[data-dashboard-link]");
    if (dashboardLink) {
      const roleDashboards = {
        admin: "/pages/dashboard/admin.html",
        officer: "/pages/dashboard/officer.html",
        user: "/pages/dashboard/user.html",
      };
      dashboardLink.setAttribute("href", roleDashboards[role] || roleDashboards.user);
    }
  }

  function normalizePath(path) {
    const value = String(path || "")
      .replace(/index\.html$/, "")
      .replace(/\/+$/, "");

    return value || "/";
  }

  function applyActiveLink() {
    const currentPath = normalizePath(window.location.pathname);

    document.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      const href = normalizePath(link.getAttribute("href"));
      const isMatch = href !== "/" && (currentPath === href || currentPath.startsWith(href + "/"));

      link.classList.remove(
        "bg-cyan-50",
        "text-cyan-800",
        "ring-1",
        "ring-cyan-200",
        "dark:bg-cyan-500/20",
        "dark:text-cyan-200",
        "dark:ring-cyan-500/40",
      );

      if (isMatch) {
        link.classList.add(
          "bg-cyan-50",
          "text-cyan-800",
          "ring-1",
          "ring-cyan-200",
          "dark:bg-cyan-500/20",
          "dark:text-cyan-200",
          "dark:ring-cyan-500/40",
        );
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function openMobileSidebar(sidebar, overlay) {
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("translate-x-0");
    overlay.classList.remove("hidden");
  }

  function closeMobileSidebar(sidebar, overlay) {
    sidebar.classList.remove("translate-x-0");
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }

  function setCollapsed(sidebar, isCollapsed, persist) {
    const collapseButton = document.getElementById("sidebarCollapseBtn");
    const labels = sidebar.querySelectorAll(
      "[data-sidebar-label], [data-sidebar-section-title], [data-sidebar-brand]",
    );

    sidebar.classList.toggle("md:w-20", isCollapsed);
    sidebar.classList.toggle("md:w-72", !isCollapsed);

    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      link.classList.toggle("md:justify-center", isCollapsed);
    });

    labels.forEach((label) => {
      label.classList.toggle("md:hidden", isCollapsed);
    });

    if (collapseButton) {
      collapseButton.setAttribute("aria-expanded", String(!isCollapsed));
      collapseButton.setAttribute(
        "aria-label",
        isCollapsed ? "Expand sidebar" : "Collapse sidebar",
      );
      collapseButton.classList.toggle("rotate-180", isCollapsed);
    }

    if (persist) {
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, String(isCollapsed));
      } catch (error) {
        console.warn("Unable to persist sidebar state", error);
      }
    }
  }

  function getPersistedCollapseState() {
    try {
      return localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function addKeyboardClick(button, handler) {
    if (!button) return;

    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler();
      }
    });
  }

  function initPaperHubSidebar(options) {
    const sidebar = document.getElementById("paperhubSidebar");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar || !overlay) {
      return;
    }

    const role = getCurrentRole(options?.user?.role || options?.role);
    applyRoleVisibility(role);
    applyActiveLink();

    const externalToggle = document.getElementById("sidebarToggle");
    const fallbackToggle = document.getElementById("sidebarMobileToggle");
    const closeButton = document.getElementById("sidebarClose");
    const collapseButton = document.getElementById("sidebarCollapseBtn");

    const open = () => openMobileSidebar(sidebar, overlay);
    const close = () => closeMobileSidebar(sidebar, overlay);

    if (externalToggle && fallbackToggle) {
      fallbackToggle.classList.add("hidden");
    }

    externalToggle?.addEventListener("click", open);
    fallbackToggle?.addEventListener("click", open);
    closeButton?.addEventListener("click", close);
    overlay.addEventListener("click", close);

    addKeyboardClick(externalToggle, open);
    addKeyboardClick(fallbackToggle, open);
    addKeyboardClick(closeButton, close);
    addKeyboardClick(collapseButton, () => {
      const nextState = !sidebar.classList.contains("md:w-20");
      setCollapsed(sidebar, nextState, true);
    });

    collapseButton?.addEventListener("click", () => {
      const nextState = !sidebar.classList.contains("md:w-20");
      setCollapsed(sidebar, nextState, true);
    });

    sidebar.querySelectorAll("[data-sidebar-link]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          close();
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && window.innerWidth < 768) {
        close();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) {
        overlay.classList.add("hidden");
        sidebar.classList.remove("-translate-x-full");
        sidebar.classList.add("translate-x-0");
      } else {
        sidebar.classList.remove("translate-x-0");
        sidebar.classList.add("-translate-x-full");
      }
    });

    if (window.innerWidth >= 768) {
      sidebar.classList.remove("-translate-x-full");
      sidebar.classList.add("translate-x-0");
      setCollapsed(sidebar, getPersistedCollapseState(), false);
    } else {
      close();
    }
  }

  window.initPaperHubSidebar = initPaperHubSidebar;
})();
