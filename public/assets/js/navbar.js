(function () {
  const ACTIVE_CLASSES = ["text-cyan-700", "bg-cyan-50", "dark:text-cyan-400", "dark:bg-slate-800"];

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
      } else if (role === "teacher") {
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
  }

  function markActiveLink(navLinks) {
    const currentPath = window.location.pathname;

    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const isHome = href === "/";
      const isMatch = isHome
        ? currentPath === "/" || currentPath.endsWith("index.html")
        : currentPath.includes(href);

      link.removeAttribute("aria-current");
      ACTIVE_CLASSES.forEach((className) => link.classList.remove(className));

      if (isMatch) {
        link.setAttribute("aria-current", "page");
        ACTIVE_CLASSES.forEach((className) => link.classList.add(className));
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
            : "/pages/dashboard/user.html";
        window.location.assign(nextRoute);
      });
    });
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

    const applyTheme = (isDark, persist = false) => {
      root.classList.toggle("dark", isDark);
      themeToggle?.setAttribute("aria-pressed", String(isDark));
      mobileThemeToggle?.setAttribute("aria-pressed", String(isDark));

      if (persist) {
        setStoredTheme(isDark ? "dark" : "light");
      }
    };

    const storedTheme = getStoredTheme();
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;

    applyTheme(shouldUseDark, false);

    if (!themeToggle && !mobileThemeToggle) {
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

    applyRoleVisibility(role);
    applyUserIdentity(user);
    markActiveLink(navLinks);
    setupMobileMenu(navLinks);
    setupUserDropdown();
    setupThemeToggle();
    setupUserSwitcher();
  }

  window.initPaperHubNavbar = initPaperHubNavbar;
})();
