(function () {
  const ACTIVE_CLASSES = ["is-active"];
  const SIDEBAR_STATE_STORAGE_KEY = "paperhub-sidebar-state";
  const SIDEBAR_COLLAPSED_BREAKPOINT = 768;
  const SIDEBAR_EXPANDED_BREAKPOINT = 1200;

  function resolveLink(path) {
    if (typeof resolveAppPath === "function") {
      return resolveAppPath(path);
    }

    const normalizedPath = String(path || "").replace(/^\/+/, "");
    return new URL(normalizedPath, window.location.href).href;
  }

  function applyAppLinks() {
    document.querySelectorAll("[data-app-href]").forEach((link) => {
      const path = link.dataset.appHref;
      if (!path) {
        return;
      }

      link.setAttribute("href", resolveLink(path));
    });
  }

  function applyRoleVisibility(role) {
    const roleElements = document.querySelectorAll("[data-roles]");

    roleElements.forEach((element) => {
      const roles = element.dataset.roles
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      const canView = roles.length === 0 || roles.includes(role);
      element.classList.toggle("hidden", !canView);
    });

    const roleBadge = document.querySelector("[data-role-badge]");
    if (roleBadge) {
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      roleBadge.textContent = roleLabel;
      roleBadge.className =
        "hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold sm:inline-flex transition-all duration-200";

      if (role === "admin") {
        roleBadge.classList.add("border-red-300", "bg-red-50", "text-red-700");
      } else if (role === "officer") {
        roleBadge.classList.add("border-purple-300", "bg-purple-50", "text-purple-700");
      } else {
        roleBadge.classList.add("text-slate-600");
      }
    }

    const mobileRoleBadge = document.querySelector("[data-role-badge-mobile]");
    if (mobileRoleBadge) {
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      mobileRoleBadge.textContent = roleLabel;
    }
  }

  function applyUserIdentity(user) {
    if (!user) {
      return;
    }

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = user.name;
    });

    document.querySelectorAll("[data-user-email]").forEach((element) => {
      element.textContent = user.email;
    });

    document.querySelectorAll("[data-user-title]").forEach((element) => {
      element.textContent = user.title;
    });

    document.querySelectorAll("[data-user-initials]").forEach((element) => {
      const initials = String(user.name || "U")
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
      element.textContent = initials || "U";
    });
  }

  function markActiveLink(navLinks) {
    const normalizedCurrentPath = window.location.pathname.replace(/\/index\.html$/i, "/");
    const homePath = new URL(resolveLink("index.html"), window.location.href).pathname.replace(
      /\/index\.html$/i,
      "/",
    );

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) {
        return;
      }

      const linkPath = new URL(href, window.location.href).pathname.replace(/\/index\.html$/i, "/");
      const isHome = linkPath === homePath;

      let isMatch = false;
      if (isHome) {
        isMatch = normalizedCurrentPath === homePath;
      } else {
        isMatch = normalizedCurrentPath.startsWith(linkPath);
      }

      link.removeAttribute("aria-current");
      ACTIVE_CLASSES.forEach((className) => link.classList.remove(className));

      if (isMatch) {
        link.setAttribute("aria-current", "page");
        ACTIVE_CLASSES.forEach((className) => link.classList.add(className));
      }
    });
  }

  function markActiveSidebarLink(sidebarLinks) {
    const normalizedCurrentPath = window.location.pathname.replace(/\/index\.html$/i, "/");

    sidebarLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) {
        return;
      }

      const linkPath = new URL(href, window.location.href).pathname.replace(/\/index\.html$/i, "/");
      const isMatch = normalizedCurrentPath.startsWith(linkPath);

      link.removeAttribute("aria-current");
      link.classList.remove("is-active");

      if (isMatch) {
        link.setAttribute("aria-current", "page");
        link.classList.add("is-active");
      }
    });
  }

  function setupUserSwitcher() {
    const switcherContainer = document.querySelector("[data-user-switcher-list]");
    if (!switcherContainer || typeof getAllMockUsers !== "function") {
      return;
    }

    const users = getAllMockUsers();
    const currentUser =
      typeof getCurrentUserData === "function" ? getCurrentUserData() : users[0] || null;

    if (!currentUser) {
      return;
    }

    switcherContainer.innerHTML = users
      .map((user) => {
        const roleLabel = user.role === "student" ? "Student" : String(user.role || "user");
        const checked = user.id === currentUser.id ? "checked" : "";
        return `
          <label
            class="flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
          >
            <input
              type="radio"
              name="paperhub-user"
              value="${escapeHtml(user.id)}"
              data-user-option
              class="w-4 h-4 cursor-pointer mt-0.5"
              ${checked}
            />
            <span>
              <span class="block text-sm font-medium text-slate-700">${escapeHtml(roleLabel)}</span>
            </span>
          </label>
        `;
      })
      .join("");

    switcherContainer.querySelectorAll("[data-user-option]").forEach((option) => {
      option.addEventListener("change", () => {
        if (!option.checked || typeof setCurrentUserById !== "function") {
          return;
        }

        const nextUser = setCurrentUserById(option.value);
        applyUserIdentity(nextUser);
        applyRoleVisibility(normalizeRole(nextUser.role));

        const nextRoute =
          typeof getDashboardRouteForUser === "function"
            ? getDashboardRouteForUser(nextUser)
            : resolveLink("pages/dashboard/user.html");
        window.location.assign(nextRoute);
      });
    });
  }

  function setupSignOut() {
    document.querySelectorAll("[data-sign-out]").forEach((button) => {
      button.addEventListener("click", () => {
        if (typeof logout === "function") {
          logout();
          return;
        }

        try {
          localStorage.removeItem("paperhub-user");
          localStorage.removeItem("paperhub-user-role");
        } catch (error) {
          console.warn("Unable to clear auth storage", error);
        }

        window.location.href = resolveLink("pages/auth/login.html");
      });
    });
  }

  function applyDynamicMeta() {
    const currentYear = String(new Date().getFullYear());
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = currentYear;
    });
  }

  function getStoredSidebarState() {
    try {
      const storedState = localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY);
      if (storedState === "expanded" || storedState === "collapsed") {
        return storedState;
      }
    } catch (error) {
      console.warn("Unable to read sidebar preference", error);
    }

    return null;
  }

  function setStoredSidebarState(state) {
    try {
      localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, state);
    } catch (error) {
      console.warn("Unable to persist sidebar preference", error);
    }
  }

  function getAutoSidebarState() {
    if (window.innerWidth >= SIDEBAR_EXPANDED_BREAKPOINT) {
      return "expanded";
    }

    if (window.innerWidth >= SIDEBAR_COLLAPSED_BREAKPOINT) {
      return "collapsed";
    }

    return "collapsed";
  }

  function applySidebarState(state, persist = false) {
    const isExpanded = state === "expanded";
    const body = document.body;
    const sidebar = document.getElementById("paperhubSidebar");
    const toggleButtons = Array.from(document.querySelectorAll("[data-sidebar-toggle]"));
    const toggleLabels = document.querySelectorAll("[data-sidebar-toggle-label]");
    const toggleIcons = document.querySelectorAll("[data-sidebar-toggle-icon]");

    body.classList.toggle("ph-sidebar-expanded", isExpanded);
    body.classList.toggle("ph-sidebar-collapsed", !isExpanded);
    body.dataset.sidebarState = state;

    if (sidebar) {
      sidebar.setAttribute("data-sidebar-state", state);
    }

    toggleButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(isExpanded));
      button.setAttribute("aria-label", isExpanded ? "Collapse sidebar" : "Expand sidebar");
    });

    toggleLabels.forEach((element) => {
      element.textContent = isExpanded ? "Collapse" : "Expand";
    });

    toggleIcons.forEach((element) => {
      element.textContent = isExpanded ? "⟨⟨" : "⟩⟩";
    });

    if (persist) {
      setStoredSidebarState(state);
    }
  }

  function setupSidebarToggle() {
    const toggleButtons = Array.from(document.querySelectorAll("[data-sidebar-toggle]"));
    if (toggleButtons.length === 0) {
      return;
    }

    let hasManualPreference = getStoredSidebarState() !== null;
    const applyCurrentSidebarState = () => {
      const storedState = getStoredSidebarState();
      const nextState = storedState || getAutoSidebarState();
      applySidebarState(nextState, false);
    };

    applyCurrentSidebarState();

    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const isExpanded = document.body.classList.contains("ph-sidebar-expanded");
        const nextState = isExpanded ? "collapsed" : "expanded";

        hasManualPreference = true;
        applySidebarState(nextState, true);
      });
    });

    if (!hasManualPreference) {
      window.addEventListener("resize", () => {
        if (getStoredSidebarState()) {
          return;
        }

        applyCurrentSidebarState();
      });
    }
  }

  function setupMobileMenu(navLinks) {
    const toggleButton = document.getElementById("navbarHamburger");
    const mobileMenu = document.getElementById("mobileMenu");

    if (!toggleButton || !mobileMenu) {
      return;
    }

    const closeMenu = () => {
      mobileMenu.classList.add("hidden");
      toggleButton.setAttribute("aria-expanded", "false");
    };

    toggleButton.addEventListener("click", () => {
      const isOpen = !mobileMenu.classList.contains("hidden");
      mobileMenu.classList.toggle("hidden", isOpen);
      toggleButton.setAttribute("aria-expanded", String(!isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  function setupUserDropdown() {
    const menuButton = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userDropdown");

    if (menuButton && menu) {
      const positionMenu = () => {
        const buttonRect = menuButton.getBoundingClientRect();
        const spacing = 8;
        const viewportPadding = 12;
        const menuWidth = menu.offsetWidth || 256;

        let left = buttonRect.right - menuWidth;
        left = Math.max(viewportPadding, left);

        const maxLeft = window.innerWidth - menuWidth - viewportPadding;
        left = Math.min(left, Math.max(viewportPadding, maxLeft));

        menu.style.position = "fixed";
        menu.style.top = `${buttonRect.bottom + spacing}px`;
        menu.style.left = `${left}px`;
        menu.style.right = "auto";
      };

      const closeMenu = () => {
        menu.classList.add("hidden");
        menuButton.setAttribute("aria-expanded", "false");
      };

      menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = !menu.classList.contains("hidden");

        if (isOpen) {
          closeMenu();
        } else {
          menu.classList.remove("hidden");
          menuButton.setAttribute("aria-expanded", "true");
          requestAnimationFrame(positionMenu);
        }
      });

      window.addEventListener("resize", () => {
        if (!menu.classList.contains("hidden")) {
          positionMenu();
        }
      });

      window.addEventListener("scroll", () => {
        if (!menu.classList.contains("hidden")) {
          positionMenu();
        }
      });

      document.addEventListener("click", (event) => {
        if (!menuButton.contains(event.target) && !menu.contains(event.target)) {
          closeMenu();
        }
      });
    }
  }

  function setupThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    const mobileThemeToggle = document.getElementById("mobileThemeToggle");
    const sharedThemeToggles = Array.from(document.querySelectorAll("[data-theme-toggle]"));
    const root = document.documentElement;

    const getStoredTheme = () => {
      try {
        return localStorage.getItem("paperhub-theme");
      } catch (error) {
        console.warn("Unable to read theme preference", error);
        return null;
      }
    };

    const setStoredTheme = (theme) => {
      try {
        localStorage.setItem("paperhub-theme", theme);
      } catch (error) {
        console.warn("Unable to persist theme preference", error);
      }
    };

    const syncThemeLabels = (isDark) => {
      const nextIcon = isDark ? "◑" : "◐";
      const nextLabel = isDark ? "Light Mode" : "Dark Mode";

      document.querySelectorAll("[data-theme-icon]").forEach((element) => {
        element.textContent = nextIcon;
      });

      document.querySelectorAll("[data-theme-label]").forEach((element) => {
        element.textContent = nextLabel;
      });
    };

    const applyTheme = (isDark, persist = false) => {
      root.classList.toggle("dark", isDark);
      themeToggle?.setAttribute("aria-pressed", String(isDark));
      mobileThemeToggle?.setAttribute("aria-pressed", String(isDark));
      sharedThemeToggles.forEach((toggle) => {
        toggle.setAttribute("aria-pressed", String(isDark));
      });
      syncThemeLabels(isDark);

      if (persist) {
        setStoredTheme(isDark ? "dark" : "light");
      }
    };

    const storedTheme = getStoredTheme();
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;

    applyTheme(shouldUseDark, false);

    if (!themeToggle && !mobileThemeToggle && sharedThemeToggles.length === 0) {
      return;
    }

    themeToggle?.addEventListener("click", () => {
      const isDark = !root.classList.contains("dark");
      applyTheme(isDark, true);
    });

    mobileThemeToggle?.addEventListener("click", () => {
      const isDark = !root.classList.contains("dark");
      applyTheme(isDark, true);
    });

    sharedThemeToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const isDark = !root.classList.contains("dark");
        applyTheme(isDark, true);
      });
    });

    if (!storedTheme && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", (event) => {
        applyTheme(event.matches, false);
      });
    }
  }

  function initPaperHubNavbar() {
    const navbar = document.getElementById("paperhubNavbar");
    if (!navbar) {
      return;
    }

    const user = typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
    const role = normalizeRole(user?.role || "student");
    const navLinks = document.querySelectorAll("[data-nav-link]");
    const sidebarLinks = document.querySelectorAll("[data-sidebar-link]");

    applyAppLinks();
    applyRoleVisibility(role);
    applyUserIdentity(user);
    markActiveLink(navLinks);
    markActiveSidebarLink(sidebarLinks);
    setupMobileMenu(navLinks);
    setupUserDropdown();
    setupThemeToggle();
    setupSidebarToggle();
    setupUserSwitcher();
    setupSignOut();
    applyDynamicMeta();
  }

  window.initPaperHubNavbar = initPaperHubNavbar;
})();
